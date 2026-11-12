import type { Bytes } from '../types.ts';

export function joinBytes(parts: Bytes[]): Bytes {
  const joined = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return joined;
}

export function encodeHex(bytes: Bytes): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function areBytesEqual(first: Bytes, second: Bytes): boolean {
  if (first.length !== second.length) return false;
  let difference = 0;
  for (const [index, byte] of first.entries()) {
    difference |= byte ^ (second[index] ?? 0);
  }
  return difference === 0;
}

export function isAllZero(bytes: Bytes): boolean {
  return bytes.every((byte) => byte === 0);
}

export async function hashSHA256(bytes: Bytes): Promise<string> {
  return encodeHex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
}

export function decodeBase64(text: string): Bytes {
  return Uint8Array.from(atob(text), (character) => character.charCodeAt(0));
}
