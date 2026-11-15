import { createEndpoint } from '@farm.js/core/api';

import { createGatewayProbe, readGatewayProbeOptions } from '@/lib/gatewayProbe';
import { readGatewayStatus } from '@/lib/gatewayStatusService';
import { requireOwner } from '@/lib/middleware';
import { respondWith } from '@/lib/responses';
import { getControlStore } from '@/lib/storage';

export const GET = createEndpoint({ middleware: [requireOwner] }, async () => {
  const probe = createGatewayProbe(readGatewayProbeOptions());
  const status = await readGatewayStatus(getControlStore(), probe);
  return respondWith(200, status, 'Gateway status loaded');
});
