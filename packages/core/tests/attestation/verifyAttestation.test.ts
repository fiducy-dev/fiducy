import { describe, expect, it } from 'bun:test';

import { verifyNitroAttestation } from '../../src/attestation/index.ts';
import { verifyAttestationWithRoot } from '../../src/attestation/verifyAttestation.ts';
import { TEST_NONCE, TEST_PCR0, TEST_ROOT_FINGERPRINT } from './buildDocument.ts';
import { buildDocument, buildPayload, encodeCbor } from './buildDocument.ts';
import { replaceBytes } from './buildDocument.ts';
import { TEST_INTERMEDIATE_CERTIFICATE, TEST_LEAF_CERTIFICATE } from './certificates.ts';
import { TEST_NON_AUTHORITY_CERTIFICATE, TEST_NON_AUTHORITY_PRIVATE_KEY } from './certificates.ts';
import { TEST_ROOT_CERTIFICATE } from './certificates.ts';

import type { Bytes } from '../../src/types.ts';

const realDocument = new Uint8Array(
  await Bun.file(new URL('./nitroDebugDocument.bin', import.meta.url)).arrayBuffer()
);

function verifyTestDocument(document: Bytes, expectedPCR0s = [TEST_PCR0], nonce = TEST_NONCE) {
  return verifyAttestationWithRoot({ document, nonce, expectedPCR0s }, TEST_ROOT_FINGERPRINT);
}

function flipLastByte(bytes: Bytes): Bytes {
  const copy = new Uint8Array(bytes);
  copy[copy.length - 1] = (copy.at(-1) ?? 0) ^ 0xff;
  return copy;
}

describe('verifying a real AWS Nitro attestation document', () => {
  it('accepts the AWS chain and signature, then refuses the document for its missing nonce', async () => {
    const result = await verifyNitroAttestation({
      document: realDocument,
      nonce: TEST_NONCE,
      expectedPCR0s: ['0'.repeat(96)]
    });
    expect(result).toEqual({ ok: false, error: 'nonce_mismatch' });
  });

  it('refuses the document when one byte of its signature changes', async () => {
    const result = await verifyNitroAttestation({
      document: flipLastByte(realDocument),
      nonce: TEST_NONCE,
      expectedPCR0s: [TEST_PCR0]
    });
    expect(result).toEqual({ ok: false, error: 'invalid_signature' });
  });

  it('refuses the document when another root is trusted instead of AWS', async () => {
    const result = await verifyTestDocument(realDocument);
    expect(result).toEqual({ ok: false, error: 'untrusted_certificate_chain' });
  });
});

describe('verifying an attestation document', () => {
  it('returns the PCR0 and module of a document from the expected enclave', async () => {
    const result = await verifyTestDocument(await buildDocument());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pcr0).toBe(TEST_PCR0);
    expect(result.value.moduleID).toBe('i-0fiducy7test-enc019');
  });

  it('accepts any PCR0 from a rollover list, ignoring case and spaces', async () => {
    const expected = ['cd'.repeat(48), ` ${TEST_PCR0.toUpperCase()} `];
    expect((await verifyTestDocument(await buildDocument(), expected)).ok).toBe(true);
  });

  it('refuses an enclave built from a different image', async () => {
    const document = await buildDocument({ pcr0: 'ef'.repeat(48) });
    expect(await verifyTestDocument(document)).toEqual({ ok: false, error: 'unexpected_pcr0' });
  });

  it('refuses a debug-mode enclave even when zeros are listed as expected', async () => {
    const document = await buildDocument({ pcr0: '00'.repeat(48) });
    const result = await verifyTestDocument(document, ['00'.repeat(48)]);
    expect(result).toEqual({ ok: false, error: 'debug_mode_enclave' });
  });

  it('refuses a document whose PCR1 is all zeros', async () => {
    const pcrs = new Map([0, 1, 2].map((index) => [index, new Uint8Array(48).fill(index * 7)]));
    const result = await verifyTestDocument(await buildDocument({ pcrs }));
    expect(result).toEqual({ ok: false, error: 'debug_mode_enclave' });
  });

  it('refuses a replayed document that carries another nonce or none', async () => {
    const replayed = await buildDocument({ nonce: new TextEncoder().encode('an-older-nonce') });
    const withoutNonce = await buildDocument({ nonce: null });
    expect(await verifyTestDocument(replayed)).toEqual({ ok: false, error: 'nonce_mismatch' });
    expect(await verifyTestDocument(withoutNonce)).toEqual({ ok: false, error: 'nonce_mismatch' });
  });
});

describe('checking the deployment config in PCR16', () => {
  const pcr16 = '11'.repeat(48);
  const verifyWithPCR16 = (expectedPCR16s: string[]) =>
    buildDocument().then((document) =>
      verifyAttestationWithRoot(
        { document, nonce: TEST_NONCE, expectedPCR0s: [TEST_PCR0], expectedPCR16s },
        TEST_ROOT_FINGERPRINT
      )
    );

  it('accepts the genuine image running the expected deployment config', async () => {
    const result = await verifyWithPCR16([pcr16]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.pcr16).toBe(pcr16);
  });

  it('refuses the genuine image running another deployment config', async () => {
    const result = await verifyWithPCR16(['22'.repeat(48)]);
    expect(result).toEqual({ ok: false, error: 'unexpected_pcr16' });
  });

  it('does not check PCR16 when no value is expected', async () => {
    expect((await verifyWithPCR16([])).ok).toBe(true);
  });
});

describe('checking who signed the document', () => {
  it('refuses a document signed with a key other than the leaf certificate', async () => {
    const document = await buildDocument({ privateKey: TEST_NON_AUTHORITY_PRIVATE_KEY });
    expect(await verifyTestDocument(document)).toEqual({ ok: false, error: 'invalid_signature' });
  });

  it('refuses a payload changed after signing', async () => {
    const timestamp = Date.now();
    const signed = await buildDocument({ timestamp });
    const original = encodeCbor(buildPayload({ timestamp }));
    const forged = encodeCbor(buildPayload({ timestamp, pcr0: 'ef'.repeat(48) }));
    const tampered = replaceBytes(signed, original, forged);
    const result = await verifyTestDocument(tampered, ['ef'.repeat(48)]);
    expect(result).toEqual({ ok: false, error: 'invalid_signature' });
  });

  it('refuses a document signed with an algorithm other than ES384', async () => {
    const document = await buildDocument({ algorithm: -7 });
    const result = await verifyTestDocument(document);
    expect(result).toEqual({ ok: false, error: 'unsupported_algorithm' });
  });

  it('refuses a chain that does not start at the trusted root', async () => {
    const document = await buildDocument({ bundle: [TEST_INTERMEDIATE_CERTIFICATE] });
    const result = await verifyTestDocument(document);
    expect(result).toEqual({ ok: false, error: 'untrusted_certificate_chain' });
  });

  it('refuses a leaf issued by a certificate that is not a certificate authority', async () => {
    const document = await buildDocument({
      bundle: [TEST_ROOT_CERTIFICATE, TEST_INTERMEDIATE_CERTIFICATE, TEST_LEAF_CERTIFICATE],
      leafCertificate: TEST_NON_AUTHORITY_CERTIFICATE,
      privateKey: TEST_NON_AUTHORITY_PRIVATE_KEY
    });
    const result = await verifyTestDocument(document);
    expect(result).toEqual({ ok: false, error: 'untrusted_certificate_chain' });
  });

  it('refuses a document timestamped outside the certificates validity', async () => {
    const document = await buildDocument({ timestamp: Date.UTC(2001, 0, 1) });
    const result = await verifyTestDocument(document);
    expect(result).toEqual({ ok: false, error: 'certificate_not_valid_at_timestamp' });
  });
});

describe('reading malformed input', () => {
  it('refuses garbage, truncated documents and trailing bytes', async () => {
    const document = await buildDocument();
    const inputs = [
      new Uint8Array([1, 2, 3]),
      document.slice(0, 200),
      new Uint8Array([...document, 0])
    ];
    for (const input of inputs) {
      expect(await verifyTestDocument(input)).toEqual({ ok: false, error: 'malformed_document' });
    }
  });

  it('refuses indefinite lengths and duplicate map keys', async () => {
    const indefinite = new Uint8Array([0x9f, 0x40, 0xa0, 0x40, 0x40, 0xff]);
    const duplicateKeys = new Uint8Array([0xa2, 0x01, 0x01, 0x01, 0x02]);
    for (const input of [indefinite, duplicateKeys]) {
      expect(await verifyTestDocument(input)).toEqual({ ok: false, error: 'malformed_document' });
    }
  });

  it('refuses documents larger than any real attestation', async () => {
    const result = await verifyTestDocument(new Uint8Array(20000));
    expect(result).toEqual({ ok: false, error: 'malformed_document' });
  });
});
