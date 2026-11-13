export const AWS_NITRO_ROOT_FINGERPRINT =
  '641a0321a3e244efe456463195d606317ed7cdcc3c1756e09893f3c68f79bb5b';
export const MAXIMUM_DOCUMENT_LENGTH = 16384;
export const MAXIMUM_CBOR_DEPTH = 8;
export const MAXIMUM_CBOR_ITEMS = 64;
export const COSE_SIGN1_TAG = 18;
export const COSE_ALGORITHM_LABEL = 1;
export const COSE_ES384 = -35;
export const COSE_SIGNATURE_CONTEXT = 'Signature1';
export const ATTESTATION_DIGEST = 'SHA384';
export const PCR_LENGTH = 48;
export const PCR_HEX_PATTERN = /^[0-9a-f]{96}$/;
export const ECDSA_P384_COORDINATE_LENGTH = 48;
export const ECDSA_WITH_SHA384_OID = '2a8648ce3d040303';
export const BASIC_CONSTRAINTS_OID = '551d13';
export const KEY_USAGE_OID = '551d0f';
export const KNOWN_CRITICAL_EXTENSION_OIDS: readonly string[] = [
  BASIC_CONSTRAINTS_OID,
  KEY_USAGE_OID
];
export const KEY_CERT_SIGN_MASK = 0x04;
export const DEBUG_MODE_PCR_INDEXES = [0, 1, 2] as const;
export const DEPLOYMENT_CONFIG_PCR_INDEX = 16;
export const EC_P384_IMPORT_PARAMETERS = { name: 'ECDSA', namedCurve: 'P-384' } as const;
export const ECDSA_SHA384_PARAMETERS = { name: 'ECDSA', hash: 'SHA-384' } as const;
export const DER_TAGS = {
  boolean: 0x01,
  integer: 0x02,
  bitString: 0x03,
  octetString: 0x04,
  objectIdentifier: 0x06,
  utcTime: 0x17,
  generalizedTime: 0x18,
  sequence: 0x30,
  explicitVersion: 0xa0,
  explicitExtensions: 0xa3
} as const;
export const ATTESTATION_ROUTE = '/attestation';
export const ATTESTATION_FORMAT = 'aws-nitro-cbor';
export const ATTESTATION_NONCE_LENGTH = 32;
export const ATTESTATION_TIMEOUT_MILLISECONDS = 10000;
export const LOCAL_GATEWAY_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]'];
export const ATTESTATION_ERROR_MESSAGES = {
  attestation_unavailable: 'the gateway did not return an attestation document',
  malformed_document: 'the attestation document is malformed',
  webcrypto_unavailable:
    'this page has no WebCrypto to check the enclave with; serve it over HTTPS or from localhost',
  unsupported_algorithm: 'the attestation document is not signed with ES384',
  untrusted_certificate_chain: 'the attestation is not signed by the AWS Nitro root',
  certificate_not_valid_at_timestamp:
    'the attestation certificates were not valid when it was signed',
  invalid_signature: 'the attestation signature does not match',
  nonce_mismatch: 'the attestation does not answer this request (nonce mismatch)',
  debug_mode_enclave: 'the enclave runs in debug mode',
  unexpected_pcr0: 'the enclave runs a different image than FIDUCY_ENCLAVE_PCR0 names',
  unexpected_pcr16: 'the enclave runs a different deployment config than FIDUCY_ENCLAVE_PCR16 names'
} as const;
