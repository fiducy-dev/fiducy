import {
  ATTESTATION_ERROR_MESSAGES,
  isLocalGateway,
  verifyGatewayAttestation
} from '@fiducy/core/attestation';

import { DEFAULT_GATEWAY_URL, GATEWAY_HEALTH_PATH } from './constants';
import { GATEWAY_PROBE_TIMEOUT_MILLISECONDS, MISSING_ENCLAVE_PCRS } from './constants';

import type { EnclaveCheck, GatewayProbe, GatewayProbeOptions } from './types';

export function readGatewayProbeOptions(): GatewayProbeOptions {
  return {
    gatewayURL: process.env.FIDUCY_GATEWAY_URL ?? DEFAULT_GATEWAY_URL,
    enclavePCR0: process.env.FIDUCY_ENCLAVE_PCR0 ?? null,
    enclavePCR16: process.env.FIDUCY_ENCLAVE_PCR16 ?? null,
    fetch: (url, init) => fetch(url, init)
  };
}

async function isGatewayHealthy({ gatewayURL, fetch }: GatewayProbeOptions): Promise<boolean> {
  try {
    const url = new URL(GATEWAY_HEALTH_PATH, gatewayURL).toString();
    const response = await fetch(url, {
      signal: AbortSignal.timeout(GATEWAY_PROBE_TIMEOUT_MILLISECONDS)
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Checks the enclave the same way the widget does: a fresh nonce, the AWS Nitro root, and the
// PCR0 and PCR16 the dashboard expects. Anything short of that is reported as a problem.
async function checkEnclave(options: GatewayProbeOptions): Promise<EnclaveCheck> {
  const { gatewayURL, enclavePCR0, enclavePCR16, fetch } = options;
  if (!enclavePCR0 || !enclavePCR16) {
    return { pcr0: null, problem: isLocalGateway(gatewayURL) ? null : MISSING_ENCLAVE_PCRS };
  }
  try {
    const timeoutMilliseconds = GATEWAY_PROBE_TIMEOUT_MILLISECONDS;
    const input = { gatewayURL, enclavePCR0, enclavePCR16, fetch, timeoutMilliseconds };
    const verified = await verifyGatewayAttestation(input);
    if (verified.ok) return { pcr0: verified.value.pcr0, problem: null };
    return { pcr0: null, problem: ATTESTATION_ERROR_MESSAGES[verified.error] };
  } catch (error) {
    return { pcr0: null, problem: error instanceof Error ? error.message : String(error) };
  }
}

export function createGatewayProbe(options: GatewayProbeOptions): GatewayProbe {
  return async () => {
    const [healthy, enclave] = await Promise.all([
      isGatewayHealthy(options),
      checkEnclave(options)
    ]);
    return { healthy, enclave };
  };
}
