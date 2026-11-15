import {
  CBOR_BREAK,
  CBOR_INDEFINITE_LENGTH,
  MAXIMUM_CBOR_DEPTH,
  MAXIMUM_CBOR_ITEMS
} from './constants.ts';
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
  throw new MalformedDocumentError(
    'CBOR indefinite-length strings and reserved values are not allowed'
  );
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

// A container either states its length up front or runs until a break byte. AWS signs payloads
// in both forms, so both are read. The item limit applies either way.
function hasNextItem(cursor: CBORCursor, count: number | null, itemsRead: number): boolean {
  if (count !== null) return itemsRead < count;
  if (cursor.bytes[cursor.offset] === CBOR_BREAK) {
    cursor.offset += 1;
    return false;
  }
  requireItemCount(itemsRead + 1);
  return true;
}

function readArray(cursor: CBORCursor, count: number | null, depth: number): CBORValue[] {
  const items: CBORValue[] = [];
  while (hasNextItem(cursor, count, items.length)) items.push(readValue(cursor, depth + 1));
  return items;
}

function readMap(cursor: CBORCursor, count: number | null, depth: number): Map<CBORKey, CBORValue> {
  const map = new Map<CBORKey, CBORValue>();
  while (hasNextItem(cursor, count, map.size)) {
    const key = readValue(cursor, depth + 1);
    if (typeof key !== 'number' && typeof key !== 'string') {
      throw new MalformedDocumentError('Unsupported map key');
    }
    if (map.has(key)) throw new MalformedDocumentError('CBOR map has a duplicate key');
    map.set(key, readValue(cursor, depth + 1));
  }
  return map;
}

function readContainer(
  cursor: CBORCursor,
  majorType: number,
  count: number | null,
  depth: number
): CBORValue {
  return majorType === 4 ? readArray(cursor, count, depth) : readMap(cursor, count, depth);
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
  const isContainer = majorType === 4 || majorType === 5;
  if (isContainer && additionalInformation === CBOR_INDEFINITE_LENGTH) {
    return readContainer(cursor, majorType, null, depth);
  }
  const argument = readArgument(cursor, additionalInformation);
  if (isContainer) return readContainer(cursor, majorType, requireItemCount(argument), depth);
  if (majorType === 0) return argument;
  if (majorType === 1) return -1 - argument;
  if (majorType === 2) return readByteString(cursor, argument);
  if (majorType === 3) return readText(cursor, argument);
  return { tag: argument, value: readValue(cursor, depth + 1) };
}

export function decodeCBOR(bytes: Bytes): CBORValue {
  const cursor = { bytes, offset: 0 };
  const value = readValue(cursor, 0);
  if (cursor.offset !== bytes.length)
    throw new MalformedDocumentError('CBOR input has trailing bytes');
  return value;
}
