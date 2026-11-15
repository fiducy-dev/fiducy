import { describe, expect, it } from 'bun:test';

import { AWS_NITRO_ROOT_FINGERPRINT } from '../../src/attestation/constants.ts';
import { verifyNitroAttestation } from '../../src/attestation/index.ts';
import { verifyAttestationWithRoot } from '../../src/attestation/verifyAttestation.ts';
import { TEST_NONCE, TEST_PCR0, verifyTestDocument } from './buildDocument.ts';

import type {
  AttestationError,
  VerifyAttestationInput,
  VerifyNitroAttestationInput
} from '../../src/attestation/types.ts';
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
const gatewayDocument = await readFixture('fiducyGateway2026.bin');
const gatewayInput = {
  document: gatewayDocument,
  nonce: new TextEncoder().encode('fiducy-real-enclave-fixture'),
  expectedPCR0s: [
    '275cc09eea98203ff6730bf32106d8ce77078a6d0af94ca8ce7bcfb4f579fedce27d75ae51284cae243cfe3c2c810cb0'
  ],
  expectedPCR16s: [
    'c76028c6aedb6d803403c033ef2336276bd27e0e8661ec4523393859df03428fbcc4024690ed3f295c82e0fee2c80cb9'
  ]
};
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

describe('verifying a document from a real Fiducy gateway enclave', () => {
  it('accepts it with its nonce, image and config', async () => {
    const result = await verifyNitroAttestation(gatewayInput);
    expect(result).toMatchObject({
      ok: true,
      value: {
        pcr0: gatewayInput.expectedPCR0s[0],
        pcr16: gatewayInput.expectedPCR16s[0],
        moduleID: 'i-094d000a2bb95c3f0-enc01a1dd93ae43d1a8',
        timestamp: new Date('2026-11-15T05:02:31.351Z')
      }
    });
  });

  it('is signed over an indefinite-length map, which AWS also issues', () => {
    const payloadStart = gatewayDocument.indexOf(0xbf);
    expect(Array.from(gatewayDocument.slice(payloadStart - 3, payloadStart + 1))).toEqual([
      0x59, 0x11, 0x4d, 0xbf
    ]);
  });

  it('refuses it for another nonce, image or config', async () => {
    const otherPCR = 'ab'.repeat(48);
    const changes: [Partial<VerifyNitroAttestationInput>, AttestationError][] = [
      [{ nonce: TEST_NONCE }, 'nonce_mismatch'],
      [{ expectedPCR0s: [otherPCR] }, 'unexpected_pcr0'],
      [{ expectedPCR16s: [otherPCR] }, 'unexpected_pcr16']
    ];
    for (const [change, error] of changes) {
      const result = await verifyNitroAttestation({ ...gatewayInput, ...change });
      expect(result).toEqual({ ok: false, error });
    }
  });

  it('refuses it when one byte of its signature changes', async () => {
    const result = await verifyNitroAttestation({
      ...gatewayInput,
      document: flipLastByte(gatewayDocument)
    });
    expect(result).toEqual({ ok: false, error: 'invalid_signature' });
  });
});
