export { AWS_NITRO_ROOT_FINGERPRINT } from './constants.ts';
export { decodeBase64 } from './bytes.ts';
export { isPCR, normalizePCR, parsePCRList } from './pcr.ts';
export { verifyNitroAttestation } from './verifyAttestation.ts';

export type { AttestationError, VerifiedAttestation } from './types.ts';
export type { VerifyAttestationInput } from './types.ts';
