import { encodeHex } from './bytes.ts';
import { DER_TAGS, KEY_CERT_SIGN_MASK, KNOWN_CRITICAL_EXTENSION_OIDS } from './constants.ts';
import { expectDERTag, readDERChildren, readDERContent, readDERElement } from './der.ts';
import { MalformedDocumentError } from './errors.ts';

import type { Bytes } from '../types.ts';
import type { BasicConstraints, CertificateExtension, DERElement } from './types.ts';

function readBoolean(bytes: Bytes, element: DERElement | undefined): boolean {
  const content = readDERContent(bytes, expectDERTag(element, DER_TAGS.boolean));
  if (content.length !== 1 || (content[0] !== 0 && content[0] !== 0xff)) {
    throw new MalformedDocumentError('DER boolean is not canonical');
  }
  return content[0] === 0xff;
}

function readWholeValue(bytes: Bytes, tag: number): DERElement {
  const element = expectDERTag(readDERElement(bytes, 0), tag);
  if (element.end !== bytes.length)
    throw new MalformedDocumentError('Extension has trailing bytes');
  return element;
}

function readExtension(bytes: Bytes, element: DERElement): CertificateExtension {
  const parts = readDERChildren(bytes, expectDERTag(element, DER_TAGS.sequence));
  if (parts.length < 2 || parts.length > 3) throw new MalformedDocumentError('Malformed extension');
  const identifier = readDERContent(bytes, expectDERTag(parts[0], DER_TAGS.objectIdentifier));
  return {
    identifier: encodeHex(identifier),
    isCritical: parts.length === 3 && readBoolean(bytes, parts[1]),
    value: readDERContent(bytes, expectDERTag(parts.at(-1), DER_TAGS.octetString))
  };
}

export function readExtensions(
  bytes: Bytes,
  element: DERElement | undefined
): Map<string, CertificateExtension> {
  const extensions = new Map<string, CertificateExtension>();
  if (element?.tag !== DER_TAGS.explicitExtensions) return extensions;
  const [list, ...rest] = readDERChildren(bytes, element);
  if (rest.length > 0) throw new MalformedDocumentError('Extensions have trailing fields');
  for (const child of readDERChildren(bytes, expectDERTag(list, DER_TAGS.sequence))) {
    const extension = readExtension(bytes, child);
    if (extensions.has(extension.identifier)) {
      throw new MalformedDocumentError('Certificate repeats an extension');
    }
    extensions.set(extension.identifier, extension);
  }
  return extensions;
}

function readPathLength(bytes: Bytes, element: DERElement): number {
  const content = readDERContent(bytes, expectDERTag(element, DER_TAGS.integer));
  const [length] = content;
  if (content.length !== 1 || length === undefined || length > 0x7f) {
    throw new MalformedDocumentError('Unsupported path length constraint');
  }
  return length;
}

export function readBasicConstraints(
  extension: CertificateExtension | undefined
): BasicConstraints {
  if (!extension) return { isCertificateAuthority: false, pathLengthConstraint: null };
  const { value } = extension;
  const fields = readDERChildren(value, readWholeValue(value, DER_TAGS.sequence));
  const hasFlag = fields[0]?.tag === DER_TAGS.boolean;
  const lengthField = hasFlag ? fields[1] : fields[0];
  if (fields.length > (hasFlag ? 2 : 1)) throw new MalformedDocumentError('Malformed constraints');
  return {
    isCertificateAuthority: hasFlag && readBoolean(value, fields[0]),
    pathLengthConstraint: lengthField ? readPathLength(value, lengthField) : null
  };
}

export function readCanSignCertificates(extension: CertificateExtension | undefined): boolean {
  if (!extension) return false;
  const usage = readDERContent(
    extension.value,
    readWholeValue(extension.value, DER_TAGS.bitString)
  );
  return ((usage[1] ?? 0) & KEY_CERT_SIGN_MASK) !== 0;
}

export function readHasUnknownCriticalExtension(
  extensions: Map<string, CertificateExtension>
): boolean {
  return [...extensions.values()].some(
    ({ identifier, isCritical }) =>
      isCritical && !KNOWN_CRITICAL_EXTENSION_OIDS.includes(identifier)
  );
}
