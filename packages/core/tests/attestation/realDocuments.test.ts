import { describe, expect, it } from 'bun:test';

import { AWS_NITRO_ROOT_FINGERPRINT } from '../../src/attestation/constants.ts';
import { verifyNitroAttestation } from '../../src/attestation/index.ts';
import { verifyAttestationWithRoot } from '../../src/attestation/verifyAttestation.ts';
import { TEST_NONCE, TEST_PCR0, verifyTestDocument } from './buildDocument.ts';

import type { VerifyAttestationInput } from '../../src/attestation/types.ts';
import type { Bytes } from '../../src/types.ts';

async function readFixture(name: string): Promise<Bytes> {
  return new Uint8Array(await Bun.file(new URL(`./${name}`, import.meta.url)).arrayBuffer());
}

function flipLastByte(bytes: Bytes): Bytes {
  const copy = new Uint8Array(bytes);
  copy[copy.length - 1] = (copy.at(-1) ?? 0) ^ 0xff;
  return copy;
}

function verifyAWSDocument(input: VerifyAttestationInput) {
  return verifyAttestationWithRoot(input, AWS_NITRO_ROOT_FINGERPRINT);
}

const debugDocument = await readFixture('nitroDebugDocument.bin');
const productionDocuments = [
  'anjunaProduction2021.bin',
  'anjunaProductionWithPublicKey2021.bin',
  'anjunaProduction2023.bin'
];

describe('verifying real AWS Nitro attestation documents', () => {
  it('accepts the AWS chain and signature, then refuses the document for its missing nonce', async () => {
    const result = await verifyAWSDocument({
      document: debugDocument,
      nonce: TEST_NONCE,
      expectedPCR0s: [TEST_PCR0]
    });
    expect(result).toEqual({ ok: false, error: 'nonce_mismatch' });
  });

  for (const name of productionDocuments) {
    it(`passes the chain and signature of ${name} and stops at its missing nonce`, async () => {
      const document = await readFixture(name);
      const input = { document, nonce: TEST_NONCE, expectedPCR0s: [TEST_PCR0] };
      expect(await verifyAWSDocument(input)).toEqual({ ok: false, error: 'nonce_mismatch' });
    });
  }

  it('passes every document check of a debug enclave with a nonce, then refuses debug mode', async () => {
    const result = await verifyAWSDocument({
      document: await readFixture('anjunaDebugWithNonce2024.bin'),
      nonce: new TextEncoder().encode('Nonce\n'),
      expectedPCR0s: ['0'.repeat(96)]
    });
    expect(result).toEqual({ ok: false, error: 'debug_mode_enclave' });
  });

  it('refuses the document when one byte of its signature changes', async () => {
    const result = await verifyAWSDocument({
      document: flipLastByte(debugDocument),
      nonce: TEST_NONCE,
      expectedPCR0s: [TEST_PCR0]
    });
    expect(result).toEqual({ ok: false, error: 'invalid_signature' });
  });

  it('refuses the document when another root is trusted instead of AWS', async () => {
    const result = await verifyTestDocument(debugDocument);
    expect(result).toEqual({ ok: false, error: 'untrusted_certificate_chain' });
  });

  it('requires an expected PCR16 from callers of the public function', async () => {
    const input = { document: debugDocument, nonce: TEST_NONCE, expectedPCR0s: [TEST_PCR0] };
    await expect(verifyNitroAttestation({ ...input, expectedPCR16s: [] })).rejects.toThrow(
      'expectedPCR16s must list at least one PCR'
    );
    const result = await verifyNitroAttestation({ ...input, expectedPCR16s: [TEST_PCR0] });
    expect(result).toEqual({ ok: false, error: 'nonce_mismatch' });
  });
});
