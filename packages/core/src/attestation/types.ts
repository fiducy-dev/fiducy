import type { Bytes } from '../types.ts';

export type CborKey = number | string;

export type CborValue =
  | number
  | string
  | boolean
  | null
  | Bytes
  | CborValue[]
  | Map<CborKey, CborValue>
  | CborTaggedValue;

export interface CborTaggedValue {
  tag: number;
  value: CborValue;
}

export interface CborCursor {
  bytes: Bytes;
  offset: number;
}

export interface DerElement {
  tag: number;
  start: number;
  contentStart: number;
  end: number;
}

export interface DerLength {
  length: number;
  headerEnd: number;
}

export interface ParsedCertificate {
  der: Bytes;
  signedBytes: Bytes;
  signatureAlgorithm: Bytes;
  signature: Bytes;
  issuer: Bytes;
  subject: Bytes;
  subjectPublicKeyInfo: Bytes;
  validFrom: Date;
  validUntil: Date;
  isCertificateAuthority: boolean;
}

export type ChainVerdict = 'trusted' | 'untrusted' | 'expired';

export interface CoseSignedMessage {
  protectedHeader: Bytes;
  payload: Bytes;
  signature: Bytes;
}

export interface NitroAttestationPayload {
  moduleID: string;
  timestamp: Date;
  pcrs: Map<number, Bytes>;
  certificate: Bytes;
  certificateBundle: Bytes[];
  nonce: Bytes | null;
  userData: Bytes | null;
  publicKey: Bytes | null;
}

export interface VerifyAttestationInput {
  document: Bytes;
  nonce: Bytes;
  expectedPCR0s: string[];
  expectedPCR16s?: string[];
}

export interface VerifiedAttestation {
  pcr0: string;
  pcr16: string;
  moduleID: string;
  timestamp: Date;
  userData: Bytes | null;
  publicKey: Bytes | null;
}

export type AttestationError =
  | 'malformed_document'
  | 'unsupported_algorithm'
  | 'untrusted_certificate_chain'
  | 'certificate_not_valid_at_timestamp'
  | 'invalid_signature'
  | 'nonce_mismatch'
  | 'debug_mode_enclave'
  | 'unexpected_pcr0'
  | 'unexpected_pcr16';
