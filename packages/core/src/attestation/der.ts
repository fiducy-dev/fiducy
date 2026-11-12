import { MalformedDocumentError } from './errors.ts';

import type { Bytes } from '../types.ts';
import type { DERElement, DERLength } from './types.ts';

function readLength(bytes: Bytes, offset: number): DERLength {
  const first = bytes[offset];
  if (first === undefined) throw new MalformedDocumentError('DER input ended early');
  if (first < 0x80) return { length: first, headerEnd: offset + 1 };
  const byteCount = first & 0x7f;
  if (byteCount === 0 || byteCount > 3) throw new MalformedDocumentError('Unsupported DER length');
  let length = 0;
  for (let index = 1; index <= byteCount; index += 1) {
    const byte = bytes[offset + index];
    if (byte === undefined) throw new MalformedDocumentError('DER input ended early');
    length = length * 256 + byte;
  }
  if (length < 0x80) throw new MalformedDocumentError('DER length is not minimal');
  return { length, headerEnd: offset + 1 + byteCount };
}

export function readDERElement(bytes: Bytes, start: number, limit = bytes.length): DERElement {
  const tag = bytes[start];
  if (tag === undefined) throw new MalformedDocumentError('DER input ended early');
  const { length, headerEnd } = readLength(bytes, start + 1);
  const end = headerEnd + length;
  if (end > limit) throw new MalformedDocumentError('DER element runs past its parent');
  return { tag, start, contentStart: headerEnd, end };
}

export function readDERChildren(bytes: Bytes, parent: DERElement): DERElement[] {
  const children: DERElement[] = [];
  let offset = parent.contentStart;
  while (offset < parent.end) {
    const child = readDERElement(bytes, offset, parent.end);
    children.push(child);
    offset = child.end;
  }
  return children;
}

export function expectDERTag(element: DERElement | undefined, tag: number): DERElement {
  if (element?.tag !== tag) throw new MalformedDocumentError(`Expected DER tag ${tag}`);
  return element;
}

export function readDERContent(bytes: Bytes, element: DERElement): Bytes {
  return bytes.slice(element.contentStart, element.end);
}

export function readDERWhole(bytes: Bytes, element: DERElement): Bytes {
  return bytes.slice(element.start, element.end);
}
