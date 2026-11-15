'use client';

import { useGatewayStatus } from '@/lib/queries';
import { cn } from '@/lib/utils';

import { shortenIdentifier } from './format';

import type { GatewayStatus } from '@/lib/types';

function describeGateway(status: GatewayStatus | undefined): string {
  if (!status) return 'Gateway status unavailable';
  return status.reachable ? 'Gateway online' : 'Gateway unreachable';
}

function describeAttestation(status: GatewayStatus | undefined): string {
  if (status?.pcr0) return `Enclave verified, PCR0 ${shortenIdentifier(status.pcr0, 8)}`;
  return status?.attestationProblem ? 'Enclave not verified' : 'No enclave to check';
}

export function GatewayStatusLine() {
  const gatewayStatus = useGatewayStatus();
  const status = gatewayStatus.data;
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-2.5 gap-y-0.5">
      <span
        aria-hidden="true"
        className={cn(
          'size-2 border border-foreground',
          status?.reachable && status.pcr0 ? 'bg-foreground' : 'bg-transparent'
        )}
      />
      <span className="text-foreground text-xs">{describeGateway(status)}</span>
      <span className="col-start-2 text-ink-quiet text-xs">{describeAttestation(status)}</span>
    </div>
  );
}
