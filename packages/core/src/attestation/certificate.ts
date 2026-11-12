import { encodeHex } from './bytes.ts';
import { BASIC_CONSTRAINTS_OID, DER_TAGS, KEY_USAGE_OID } from './constants.ts';
import { expectDERTag, readDERChildren, readDERContent } from './der.ts';
import { readDERElement, readDERWhole } from './der.ts';
import { MalformedDocumentError } from './errors.ts';
import { readBasicConstraints, readCanSignCertificates } from './extensions.ts';
import { readExtensions, readHasUnknownCriticalExtension } from './extensions.ts';

import type { Bytes } from '../types.ts';
import type { DERElement, ParsedCertificate } from './types.ts';

const textDecoder = new TextDecoder();

function parseTime(bytes: Bytes, element: DERElement): Date {
  const text = textDecoder.decode(readDERContent(bytes, element));
  const isShortYear = element.tag === DER_TAGS.utcTime;
  const pattern = isShortYear ? /^(\d{2})(\d{10})Z$/ : /^(\d{4})(\d{10})Z$/;
  const match = pattern.exec(text);
  if (!match?.[1] || !match[2]) throw new MalformedDocumentError('Unsupported certificate time');
  const shortYear = Number(match[1]);
  const year = isShortYear ? (shortYear >= 50 ? 1900 : 2000) + shortYear : shortYear;
  const [month, day, hour, minute, second] = (match[2].match(/\d{2}/g) ?? []).map(Number);
  return new Date(Date.UTC(year, (month ?? 1) - 1, day, hour, minute, second));
}

function readTime(bytes: Bytes, element: DERElement | undefined): Date {
  if (element?.tag !== DER_TAGS.utcTime && element?.tag !== DER_TAGS.generalizedTime) {
    throw new MalformedDocumentError('Expected a certificate time');
  }
  return parseTime(bytes, element);
}

function readBitString(bytes: Bytes, element: DERElement): Bytes {
  const content = readDERContent(bytes, expectDERTag(element, DER_TAGS.bitString));
  if (content[0] !== 0) throw new MalformedDocumentError('Signature bit string has unused bits');
  return content.slice(1);
}

function readAlgorithm(bytes: Bytes, element: DERElement | undefined): Bytes {
  const [identifier] = readDERChildren(bytes, expectDERTag(element, DER_TAGS.sequence));
  return readDERContent(bytes, expectDERTag(identifier, DER_TAGS.objectIdentifier));
}

function readSignedFields(der: Bytes, signed: DERElement): DERElement[] {
  const fields = readDERChildren(der, signed);
  return fields[0]?.tag === DER_TAGS.explicitVersion ? fields.slice(1) : fields;
}

function readSignatureAlgorithm(
  der: Bytes,
  inner: DERElement | undefined,
  outer: DERElement | undefined
): Bytes {
  const algorithm = readAlgorithm(der, outer);
  if (encodeHex(readAlgorithm(der, inner)) !== encodeHex(algorithm)) {
    throw new MalformedDocumentError('Certificate signature algorithms disagree');
  }
  return algorithm;
}

export function parseCertificate(der: Bytes): ParsedCertificate {
  const certificate = readDERElement(der, 0);
  if (certificate.end !== der.length)
    throw new MalformedDocumentError('Certificate has trailing bytes');
  const [signed, algorithm, signature] = readDERChildren(der, certificate);
  const signedElement = expectDERTag(signed, DER_TAGS.sequence);
  const fields = readSignedFields(der, signedElement);
  const [, innerAlgorithm, issuer, validity, subject, publicKey] = fields;
  const [validFrom, validUntil] = readDERChildren(der, expectDERTag(validity, DER_TAGS.sequence));
  const extensions = readExtensions(der, fields.at(-1));
  const constraints = readBasicConstraints(extensions.get(BASIC_CONSTRAINTS_OID));
  return {
    der,
    signedBytes: readDERWhole(der, signedElement),
    signatureAlgorithm: readSignatureAlgorithm(der, innerAlgorithm, algorithm),
    signature: readBitString(der, expectDERTag(signature, DER_TAGS.bitString)),
    issuer: readDERWhole(der, expectDERTag(issuer, DER_TAGS.sequence)),
    subject: readDERWhole(der, expectDERTag(subject, DER_TAGS.sequence)),
    subjectPublicKeyInfo: readDERWhole(der, expectDERTag(publicKey, DER_TAGS.sequence)),
    validFrom: readTime(der, validFrom),
    validUntil: readTime(der, validUntil),
    ...constraints,
    canSignCertificates: readCanSignCertificates(extensions.get(KEY_USAGE_OID)),
    hasUnknownCriticalExtension: readHasUnknownCriticalExtension(extensions)
  };
}
