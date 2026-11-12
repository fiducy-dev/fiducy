export { AWS_NITRO_ROOT_FINGERPRINT } from './constants.ts';
export { encodeCBOR } from './encodeCBOR.ts';
export { verifyGatewayAttestation } from './gateway.ts';
export { isPCR, normalizePCR, parsePCRList } from './pcr.ts';
export {
  decideAttestation,
  describeAttestationError,
  describeRefusedAttestation
} from './policy.ts';
export { describeSkippedAttestation, isLocalGateway } from './policy.ts';
export { verifyNitroAttestation } from './verifyAttestation.ts';

export type { AttestationDecision, AttestationError, AttestationPolicyInput } from './types.ts';
export type { CBORValue, FetchAttestation, GatewayAttestationError } from './types.ts';
export type { VerifiedAttestation, VerifyAttestationInput, VerifyGatewayInput } from './types.ts';
