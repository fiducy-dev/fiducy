import { checkGateway } from '@fiducy/core/attestation';

import { FiducyGatewayError } from './errors.ts';

import type { FetchAttestation } from '@fiducy/core/attestation';

import type { FetchGateway } from '../types.ts';
import type { FiducyConnection } from './types.ts';

export async function assertGatewayAttested(
  { gatewayURL, enclavePCR0, enclavePCR16, skipAttestation }: FiducyConnection,
  fetchGateway: FetchGateway = fetch
): Promise<void> {
  const fetchAttestation: FetchAttestation = (url, { signal }) =>
    fetchGateway(url, { method: 'GET', signal });
  const input = { gatewayURL, enclavePCR0, enclavePCR16, skipAttestation, fetch: fetchAttestation };
  const check = await checkGateway(input);
  if (!check.ok) throw new FiducyGatewayError(check.refusal);
  if (check.warning) console.warn(check.warning);
}
