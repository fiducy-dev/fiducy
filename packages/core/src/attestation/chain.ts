import { areBytesEqual, encodeHex, hashSHA256, joinBytes } from './bytes.ts';
import { parseCertificate } from './certificate.ts';
import { DER_TAGS, ECDSA_P384_COORDINATE_LENGTH, ECDSA_SHA384_PARAMETERS } from './constants.ts';
import { ECDSA_WITH_SHA384_OID, EC_P384_IMPORT_PARAMETERS } from './constants.ts';
import { expectDERTag, readDERChildren, readDERContent, readDERElement } from './der.ts';
import { MalformedDocumentError } from './errors.ts';

import type { Bytes } from '../types.ts';
import type { ChainVerdict, ParsedCertificate } from './types.ts';

function padCoordinate(integer: Bytes): Bytes {
  const trimmed = integer.slice(integer.findIndex((byte) => byte !== 0));
  if (trimmed.length > ECDSA_P384_COORDINATE_LENGTH)
    throw new MalformedDocumentError('ECDSA value is too long');
  const padded = new Uint8Array(ECDSA_P384_COORDINATE_LENGTH);
  padded.set(trimmed, ECDSA_P384_COORDINATE_LENGTH - trimmed.length);
  return padded;
}

export function convertDERSignatureToRaw(signature: Bytes): Bytes {
  const sequence = expectDERTag(readDERElement(signature, 0), DER_TAGS.sequence);
  if (sequence.end !== signature.length)
    throw new MalformedDocumentError('Signature has trailing bytes');
  const integers = readDERChildren(signature, sequence);
  if (integers.length !== 2)
    throw new MalformedDocumentError('Signature must hold exactly two integers');
  const coordinates = integers.map((integer) =>
    padCoordinate(readDERContent(signature, expectDERTag(integer, DER_TAGS.integer)))
  );
  return joinBytes(coordinates);
}

export async function importP384PublicKey(subjectPublicKeyInfo: Bytes): Promise<CryptoKey> {
  try {
    return await crypto.subtle.importKey(
      'spki',
      subjectPublicKeyInfo,
      EC_P384_IMPORT_PARAMETERS,
      false,
      ['verify']
    );
  } catch {
    throw new MalformedDocumentError('Certificate key is not a P-384 public key');
  }
}

export async function verifyP384Signature(
  publicKey: CryptoKey,
  rawSignature: Bytes,
  signedBytes: Bytes
): Promise<boolean> {
  return crypto.subtle.verify(ECDSA_SHA384_PARAMETERS, publicKey, rawSignature, signedBytes);
}

function isValidAt(certificate: ParsedCertificate, moment: Date): boolean {
  return certificate.validFrom <= moment && moment <= certificate.validUntil;
}

function hasUnknownCriticalExtension(certificates: ParsedCertificate[]): boolean {
  return certificates.some((certificate) => certificate.hasUnknownCriticalExtension);
}

function canIssue(parent: ParsedCertificate, authoritiesBelow: number): boolean {
  if (!parent.isCertificateAuthority || !parent.canSignCertificates) return false;
  const { pathLengthConstraint } = parent;
  return pathLengthConstraint === null || authoritiesBelow <= pathLengthConstraint;
}

async function isSignedBy(child: ParsedCertificate, parent: ParsedCertificate): Promise<boolean> {
  if (encodeHex(child.signatureAlgorithm) !== ECDSA_WITH_SHA384_OID) return false;
  if (!areBytesEqual(child.issuer, parent.subject)) return false;
  const parentKey = await importP384PublicKey(parent.subjectPublicKeyInfo);
  const rawSignature = convertDERSignatureToRaw(child.signature);
  return verifyP384Signature(parentKey, rawSignature, child.signedBytes);
}

async function isIssuedAlongChain(certificates: ParsedCertificate[]): Promise<boolean> {
  for (const [index, child] of certificates.entries()) {
    const parent = certificates[index - 1];
    if (!parent) continue;
    if (!canIssue(parent, certificates.length - index - 1)) return false;
    if (!(await isSignedBy(child, parent))) return false;
  }
  return true;
}

export async function verifyCertificateChain(
  chain: Bytes[],
  trustedRootFingerprint: string,
  moment: Date
): Promise<ChainVerdict> {
  const [root] = chain;
  if (!root || (await hashSHA256(root)) !== trustedRootFingerprint) return 'untrusted';
  const certificates = chain.map(parseCertificate);
  if (hasUnknownCriticalExtension(certificates)) return 'untrusted';
  if (!certificates.every((certificate) => isValidAt(certificate, moment))) return 'expired';
  return (await isIssuedAlongChain(certificates)) ? 'trusted' : 'untrusted';
}
