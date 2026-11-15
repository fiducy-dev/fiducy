import { describe, expect, it } from 'bun:test';

import { decodeCBOR } from '../../src/attestation/cbor.ts';
import { MAXIMUM_CBOR_ITEMS } from '../../src/attestation/constants.ts';
import { MalformedDocumentError } from '../../src/attestation/errors.ts';

const decodeHex = (hex: string) => decodeCBOR(Uint8Array.from(Buffer.from(hex, 'hex')));

describe('decoding indefinite-length CBOR', () => {
  it('reads an indefinite-length map the same as a definite one', () => {
    expect(decodeHex('bf616101616202ff')).toEqual(decodeHex('a2616101616202'));
  });

  it('reads an indefinite-length array, nested and empty ones included', () => {
    expect(decodeHex('9f019f02ff9fffff')).toEqual([1, [2], []]);
  });

  it('refuses a container that never reaches its break byte', () => {
    expect(() => decodeHex('bf616101')).toThrow(MalformedDocumentError);
    expect(() => decodeHex('9f01')).toThrow(MalformedDocumentError);
  });

  it('refuses a break byte outside an indefinite-length container', () => {
    expect(() => decodeHex('ff')).toThrow(MalformedDocumentError);
    expect(() => decodeHex('8201ff')).toThrow(MalformedDocumentError);
    expect(() => decodeHex('bf6161ffff')).toThrow(MalformedDocumentError);
  });

  it('refuses a repeated key in an indefinite-length map', () => {
    expect(() => decodeHex('bf616101616102ff')).toThrow('duplicate key');
  });

  it('holds indefinite-length containers to the item limit', () => {
    const atLimit = `9f${'00'.repeat(MAXIMUM_CBOR_ITEMS)}ff`;
    const overLimit = `9f${'00'.repeat(MAXIMUM_CBOR_ITEMS + 1)}ff`;
    expect(decodeHex(atLimit)).toHaveLength(MAXIMUM_CBOR_ITEMS);
    expect(() => decodeHex(overLimit)).toThrow('too many items');
  });

  it('holds indefinite-length containers to the nesting limit', () => {
    expect(() => decodeHex(`${'9f'.repeat(12)}${'ff'.repeat(12)}`)).toThrow('too deep');
  });

  it('still refuses indefinite-length strings', () => {
    expect(() => decodeHex('5f4101ff')).toThrow(MalformedDocumentError);
    expect(() => decodeHex('7f6161ff')).toThrow(MalformedDocumentError);
  });
});
