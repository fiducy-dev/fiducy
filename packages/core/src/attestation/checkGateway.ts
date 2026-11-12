import { verifyGatewayAttestation } from './gateway.ts';
import { decideAttestation, describeAttestationError } from './policy.ts';
import { describeFailedCheck, describeRefusedAttestation } from './policy.ts';
import { describeSkippedAttestation, isLocalGateway } from './policy.ts';

import type { GatewayCheck, GatewayCheckInput } from './types.ts';

async function runGatewayCheck(input: GatewayCheckInput): Promise<GatewayCheck> {
  const { gatewayURL } = input;
  const decision = decideAttestation(input);
  if (decision === 'refuse') return { ok: false, refusal: describeRefusedAttestation(input) };
  if (decision === 'skip') {
    const warning = isLocalGateway(gatewayURL) ? null : describeSkippedAttestation(gatewayURL);
    return { ok: true, warning };
  }
  const verified = await verifyGatewayAttestation({
    gatewayURL,
    enclavePCR0: input.enclavePCR0 ?? '',
    enclavePCR16: input.enclavePCR16 ?? '',
    fetch: input.fetch,
    timeoutMilliseconds: input.timeoutMilliseconds
  });
  if (verified.ok) return { ok: true, warning: null };
  return { ok: false, refusal: describeAttestationError(verified.error) };
}

export async function checkGateway(input: GatewayCheckInput): Promise<GatewayCheck> {
  try {
    return await runGatewayCheck(input);
  } catch (error) {
    return { ok: false, refusal: describeFailedCheck(error) };
  }
}
