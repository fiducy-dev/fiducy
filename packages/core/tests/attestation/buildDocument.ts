import { hashSHA256 } from '../../src/attestation/bytes.ts';
import { encodeCBOR } from '../../src/attestation/encodeCBOR.ts';
import { verifyAttestationWithRoot } from '../../src/attestation/verifyAttestation.ts';
import { TEST_INTERMEDIATE_CERTIFICATE, TEST_LEAF_CERTIFICATE } from './certificates.ts';
import { TEST_LEAF_PRIVATE_KEY, TEST_ROOT_CERTIFICATE } from './certificates.ts';

import type { CBORValue, VerifyAttestationInput } from '../../src/attestation/types.ts';
import type { Bytes } from '../../src/types.ts';
import type { TestDocumentOptions } from './types.ts';

export const TEST_PCR0 = 'ab'.repeat(48);
export const TEST_NONCE = new TextEncoder().encode('nonce-7f3a9c2e41b8d605');

export function decodeBase64(text: string): Bytes {
  return Uint8Array.from(atob(text), (character) => character.charCodeAt(0));
}

export const TEST_ROOT_FINGERPRINT = await hashSHA256(decodeBase64(TEST_ROOT_CERTIFICATE));

export function createTestPCRs(pcr0 = TEST_PCR0): Map<number, Bytes> {
  const pcrs = new Map<number, Bytes>();
  for (let index = 0; index < 24; index += 1) pcrs.set(index, new Uint8Array(48).fill(index + 1));
  pcrs.set(
    0,
    Uint8Array.from(pcr0.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  );
  return pcrs;
}

export function buildPayload(options: TestDocumentOptions = {}): Map<string, CBORValue> {
  return new Map<string, CBORValue>([
    ['module_id', 'i-0fiducy7test-enc019'],
    ['digest', 'SHA384'],
    ['timestamp', options.timestamp ?? Date.now()],
    ['pcrs', options.pcrs ?? createTestPCRs(options.pcr0)],
    ['certificate', decodeBase64(options.leafCertificate ?? TEST_LEAF_CERTIFICATE)],
    [
      'cabundle',
      (options.bundle ?? [TEST_ROOT_CERTIFICATE, TEST_INTERMEDIATE_CERTIFICATE]).map(decodeBase64)
    ],
    ['public_key', null],
    ['user_data', null],
    ['nonce', options.nonce === undefined ? TEST_NONCE : options.nonce]
  ]);
}

async function signStructure(structure: Bytes, privateKey: string): Promise<Bytes> {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    decodeBase64(privateKey),
    { name: 'ECDSA', namedCurve: 'P-384' },
    false,
    ['sign']
  );
  const parameters = { name: 'ECDSA', hash: 'SHA-384' };
  return new Uint8Array(await crypto.subtle.sign(parameters, key, structure));
}

export function replaceBytes(source: Bytes, search: Bytes, replacement: Bytes): Bytes {
  const text = Buffer.from(source).toString('hex');
  const position = text.indexOf(Buffer.from(search).toString('hex')) / 2;
  if (position < 0 || search.length !== replacement.length) throw new Error('Cannot replace bytes');
  const replaced = new Uint8Array(source);
  replaced.set(replacement, position);
  return replaced;
}

export async function signPayload(
  payload: Bytes,
  options: TestDocumentOptions = {}
): Promise<Bytes> {
  const protectedHeader = encodeCBOR(new Map([[1, options.algorithm ?? -35]]));
  const structure = encodeCBOR(['Signature1', protectedHeader, new Uint8Array(0), payload]);
  const signature = await signStructure(structure, options.privateKey ?? TEST_LEAF_PRIVATE_KEY);
  return encodeCBOR({ tag: 18, value: [protectedHeader, new Map(), payload, signature] });
}

export async function buildDocument(options: TestDocumentOptions = {}): Promise<Bytes> {
  return signPayload(encodeCBOR(options.payload ?? buildPayload(options)), options);
}

export function verifyTestDocument(
  document: Bytes,
  overrides: Partial<VerifyAttestationInput> = {}
) {
  const input = { document, nonce: TEST_NONCE, expectedPCR0s: [TEST_PCR0], ...overrides };
  return verifyAttestationWithRoot(input, TEST_ROOT_FINGERPRINT);
}
