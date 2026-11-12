import { decodeCBOR } from './cbor.ts';
import { ATTESTATION_DIGEST, COSE_ALGORITHM_LABEL, COSE_ES384 } from './constants.ts';
import { COSE_SIGN1_TAG, COSE_SIGNATURE_CONTEXT, PCR_LENGTH } from './constants.ts';
import { encodeCBOR } from './encodeCBOR.ts';
import { MalformedDocumentError } from './errors.ts';

import type { Bytes } from '../types.ts';
import type { CBORKey, CBORValue, COSESignedMessage } from './types.ts';
import type { NitroAttestationPayload } from './types.ts';

function isBytes(value: CBORValue | undefined): value is Bytes {
  return value instanceof Uint8Array;
}

function requireBytes(value: CBORValue | undefined, field: string): Bytes {
  if (!isBytes(value)) throw new MalformedDocumentError(`Attestation field ${field} must be bytes`);
  return value;
}

function readOptionalBytes(value: CBORValue | undefined, field: string): Bytes | null {
  if (value === undefined || value === null) return null;
  return requireBytes(value, field);
}

function requireMap(value: CBORValue | undefined, field: string): Map<CBORKey, CBORValue> {
  if (!(value instanceof Map))
    throw new MalformedDocumentError(`Attestation field ${field} must be a map`);
  return value;
}

function unwrapSignTag(value: CBORValue): CBORValue {
  if (value === null || typeof value !== 'object' || !('tag' in value)) return value;
  if (value.tag !== COSE_SIGN1_TAG) throw new MalformedDocumentError('Unexpected CBOR tag');
  return value.value;
}

export function decodeCOSESign1(document: Bytes): COSESignedMessage {
  const message = unwrapSignTag(decodeCBOR(document));
  if (!Array.isArray(message) || message.length !== 4)
    throw new MalformedDocumentError('Not a COSE_Sign1');
  const [protectedHeader, unprotectedHeader, payload, signature] = message;
  requireMap(unprotectedHeader, 'unprotected header');
  return {
    protectedHeader: requireBytes(protectedHeader, 'protected header'),
    payload: requireBytes(payload, 'payload'),
    signature: requireBytes(signature, 'signature')
  };
}

export function isES384Signed(protectedHeader: Bytes): boolean {
  const header = requireMap(decodeCBOR(protectedHeader), 'protected header');
  return header.get(COSE_ALGORITHM_LABEL) === COSE_ES384;
}

export function encodeSignatureStructure({ protectedHeader, payload }: COSESignedMessage): Bytes {
  return encodeCBOR([COSE_SIGNATURE_CONTEXT, protectedHeader, new Uint8Array(0), payload]);
}

function readPCRs(value: CBORValue | undefined): Map<number, Bytes> {
  const pcrs = new Map<number, Bytes>();
  for (const [index, measurement] of requireMap(value, 'pcrs')) {
    if (typeof index !== 'number') throw new MalformedDocumentError('PCR indexes must be integers');
    const bytes = requireBytes(measurement, 'pcr');
    if (bytes.length !== PCR_LENGTH)
      throw new MalformedDocumentError('PCRs must be SHA-384 digests');
    pcrs.set(index, bytes);
  }
  return pcrs;
}

function readCertificateBundle(value: CBORValue | undefined): Bytes[] {
  if (!Array.isArray(value) || value.length === 0)
    throw new MalformedDocumentError('cabundle must be a list');
  return value.map((certificate) => requireBytes(certificate, 'cabundle'));
}

function readTimestamp(milliseconds: number): Date {
  const timestamp = new Date(milliseconds);
  if (Number.isNaN(timestamp.getTime())) throw new MalformedDocumentError('Invalid timestamp');
  return timestamp;
}

export function decodeAttestationPayload(payload: Bytes): NitroAttestationPayload {
  const fields = requireMap(decodeCBOR(payload), 'payload');
  const moduleID = fields.get('module_id');
  const timestamp = fields.get('timestamp');
  if (typeof moduleID !== 'string' || typeof timestamp !== 'number') {
    throw new MalformedDocumentError('Attestation module_id or timestamp is missing');
  }
  if (fields.get('digest') !== ATTESTATION_DIGEST)
    throw new MalformedDocumentError('Unsupported PCR digest');
  return {
    moduleID,
    timestamp: readTimestamp(timestamp),
    pcrs: readPCRs(fields.get('pcrs')),
    certificate: requireBytes(fields.get('certificate'), 'certificate'),
    certificateBundle: readCertificateBundle(fields.get('cabundle')),
    nonce: readOptionalBytes(fields.get('nonce'), 'nonce'),
    userData: readOptionalBytes(fields.get('user_data'), 'user_data'),
    publicKey: readOptionalBytes(fields.get('public_key'), 'public_key')
  };
}
