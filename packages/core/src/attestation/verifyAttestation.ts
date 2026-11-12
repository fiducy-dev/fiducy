import { fail, succeed } from '../result.ts';
import { areBytesEqual, encodeHex, isAllZero } from './bytes.ts';
import { parseCertificate } from './certificate.ts';
import { importP384PublicKey, verifyCertificateChain, verifyP384Signature } from './chain.ts';
import { AWS_NITRO_ROOT_FINGERPRINT, DEBUG_MODE_PCR_INDEXES } from './constants.ts';
import { DEPLOYMENT_CONFIG_PCR_INDEX } from './constants.ts';
import { ECDSA_P384_COORDINATE_LENGTH, MAXIMUM_DOCUMENT_LENGTH } from './constants.ts';
import { decodeAttestationPayload, decodeCOSESign1 } from './document.ts';
import { encodeSignatureStructure, isES384Signed } from './document.ts';
import { MalformedDocumentError } from './errors.ts';
import { assertAttestationInput } from './input.ts';
import { normalizePCR } from './pcr.ts';

import type { Bytes, Result } from '../types.ts';
import type { AttestationError, COSESignedMessage, NitroAttestationPayload } from './types.ts';
import type { PCRMeasurements, VerifiedAttestation, VerifyAttestationInput } from './types.ts';

async function isSignedByLeaf(message: COSESignedMessage, leaf: Bytes): Promise<boolean> {
  if (message.signature.length !== ECDSA_P384_COORDINATE_LENGTH * 2) return false;
  const { subjectPublicKeyInfo } = parseCertificate(leaf);
  const leafKey = await importP384PublicKey(subjectPublicKeyInfo);
  return verifyP384Signature(leafKey, message.signature, encodeSignatureStructure(message));
}

function readPCR(payload: NitroAttestationPayload, index: number): string | null {
  const measurement = payload.pcrs.get(index);
  return measurement ? encodeHex(measurement) : null;
}

function isExpectedPCR(measurement: string | null, expected: string[]): boolean {
  return measurement !== null && expected.map(normalizePCR).includes(measurement);
}

function isDebugMode(payload: NitroAttestationPayload): boolean {
  return DEBUG_MODE_PCR_INDEXES.some((index) => {
    const measurement = payload.pcrs.get(index);
    return !measurement || isAllZero(measurement);
  });
}

function readMeasurements(
  payload: NitroAttestationPayload,
  { expectedPCR0s, expectedPCR16s = [] }: VerifyAttestationInput
): Result<PCRMeasurements, AttestationError> {
  if (isDebugMode(payload)) return fail('debug_mode_enclave');
  const pcr0 = readPCR(payload, 0);
  if (pcr0 === null || !isExpectedPCR(pcr0, expectedPCR0s)) return fail('unexpected_pcr0');
  const pcr16 = readPCR(payload, DEPLOYMENT_CONFIG_PCR_INDEX);
  const isPCR16Checked = expectedPCR16s.length > 0;
  if (isPCR16Checked && !isExpectedPCR(pcr16, expectedPCR16s)) return fail('unexpected_pcr16');
  return succeed({ pcr0, pcr16 });
}

async function readDocumentError(
  message: COSESignedMessage,
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
  const message = decodeCOSESign1(document);
  const payload = decodeAttestationPayload(message.payload);
  const documentError = await readDocumentError(message, payload, trustedRootFingerprint);
  if (documentError) return fail(documentError);
  if (!payload.nonce || !areBytesEqual(payload.nonce, nonce)) return fail('nonce_mismatch');
  const measurements = readMeasurements(payload, input);
  if (!measurements.ok) return measurements;
  const { moduleID, timestamp, userData, publicKey } = payload;
  return succeed({ ...measurements.value, moduleID, timestamp, userData, publicKey });
}

export async function verifyAttestationWithRoot(
  input: VerifyAttestationInput,
  trustedRootFingerprint: string
): Promise<Result<VerifiedAttestation, AttestationError>> {
  assertAttestationInput(input);
  if (!globalThis.crypto?.subtle) return fail('webcrypto_unavailable');
  try {
    return await checkAttestation(input, trustedRootFingerprint);
  } catch (error) {
    if (error instanceof MalformedDocumentError) return fail('malformed_document');
    throw error;
  }
}

export async function verifyNitroAttestation(
  input: VerifyAttestationInput
): Promise<Result<VerifiedAttestation, AttestationError>> {
  return verifyAttestationWithRoot(input, AWS_NITRO_ROOT_FINGERPRINT);
}
