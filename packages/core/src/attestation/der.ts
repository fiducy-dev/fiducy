import type { Bytes } from '../types.ts';
import type { DerElement, DerLength } from './types.ts';

function readLength(bytes: Bytes, offset: number): DerLength {
  const first = bytes[offset];
  if (first === undefined) throw new Error('DER input ended early');
  if (first < 0x80) return { length: first, headerEnd: offset + 1 };
  const byteCount = first & 0x7f;
  if (byteCount === 0 || byteCount > 3) throw new Error('Unsupported DER length');
  let length = 0;
  for (let index = 1; index <= byteCount; index += 1) {
    const byte = bytes[offset + index];
    if (byte === undefined) throw new Error('DER input ended early');
    length = length * 256 + byte;
  }
  if (length < 0x80) throw new Error('DER length is not minimal');
  return { length, headerEnd: offset + 1 + byteCount };
}

export function readDerElement(bytes: Bytes, start: number, limit = bytes.length): DerElement {
  const tag = bytes[start];
  if (tag === undefined) throw new Error('DER input ended early');
  const { length, headerEnd } = readLength(bytes, start + 1);
  const end = headerEnd + length;
  if (end > limit) throw new Error('DER element runs past its parent');
  return { tag, start, contentStart: headerEnd, end };
}

export function readDerChildren(bytes: Bytes, parent: DerElement): DerElement[] {
  const children: DerElement[] = [];
  let offset = parent.contentStart;
  while (offset < parent.end) {
    const child = readDerElement(bytes, offset, parent.end);
    children.push(child);
    offset = child.end;
  }
  return children;
}

export function expectDerTag(element: DerElement | undefined, tag: number): DerElement {
  if (element?.tag !== tag) throw new Error(`Expected DER tag ${tag}`);
  return element;
}

export function readDerContent(bytes: Bytes, element: DerElement): Bytes {
  return bytes.slice(element.contentStart, element.end);
}

export function readDerWhole(bytes: Bytes, element: DerElement): Bytes {
  return bytes.slice(element.start, element.end);
}
