import { ATTESTATION_ERROR_MESSAGES, LOCAL_GATEWAY_HOSTNAMES } from './constants.ts';
import { isPCR, parsePCRList } from './pcr.ts';

import type { AttestationDecision, AttestationPolicyInput } from './types.ts';
import type { GatewayAttestationError } from './types.ts';

export function isLocalGateway(gatewayURL: string): boolean {
  if (!URL.canParse(gatewayURL)) return false;
  return LOCAL_GATEWAY_HOSTNAMES.includes(new URL(gatewayURL).hostname);
}

function readPCRLists({ enclavePCR0, enclavePCR16 }: AttestationPolicyInput) {
  return {
    pcr0s: parsePCRList(enclavePCR0 ?? undefined),
    pcr16s: parsePCRList(enclavePCR16 ?? undefined)
  };
}

function findInvalidPCR(input: AttestationPolicyInput): [string, string] | null {
  const { pcr0s, pcr16s } = readPCRLists(input);
  const invalidPCR0 = pcr0s.find((measurement) => !isPCR(measurement));
  if (invalidPCR0 !== undefined) return ['PCR0', invalidPCR0];
  const invalidPCR16 = pcr16s.find((measurement) => !isPCR(measurement));
  return invalidPCR16 === undefined ? null : ['PCR16', invalidPCR16];
}

export function decideAttestation(input: AttestationPolicyInput): AttestationDecision {
  const { pcr0s, pcr16s } = readPCRLists(input);
  if (pcr0s.length > 0 || pcr16s.length > 0) {
    const isComplete = pcr0s.length > 0 && pcr16s.length > 0;
    return isComplete && !findInvalidPCR(input) ? 'verify' : 'refuse';
  }
  if (input.skipAttestation || isLocalGateway(input.gatewayURL)) return 'skip';
  return 'refuse';
}

export function describeRefusedAttestation(input: AttestationPolicyInput): string {
  const { gatewayURL } = input;
  const { pcr0s, pcr16s } = readPCRLists(input);
  const invalid = findInvalidPCR(input);
  if (invalid) {
    return `FIDUCY_ENCLAVE_${invalid[0]} must be the 96-character hex ${invalid[0]} your deploy printed, not "${invalid[1]}".`;
  }
  if (pcr0s.length > 0 && pcr16s.length === 0) {
    return `Fiducy will not send keys to ${gatewayURL} with only FIDUCY_ENCLAVE_PCR0 set. Set FIDUCY_ENCLAVE_PCR16 to the PCR16 your deploy printed too; without it the genuine image running someone else's deployment config would pass.`;
  }
  if (pcr16s.length > 0 && pcr0s.length === 0) {
    return `Fiducy will not send keys to ${gatewayURL} with only FIDUCY_ENCLAVE_PCR16 set. Set FIDUCY_ENCLAVE_PCR0 to the PCR0 your deploy printed too.`;
  }
  return `Fiducy will not send keys to ${gatewayURL} until it can check the enclave. Set FIDUCY_ENCLAVE_PCR0 and FIDUCY_ENCLAVE_PCR16 to the values your deploy printed, or set FIDUCY_SKIP_ATTESTATION=true for a test gateway that is not in an enclave.`;
}

export function describeSkippedAttestation(gatewayURL: string): string {
  return `Fiducy: FIDUCY_SKIP_ATTESTATION is on, so keys go to ${gatewayURL} without checking its enclave. Use this only for a test gateway.`;
}

export function describeAttestationError(error: GatewayAttestationError): string {
  return `Fiducy refused the gateway: ${ATTESTATION_ERROR_MESSAGES[error]}. No key was sent.`;
}

export function describeFailedCheck(error: unknown): string {
  const reason = error instanceof Error ? error.message || error.name : String(error);
  return `Fiducy refused the gateway: the enclave check failed (${reason || 'unknown error'}). No key was sent.`;
}
