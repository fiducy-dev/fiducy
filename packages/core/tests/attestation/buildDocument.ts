import { decodeBase64 } from '../../src/attestation/bytes.ts';
import { hashSHA256, joinBytes } from '../../src/attestation/bytes.ts';
import { TEST_INTERMEDIATE_CERTIFICATE, TEST_LEAF_CERTIFICATE } from './certificates.ts';
import { TEST_LEAF_PRIVATE_KEY, TEST_ROOT_CERTIFICATE } from './certificates.ts';

import type { CborValue } from '../../src/attestation/types.ts';
import type { Bytes } from '../../src/types.ts';
import type { TestDocumentOptions } from './types.ts';

export const TEST_PCR0 = 'ab'.repeat(48);
export const TEST_NONCE = new TextEncoder().encode('nonce-7f3a9c2e41b8d605');
export const TEST_ROOT_FINGERPRINT = await hashSHA256(decodeBase64(TEST_ROOT_CERTIFICATE));

function encodeHeader(majorType: number, length: number): Bytes {
  if (length < 24) return new Uint8Array([(majorType << 5) | length]);
  if (length < 0x100) return new Uint8Array([(majorType << 5) | 24, length]);
  if (length < 0x10000) return new Uint8Array([(majorType << 5) | 25, length >> 8, length & 0xff]);
  const header = new Uint8Array(9);
  header[0] = (majorType << 5) | 27;
  new DataView(header.buffer).setBigUint64(1, BigInt(length));
  return header;
}

export function encodeCbor(value: CborValue): Bytes {
  if (value === null) return new Uint8Array([0xf6]);
  if (typeof value === 'number') {
    return value >= 0 ? encodeHeader(0, value) : encodeHeader(1, -1 - value);
  }
  if (typeof value === 'string') {
    const text = new TextEncoder().encode(value);
    return joinBytes([encodeHeader(3, text.length), text]);
  }
  if (value instanceof Uint8Array) return joinBytes([encodeHeader(2, value.length), value]);
  if (Array.isArray(value))
    return joinBytes([encodeHeader(4, value.length), ...value.map(encodeCbor)]);
  if (value instanceof Map) {
    const entries = [...value].flatMap(([key, item]) => [encodeCbor(key), encodeCbor(item)]);
    return joinBytes([encodeHeader(5, value.size), ...entries]);
  }
  if (typeof value === 'boolean') return new Uint8Array([value ? 0xf5 : 0xf4]);
  return joinBytes([encodeHeader(6, value.tag), encodeCbor(value.value)]);
}

function createPCRs(pcr0: string): Map<number, Bytes> {
  const pcrs = new Map<number, Bytes>();
  for (let index = 0; index < 24; index += 1) pcrs.set(index, new Uint8Array(48).fill(index + 1));
  pcrs.set(
    0,
    Uint8Array.from(pcr0.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  );
  return pcrs;
}

export function buildPayload(options: TestDocumentOptions = {}): Map<string, CborValue> {
  return new Map<string, CborValue>([
    ['module_id', 'i-0fiducy7test-enc019'],
    ['digest', 'SHA384'],
    ['timestamp', options.timestamp ?? Date.now()],
    ['pcrs', options.pcrs ?? createPCRs(options.pcr0 ?? TEST_PCR0)],
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

export async function buildDocument(options: TestDocumentOptions = {}): Promise<Bytes> {
  const protectedHeader = encodeCbor(new Map([[1, options.algorithm ?? -35]]));
  const payload = encodeCbor(options.payload ?? buildPayload(options));
  const structure = encodeCbor(['Signature1', protectedHeader, new Uint8Array(0), payload]);
  const signature = await signStructure(structure, options.privateKey ?? TEST_LEAF_PRIVATE_KEY);
  return encodeCbor({ tag: 18, value: [protectedHeader, new Map(), payload, signature] });
}
