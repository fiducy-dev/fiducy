import { joinBytes } from './bytes.ts';

import type { Bytes } from '../types.ts';
import type { CBORKey, CBORValue } from './types.ts';

const textEncoder = new TextEncoder();

function encodeHeader(majorType: number, argument: number): Bytes {
  const prefix = majorType << 5;
  if (argument < 24) return new Uint8Array([prefix | argument]);
  if (argument < 0x100) return new Uint8Array([prefix | 24, argument]);
  if (argument < 0x10000) return new Uint8Array([prefix | 25, argument >> 8, argument & 0xff]);
  const isShort = argument < 0x100000000;
  const header = new Uint8Array(isShort ? 5 : 9);
  header[0] = prefix | (isShort ? 26 : 27);
  const view = new DataView(header.buffer);
  if (isShort) view.setUint32(1, argument);
  else view.setBigUint64(1, BigInt(argument));
  return header;
}

function encodeNumber(value: number): Bytes {
  if (!Number.isSafeInteger(value)) throw new RangeError('CBOR numbers must be safe integers');
  return value >= 0 ? encodeHeader(0, value) : encodeHeader(1, -1 - value);
}

function encodeContainer(value: CBORValue[] | Map<CBORKey, CBORValue>): Bytes {
  if (Array.isArray(value))
    return joinBytes([encodeHeader(4, value.length), ...value.map(encodeCBOR)]);
  const entries = [...value].flatMap(([key, item]) => [encodeCBOR(key), encodeCBOR(item)]);
  return joinBytes([encodeHeader(5, value.size), ...entries]);
}

export function encodeCBOR(value: CBORValue): Bytes {
  if (value === null) return new Uint8Array([0xf6]);
  if (typeof value === 'boolean') return new Uint8Array([value ? 0xf5 : 0xf4]);
  if (typeof value === 'number') return encodeNumber(value);
  if (typeof value === 'string') {
    const text = textEncoder.encode(value);
    return joinBytes([encodeHeader(3, text.length), text]);
  }
  if (value instanceof Uint8Array) return joinBytes([encodeHeader(2, value.length), value]);
  if (Array.isArray(value) || value instanceof Map) return encodeContainer(value);
  return joinBytes([encodeHeader(6, value.tag), encodeCBOR(value.value)]);
}
