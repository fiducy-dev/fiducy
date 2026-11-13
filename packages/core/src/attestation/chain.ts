import { areBytesEqual, encodeHex, hashSHA256, joinBytes } from './bytes.ts';
import { parseCertificate } from './certificate.ts';
import { DER_TAGS, ECDSA_P384_COORDINATE_LENGTH, ECDSA_SHA384_PARAMETERS } from './constants.ts';
import { ECDSA_WITH_SHA384_OID, EC_P384_IMPORT_PARAMETERS } from './constants.ts';
import { expectDerTag, readDerChildren, readDerContent, readDerElement } from './der.ts';

import type { Bytes } from '../types.ts';
import type { ChainVerdict, ParsedCertificate } from './types.ts';

function padCoordinate(integer: Bytes): Bytes {
  const trimmed = integer.slice(integer.findIndex((byte) => byte !== 0));
  if (trimmed.length > ECDSA_P384_COORDINATE_LENGTH) throw new Error('ECDSA value is too long');
  const padded = new Uint8Array(ECDSA_P384_COORDINATE_LENGTH);
  padded.set(trimmed, ECDSA_P384_COORDINATE_LENGTH - trimmed.length);
  return padded;
}

export function convertDerSignatureToRaw(signature: Bytes): Bytes {
  const sequence = expectDerTag(readDerElement(signature, 0), DER_TAGS.sequence);
  if (sequence.end !== signature.length) throw new Error('Signature has trailing bytes');
  const integers = readDerChildren(signature, sequence);
  if (integers.length !== 2) throw new Error('Signature must hold exactly two integers');
  const coordinates = integers.map((integer) =>
    padCoordinate(readDerContent(signature, expectDerTag(integer, DER_TAGS.integer)))
  );
  return joinBytes(coordinates);
}

export async function importP384PublicKey(subjectPublicKeyInfo: Bytes): Promise<CryptoKey> {
  return crypto.subtle.importKey('spki', subjectPublicKeyInfo, EC_P384_IMPORT_PARAMETERS, false, [
    'verify'
  ]);
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

async function isSignedBy(child: ParsedCertificate, parent: ParsedCertificate): Promise<boolean> {
  if (encodeHex(child.signatureAlgorithm) !== ECDSA_WITH_SHA384_OID) return false;
  if (!areBytesEqual(child.issuer, parent.subject) || !parent.isCertificateAuthority) return false;
  const parentKey = await importP384PublicKey(parent.subjectPublicKeyInfo);
  const rawSignature = convertDerSignatureToRaw(child.signature);
  return verifyP384Signature(parentKey, rawSignature, child.signedBytes);
}

export async function verifyCertificateChain(
  chain: Bytes[],
  trustedRootFingerprint: string,
  moment: Date
): Promise<ChainVerdict> {
  const [root] = chain;
  if (!root || (await hashSHA256(root)) !== trustedRootFingerprint) return 'untrusted';
  const certificates = chain.map(parseCertificate);
  if (!certificates.every((certificate) => isValidAt(certificate, moment))) return 'expired';
  for (const [index, child] of certificates.entries()) {
    const parent = certificates[index - 1];
    if (parent && !(await isSignedBy(child, parent))) return 'untrusted';
  }
  return 'trusted';
}
