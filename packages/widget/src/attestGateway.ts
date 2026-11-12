import { decideAttestation, describeAttestationError } from '@fiducy/core/attestation';
import { describeSkippedAttestation } from '@fiducy/core/attestation';
import { describeRefusedAttestation, isLocalGateway } from '@fiducy/core/attestation';
import { verifyGatewayAttestation } from '@fiducy/core/attestation';

import type { MountKeyWidgetOptions } from './types.ts';

export async function checkGatewayBeforeMount({
  gatewayURL,
  enclavePCR0,
  enclavePCR16,
  skipAttestation
}: MountKeyWidgetOptions): Promise<string | null> {
  const decision = decideAttestation({ gatewayURL, enclavePCR0, enclavePCR16, skipAttestation });
  if (decision === 'refuse') {
    return describeRefusedAttestation({ gatewayURL, enclavePCR0, enclavePCR16 });
  }
  if (decision === 'skip') {
    if (!isLocalGateway(gatewayURL)) console.warn(describeSkippedAttestation(gatewayURL));
    return null;
  }
  const verified = await verifyGatewayAttestation({
    gatewayURL,
    enclavePCR0: enclavePCR0 ?? '',
    enclavePCR16
  });
  return verified.ok ? null : describeAttestationError(verified.error);
}
