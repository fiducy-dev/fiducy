import { MAXIMUM_CBOR_DEPTH, MAXIMUM_CBOR_ITEMS } from './constants.ts';

import type { Bytes } from '../types.ts';
import type { CborCursor, CborKey, CborValue } from './types.ts';

const textDecoder = new TextDecoder('utf-8', { fatal: true });

function readByte(cursor: CborCursor): number {
  const byte = cursor.bytes[cursor.offset];
  if (byte === undefined) throw new Error('CBOR input ended early');
  cursor.offset += 1;
  return byte;
}

function readUnsigned(cursor: CborCursor, byteCount: number): number {
  let value = 0;
  for (let index = 0; index < byteCount; index += 1) {
    value = value * 256 + readByte(cursor);
  }
  if (!Number.isSafeInteger(value)) throw new Error('CBOR integer is too large');
  return value;
}

function readArgument(cursor: CborCursor, additionalInformation: number): number {
  if (additionalInformation < 24) return additionalInformation;
  if (additionalInformation === 24) return readUnsigned(cursor, 1);
  if (additionalInformation === 25) return readUnsigned(cursor, 2);
  if (additionalInformation === 26) return readUnsigned(cursor, 4);
  if (additionalInformation === 27) return readUnsigned(cursor, 8);
  throw new Error('CBOR indefinite lengths and reserved values are not allowed');
}

function readByteString(cursor: CborCursor, length: number): Bytes {
  const end = cursor.offset + length;
  if (end > cursor.bytes.length) throw new Error('CBOR byte string runs past the input');
  const value = cursor.bytes.slice(cursor.offset, end);
  cursor.offset = end;
  return value;
}

function requireItemCount(count: number): number {
  if (count > MAXIMUM_CBOR_ITEMS) throw new Error('CBOR container has too many items');
  return count;
}

function readArray(cursor: CborCursor, count: number, depth: number): CborValue[] {
  return Array.from({ length: requireItemCount(count) }, () => readValue(cursor, depth + 1));
}

function readMap(cursor: CborCursor, count: number, depth: number): Map<CborKey, CborValue> {
  const map = new Map<CborKey, CborValue>();
  const itemCount = requireItemCount(count);
  for (let index = 0; index < itemCount; index += 1) {
    const key = readValue(cursor, depth + 1);
    if (typeof key !== 'number' && typeof key !== 'string') throw new Error('Unsupported map key');
    if (map.has(key)) throw new Error('CBOR map has a duplicate key');
    map.set(key, readValue(cursor, depth + 1));
  }
  return map;
}

function readSimpleValue(additionalInformation: number): CborValue {
  if (additionalInformation === 20) return false;
  if (additionalInformation === 21) return true;
  if (additionalInformation === 22) return null;
  throw new Error('Unsupported CBOR simple value');
}

function readValue(cursor: CborCursor, depth: number): CborValue {
  if (depth > MAXIMUM_CBOR_DEPTH) throw new Error('CBOR nesting is too deep');
  const initialByte = readByte(cursor);
  const majorType = initialByte >> 5;
  const additionalInformation = initialByte & 0x1f;
  if (majorType === 7) return readSimpleValue(additionalInformation);
  const argument = readArgument(cursor, additionalInformation);
  if (majorType === 0) return argument;
  if (majorType === 1) return -1 - argument;
  if (majorType === 2) return readByteString(cursor, argument);
  if (majorType === 3) return textDecoder.decode(readByteString(cursor, argument));
  if (majorType === 4) return readArray(cursor, argument, depth);
  if (majorType === 5) return readMap(cursor, argument, depth);
  return { tag: argument, value: readValue(cursor, depth + 1) };
}

export function decodeCbor(bytes: Bytes): CborValue {
  const cursor = { bytes, offset: 0 };
  const value = readValue(cursor, 0);
  if (cursor.offset !== bytes.length) throw new Error('CBOR input has trailing bytes');
  return value;
}

function encodeHeader(majorType: number, length: number): Bytes {
  const prefix = majorType << 5;
  if (length < 24) return new Uint8Array([prefix | length]);
  if (length < 0x100) return new Uint8Array([prefix | 24, length]);
  if (length < 0x10000) return new Uint8Array([prefix | 25, length >> 8, length & 0xff]);
  const header = new Uint8Array(5);
  header[0] = prefix | 26;
  new DataView(header.buffer).setUint32(1, length);
  return header;
}

export function encodeCborByteString(bytes: Bytes): Bytes[] {
  return [encodeHeader(2, bytes.length), bytes];
}

export function encodeCborText(text: string): Bytes[] {
  const bytes = new TextEncoder().encode(text);
  return [encodeHeader(3, bytes.length), bytes];
}

export function encodeCborArrayHeader(length: number): Bytes {
  return encodeHeader(4, length);
}
