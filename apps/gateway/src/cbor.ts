import type { CborValue } from './types';

function encodeHeader(majorType: number, length: number): number[] {
  const prefix = majorType << 5;
  if (length < 24) return [prefix | length];
  if (length < 0x100) return [prefix | 24, length];
  if (length < 0x10000) return [prefix | 25, length >> 8, length & 0xff];
  throw new Error('CBOR values over 64 KiB are not supported');
}

function encodeValue(value: CborValue): number[] {
  if (typeof value === 'number') return encodeHeader(0, value);
  if (typeof value === 'string') {
    const text = new TextEncoder().encode(value);
    return [...encodeHeader(3, text.length), ...text];
  }
  if (value instanceof Uint8Array) return [...encodeHeader(2, value.length), ...value];
  const entries = Object.entries(value);
  const encodedEntries = entries.flatMap(([key, entry]) => [
    ...encodeValue(key),
    ...encodeValue(entry)
  ]);
  return [...encodeHeader(5, entries.length), ...encodedEntries];
}

export function encodeCbor(value: CborValue): Uint8Array<ArrayBuffer> {
  return new Uint8Array(encodeValue(value));
}
