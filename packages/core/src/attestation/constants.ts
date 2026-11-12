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
