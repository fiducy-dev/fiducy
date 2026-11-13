import { fail, succeed } from '../result.ts';
import { areBytesEqual, encodeHex, isAllZero } from './bytes.ts';
import { parseCertificate } from './certificate.ts';
import { importP384PublicKey, verifyCertificateChain, verifyP384Signature } from './chain.ts';
import { AWS_NITRO_ROOT_FINGERPRINT, DEBUG_MODE_PCR_INDEXES } from './constants.ts';
import { DEPLOYMENT_CONFIG_PCR_INDEX } from './constants.ts';
import { ECDSA_P384_COORDINATE_LENGTH, MAXIMUM_DOCUMENT_LENGTH } from './constants.ts';
import { decodeAttestationPayload, decodeCoseSign1 } from './document.ts';
import { encodeSignatureStructure, isES384Signed } from './document.ts';
import { normalizePCR } from './pcr.ts';

import type { Bytes, Result } from '../types.ts';
import type { AttestationError, CoseSignedMessage, NitroAttestationPayload } from './types.ts';
import type { VerifiedAttestation, VerifyAttestationInput } from './types.ts';

async function isSignedByLeaf(message: CoseSignedMessage, leaf: Bytes): Promise<boolean> {
  if (message.signature.length !== ECDSA_P384_COORDINATE_LENGTH * 2) return false;
  const { subjectPublicKeyInfo } = parseCertificate(leaf);
  const leafKey = await importP384PublicKey(subjectPublicKeyInfo);
  return verifyP384Signature(leafKey, message.signature, encodeSignatureStructure(message));
}

function readPCR(payload: NitroAttestationPayload, index: number): string {
  return encodeHex(payload.pcrs.get(index) ?? new Uint8Array(0));
}

function isExpectedPCR(measurement: string, expected: string[]): boolean {
  return expected.map(normalizePCR).includes(measurement);
}

function readPCRError(
  payload: NitroAttestationPayload,
  { expectedPCR0s, expectedPCR16s = [] }: VerifyAttestationInput
): AttestationError | null {
  const isDebugMode = DEBUG_MODE_PCR_INDEXES.some((index) => {
    const measurement = payload.pcrs.get(index);
    return !measurement || isAllZero(measurement);
  });
  if (isDebugMode) return 'debug_mode_enclave';
  if (!isExpectedPCR(readPCR(payload, 0), expectedPCR0s)) return 'unexpected_pcr0';
  const pcr16 = readPCR(payload, DEPLOYMENT_CONFIG_PCR_INDEX);
  if (expectedPCR16s.length > 0 && !isExpectedPCR(pcr16, expectedPCR16s)) {
    return 'unexpected_pcr16';
  }
  return null;
}

async function readDocumentError(
  message: CoseSignedMessage,
  payload: NitroAttestationPayload,
  trustedRootFingerprint: string
): Promise<AttestationError | null> {
  if (!isES384Signed(message.protectedHeader)) return 'unsupported_algorithm';
  const chain = [...payload.certificateBundle, payload.certificate];
  const verdict = await verifyCertificateChain(chain, trustedRootFingerprint, payload.timestamp);
  if (verdict === 'untrusted') return 'untrusted_certificate_chain';
  if (verdict === 'expired') return 'certificate_not_valid_at_timestamp';
  if (!(await isSignedByLeaf(message, payload.certificate))) return 'invalid_signature';
  return null;
}

async function checkAttestation(
  input: VerifyAttestationInput,
  trustedRootFingerprint: string
): Promise<Result<VerifiedAttestation, AttestationError>> {
  const { document, nonce } = input;
  if (document.length > MAXIMUM_DOCUMENT_LENGTH) return fail('malformed_document');
  const message = decodeCoseSign1(document);
  const payload = decodeAttestationPayload(message.payload);
  const documentError = await readDocumentError(message, payload, trustedRootFingerprint);
  if (documentError) return fail(documentError);
  if (!payload.nonce || !areBytesEqual(payload.nonce, nonce)) return fail('nonce_mismatch');
  const pcrError = readPCRError(payload, input);
  if (pcrError) return fail(pcrError);
  const { moduleID, timestamp, userData, publicKey } = payload;
  const pcr0 = readPCR(payload, 0);
  const pcr16 = readPCR(payload, DEPLOYMENT_CONFIG_PCR_INDEX);
  return succeed({ pcr0, pcr16, moduleID, timestamp, userData, publicKey });
}

export async function verifyAttestationWithRoot(
  input: VerifyAttestationInput,
  trustedRootFingerprint: string
): Promise<Result<VerifiedAttestation, AttestationError>> {
  try {
    return await checkAttestation(input, trustedRootFingerprint);
  } catch {
    return fail('malformed_document');
  }
}

export async function verifyNitroAttestation(
  input: VerifyAttestationInput
): Promise<Result<VerifiedAttestation, AttestationError>> {
  return verifyAttestationWithRoot(input, AWS_NITRO_ROOT_FINGERPRINT);
}
