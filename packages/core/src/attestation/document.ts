import { joinBytes } from './bytes.ts';
import { decodeCbor, encodeCborArrayHeader, encodeCborByteString } from './cbor.ts';
import { encodeCborText } from './cbor.ts';
import { ATTESTATION_DIGEST, COSE_ALGORITHM_LABEL, COSE_ES384 } from './constants.ts';
import { COSE_SIGN1_TAG, COSE_SIGNATURE_CONTEXT, PCR_LENGTH } from './constants.ts';

import type { Bytes } from '../types.ts';
import type { CborKey, CborValue, CoseSignedMessage } from './types.ts';
import type { NitroAttestationPayload } from './types.ts';

function isBytes(value: CborValue | undefined): value is Bytes {
  return value instanceof Uint8Array;
}

function requireBytes(value: CborValue | undefined, field: string): Bytes {
  if (!isBytes(value)) throw new Error(`Attestation field ${field} must be bytes`);
  return value;
}

function readOptionalBytes(value: CborValue | undefined, field: string): Bytes | null {
  if (value === undefined || value === null) return null;
  return requireBytes(value, field);
}

function requireMap(value: CborValue | undefined, field: string): Map<CborKey, CborValue> {
  if (!(value instanceof Map)) throw new Error(`Attestation field ${field} must be a map`);
  return value;
}

function unwrapSignTag(value: CborValue): CborValue {
  if (value === null || typeof value !== 'object' || !('tag' in value)) return value;
  if (value.tag !== COSE_SIGN1_TAG) throw new Error('Unexpected CBOR tag');
  return value.value;
}

export function decodeCoseSign1(document: Bytes): CoseSignedMessage {
  const message = unwrapSignTag(decodeCbor(document));
  if (!Array.isArray(message) || message.length !== 4) throw new Error('Not a COSE_Sign1');
  const [protectedHeader, unprotectedHeader, payload, signature] = message;
  requireMap(unprotectedHeader, 'unprotected header');
  return {
    protectedHeader: requireBytes(protectedHeader, 'protected header'),
    payload: requireBytes(payload, 'payload'),
    signature: requireBytes(signature, 'signature')
  };
}

export function isES384Signed(protectedHeader: Bytes): boolean {
  const header = requireMap(decodeCbor(protectedHeader), 'protected header');
  return header.get(COSE_ALGORITHM_LABEL) === COSE_ES384;
}

export function encodeSignatureStructure({ protectedHeader, payload }: CoseSignedMessage): Bytes {
  return joinBytes([
    encodeCborArrayHeader(4),
    ...encodeCborText(COSE_SIGNATURE_CONTEXT),
    ...encodeCborByteString(protectedHeader),
    ...encodeCborByteString(new Uint8Array(0)),
    ...encodeCborByteString(payload)
  ]);
}

function readPCRs(value: CborValue | undefined): Map<number, Bytes> {
  const pcrs = new Map<number, Bytes>();
  for (const [index, measurement] of requireMap(value, 'pcrs')) {
    if (typeof index !== 'number') throw new Error('PCR indexes must be integers');
    const bytes = requireBytes(measurement, 'pcr');
    if (bytes.length !== PCR_LENGTH) throw new Error('PCRs must be SHA-384 digests');
    pcrs.set(index, bytes);
  }
  return pcrs;
}

function readCertificateBundle(value: CborValue | undefined): Bytes[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error('cabundle must be a list');
  return value.map((certificate) => requireBytes(certificate, 'cabundle'));
}

export function decodeAttestationPayload(payload: Bytes): NitroAttestationPayload {
  const fields = requireMap(decodeCbor(payload), 'payload');
  const moduleID = fields.get('module_id');
  const timestamp = fields.get('timestamp');
  if (typeof moduleID !== 'string' || typeof timestamp !== 'number') {
    throw new Error('Attestation module_id or timestamp is missing');
  }
  if (fields.get('digest') !== ATTESTATION_DIGEST) throw new Error('Unsupported PCR digest');
  return {
    moduleID,
    timestamp: new Date(timestamp),
    pcrs: readPCRs(fields.get('pcrs')),
    certificate: requireBytes(fields.get('certificate'), 'certificate'),
    certificateBundle: readCertificateBundle(fields.get('cabundle')),
    nonce: readOptionalBytes(fields.get('nonce'), 'nonce'),
    userData: readOptionalBytes(fields.get('user_data'), 'user_data'),
    publicKey: readOptionalBytes(fields.get('public_key'), 'public_key')
  };
}
