import { describe, expect, it } from 'bun:test';

import { decodeCBOR } from '../../src/attestation/cbor.ts';
import { encodeCBOR } from '../../src/attestation/index.ts';

import type { CBORKey, CBORValue } from '../../src/attestation/types.ts';

const toHex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');

describe('encoding CBOR', () => {
  it('encodes integers in the shortest form, including 64-bit timestamps', () => {
    expect(toHex(encodeCBOR(23))).toBe('17');
    expect(toHex(encodeCBOR(24))).toBe('1818');
    expect(toHex(encodeCBOR(-35))).toBe('3822');
    expect(toHex(encodeCBOR(65536))).toBe('1a00010000');
    expect(toHex(encodeCBOR(1_700_000_000_000))).toBe('1b0000018bcfe56800');
  });

  it('round-trips the values an attestation holds through the strict decoder', () => {
    const value = new Map<CBORKey, CBORValue>([
      ['bytes', new Uint8Array(300)],
      ['list', [true, false, null, 'text']],
      [-1, { tag: 18, value: 1 }]
    ]);
    expect(decodeCBOR(encodeCBOR(value))).toEqual(value);
  });

  it('refuses numbers it cannot encode exactly', () => {
    expect(() => encodeCBOR(1.5)).toThrow(RangeError);
  });
});
