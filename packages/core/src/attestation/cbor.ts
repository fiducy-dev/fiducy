import { MAXIMUM_CBOR_DEPTH, MAXIMUM_CBOR_ITEMS } from './constants.ts';
import { MalformedDocumentError } from './errors.ts';

import type { Bytes } from '../types.ts';
import type { CBORCursor, CBORKey, CBORValue } from './types.ts';

const textDecoder = new TextDecoder('utf-8', { fatal: true });

function readByte(cursor: CBORCursor): number {
  const byte = cursor.bytes[cursor.offset];
  if (byte === undefined) throw new MalformedDocumentError('CBOR input ended early');
  cursor.offset += 1;
  return byte;
}

function readUnsigned(cursor: CBORCursor, byteCount: number): number {
  let value = 0;
  for (let index = 0; index < byteCount; index += 1) {
    value = value * 256 + readByte(cursor);
  }
  if (!Number.isSafeInteger(value)) throw new MalformedDocumentError('CBOR integer is too large');
  return value;
}

function readArgument(cursor: CBORCursor, additionalInformation: number): number {
  if (additionalInformation < 24) return additionalInformation;
  if (additionalInformation === 24) return readUnsigned(cursor, 1);
  if (additionalInformation === 25) return readUnsigned(cursor, 2);
  if (additionalInformation === 26) return readUnsigned(cursor, 4);
  if (additionalInformation === 27) return readUnsigned(cursor, 8);
  throw new MalformedDocumentError('CBOR indefinite lengths and reserved values are not allowed');
}

function readByteString(cursor: CBORCursor, length: number): Bytes {
  const end = cursor.offset + length;
  if (end > cursor.bytes.length)
    throw new MalformedDocumentError('CBOR string runs past the input');
  const value = cursor.bytes.slice(cursor.offset, end);
  cursor.offset = end;
  return value;
}

function readText(cursor: CBORCursor, length: number): string {
  try {
    return textDecoder.decode(readByteString(cursor, length));
  } catch (error) {
    if (error instanceof MalformedDocumentError) throw error;
    throw new MalformedDocumentError('CBOR text is not valid UTF-8');
  }
}

function requireItemCount(count: number): number {
  if (count > MAXIMUM_CBOR_ITEMS)
    throw new MalformedDocumentError('CBOR container has too many items');
  return count;
}

function readArray(cursor: CBORCursor, count: number, depth: number): CBORValue[] {
  return Array.from({ length: requireItemCount(count) }, () => readValue(cursor, depth + 1));
}

function readMap(cursor: CBORCursor, count: number, depth: number): Map<CBORKey, CBORValue> {
  const map = new Map<CBORKey, CBORValue>();
  const itemCount = requireItemCount(count);
  for (let index = 0; index < itemCount; index += 1) {
    const key = readValue(cursor, depth + 1);
    if (typeof key !== 'number' && typeof key !== 'string') {
      throw new MalformedDocumentError('Unsupported map key');
    }
    if (map.has(key)) throw new MalformedDocumentError('CBOR map has a duplicate key');
    map.set(key, readValue(cursor, depth + 1));
  }
  return map;
}

function readSimpleValue(additionalInformation: number): CBORValue {
  if (additionalInformation === 20) return false;
  if (additionalInformation === 21) return true;
  if (additionalInformation === 22) return null;
  throw new MalformedDocumentError('Unsupported CBOR simple value');
}

function readValue(cursor: CBORCursor, depth: number): CBORValue {
  if (depth > MAXIMUM_CBOR_DEPTH) throw new MalformedDocumentError('CBOR nesting is too deep');
  const initialByte = readByte(cursor);
  const majorType = initialByte >> 5;
  const additionalInformation = initialByte & 0x1f;
  if (majorType === 7) return readSimpleValue(additionalInformation);
  const argument = readArgument(cursor, additionalInformation);
  if (majorType === 0) return argument;
  if (majorType === 1) return -1 - argument;
  if (majorType === 2) return readByteString(cursor, argument);
  if (majorType === 3) return readText(cursor, argument);
  if (majorType === 4) return readArray(cursor, argument, depth);
  if (majorType === 5) return readMap(cursor, argument, depth);
  return { tag: argument, value: readValue(cursor, depth + 1) };
}

export function decodeCBOR(bytes: Bytes): CBORValue {
  const cursor = { bytes, offset: 0 };
  const value = readValue(cursor, 0);
  if (cursor.offset !== bytes.length)
    throw new MalformedDocumentError('CBOR input has trailing bytes');
  return value;
}
