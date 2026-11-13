import { encodeHex } from './bytes.ts';
import { BASIC_CONSTRAINTS_OID, DER_TAGS } from './constants.ts';
import { expectDerTag, readDerChildren, readDerContent } from './der.ts';
import { readDerElement, readDerWhole } from './der.ts';

import type { Bytes } from '../types.ts';
import type { DerElement, ParsedCertificate } from './types.ts';

const textDecoder = new TextDecoder();

function parseTime(bytes: Bytes, element: DerElement): Date {
  const text = textDecoder.decode(readDerContent(bytes, element));
  const isShortYear = element.tag === DER_TAGS.utcTime;
  const pattern = isShortYear ? /^(\d{2})(\d{10})Z$/ : /^(\d{4})(\d{10})Z$/;
  const match = pattern.exec(text);
  if (!match?.[1] || !match[2]) throw new Error('Unsupported certificate time');
  const shortYear = Number(match[1]);
  const year = isShortYear ? (shortYear >= 50 ? 1900 : 2000) + shortYear : shortYear;
  const [month, day, hour, minute, second] = (match[2].match(/\d{2}/g) ?? []).map(Number);
  return new Date(Date.UTC(year, (month ?? 1) - 1, day, hour, minute, second));
}

function readTime(bytes: Bytes, element: DerElement | undefined): Date {
  if (element?.tag !== DER_TAGS.utcTime && element?.tag !== DER_TAGS.generalizedTime) {
    throw new Error('Expected a certificate time');
  }
  return parseTime(bytes, element);
}

function readBitString(bytes: Bytes, element: DerElement): Bytes {
  const content = readDerContent(bytes, expectDerTag(element, DER_TAGS.bitString));
  if (content[0] !== 0) throw new Error('Signature bit string has unused bits');
  return content.slice(1);
}

function readBasicConstraintsAuthority(bytes: Bytes, extensionValue: DerElement): boolean {
  const constraints = readDerElement(bytes, extensionValue.contentStart, extensionValue.end);
  const [authorityFlag] = readDerChildren(bytes, expectDerTag(constraints, DER_TAGS.sequence));
  if (authorityFlag?.tag !== DER_TAGS.boolean) return false;
  return bytes[authorityFlag.contentStart] === 0xff;
}

function readIsCertificateAuthority(bytes: Bytes, extensions: DerElement | undefined): boolean {
  if (extensions?.tag !== DER_TAGS.explicitExtensions) return false;
  const [extensionList] = readDerChildren(bytes, extensions);
  for (const extension of readDerChildren(bytes, expectDerTag(extensionList, DER_TAGS.sequence))) {
    const parts = readDerChildren(bytes, expectDerTag(extension, DER_TAGS.sequence));
    const identifier = expectDerTag(parts[0], DER_TAGS.objectIdentifier);
    if (encodeHex(readDerContent(bytes, identifier)) !== BASIC_CONSTRAINTS_OID) continue;
    const value = expectDerTag(parts.at(-1), DER_TAGS.octetString);
    return readBasicConstraintsAuthority(bytes, value);
  }
  return false;
}

function readAlgorithm(bytes: Bytes, element: DerElement | undefined): Bytes {
  const [identifier] = readDerChildren(bytes, expectDerTag(element, DER_TAGS.sequence));
  return readDerContent(bytes, expectDerTag(identifier, DER_TAGS.objectIdentifier));
}

function readSignedFields(der: Bytes, signed: DerElement): DerElement[] {
  const fields = readDerChildren(der, signed);
  return fields[0]?.tag === DER_TAGS.explicitVersion ? fields.slice(1) : fields;
}

function readSignatureAlgorithm(
  der: Bytes,
  inner: DerElement | undefined,
  outer: DerElement | undefined
): Bytes {
  const algorithm = readAlgorithm(der, outer);
  if (encodeHex(readAlgorithm(der, inner)) !== encodeHex(algorithm)) {
    throw new Error('Certificate signature algorithms disagree');
  }
  return algorithm;
}

export function parseCertificate(der: Bytes): ParsedCertificate {
  const certificate = readDerElement(der, 0);
  if (certificate.end !== der.length) throw new Error('Certificate has trailing bytes');
  const [signed, algorithm, signature] = readDerChildren(der, certificate);
  const signedElement = expectDerTag(signed, DER_TAGS.sequence);
  const fields = readSignedFields(der, signedElement);
  const [, innerAlgorithm, issuer, validity, subject, publicKey] = fields;
  const [validFrom, validUntil] = readDerChildren(der, expectDerTag(validity, DER_TAGS.sequence));
  return {
    der,
    signedBytes: readDerWhole(der, signedElement),
    signatureAlgorithm: readSignatureAlgorithm(der, innerAlgorithm, algorithm),
    signature: readBitString(der, expectDerTag(signature, DER_TAGS.bitString)),
    issuer: readDerWhole(der, expectDerTag(issuer, DER_TAGS.sequence)),
    subject: readDerWhole(der, expectDerTag(subject, DER_TAGS.sequence)),
    subjectPublicKeyInfo: readDerWhole(der, expectDerTag(publicKey, DER_TAGS.sequence)),
    validFrom: readTime(der, validFrom),
    validUntil: readTime(der, validUntil),
    isCertificateAuthority: readIsCertificateAuthority(der, fields.at(-1))
  };
}
