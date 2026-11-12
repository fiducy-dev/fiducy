import type { Bytes } from '../types.ts';

export type CBORKey = number | string;

export type CBORValue =
  | number
  | string
  | boolean
  | null
  | Bytes
  | CBORValue[]
  | Map<CBORKey, CBORValue>
  | CBORTaggedValue;

export interface CBORTaggedValue {
  tag: number;
  value: CBORValue;
}

export interface CBORCursor {
  bytes: Bytes;
  offset: number;
}

export interface DERElement {
  tag: number;
  start: number;
  contentStart: number;
  end: number;
}

export interface DERLength {
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
  pathLengthConstraint: number | null;
  canSignCertificates: boolean;
  hasUnknownCriticalExtension: boolean;
}

export interface CertificateExtension {
  identifier: string;
  isCritical: boolean;
  value: Bytes;
}

export interface BasicConstraints {
  isCertificateAuthority: boolean;
  pathLengthConstraint: number | null;
}

export type ChainVerdict = 'trusted' | 'untrusted' | 'expired';

export interface COSESignedMessage {
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

export interface PCRMeasurements {
  pcr0: string;
  pcr16: string | null;
}

export interface VerifiedAttestation extends PCRMeasurements {
  moduleID: string;
  timestamp: Date;
  userData: Bytes | null;
  publicKey: Bytes | null;
}

export type AttestationError =
  | 'malformed_document'
  | 'webcrypto_unavailable'
  | 'unsupported_algorithm'
  | 'untrusted_certificate_chain'
  | 'certificate_not_valid_at_timestamp'
  | 'invalid_signature'
  | 'nonce_mismatch'
  | 'debug_mode_enclave'
  | 'unexpected_pcr0'
  | 'unexpected_pcr16';
