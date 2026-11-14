import { createEndpoint } from '@farm.js/core/api';

import { getGatewayClient } from '@/lib/gatewayClient';
import { listAppKeys, revokeAllAppKeys } from '@/lib/keyService';
import { requireOwner, requireRecentSignIn, requireSecondFactor } from '@/lib/middleware';
import { respondWith, respondWithFailure } from '@/lib/responses';
import { getControlStore } from '@/lib/storage';

export const GET = createEndpoint({ middleware: [requireOwner] }, async ({ context, params }) => {
  const keys = await listAppKeys(getControlStore(), context.ownerID, String(params.appID));
  if (!keys.ok) return respondWithFailure(keys.error);
  return respondWith(200, keys.value, 'Keys loaded');
});

export const DELETE = createEndpoint(
  { middleware: [requireRecentSignIn, requireSecondFactor] },
  async ({ context, params }) => {
    const store = getControlStore();
    const appID = String(params.appID);
    const revoked = await revokeAllAppKeys(store, getGatewayClient(), context.ownerID, appID);
    if (!revoked.ok) return respondWithFailure(revoked.error);
    const { revokedCount, failedCount } = revoked.value;
    const failures = failedCount ? `. ${failedCount} could not be revoked. Try again` : '';
    return respondWith(200, revoked.value, `Revoked ${revokedCount} keys${failures}`);
  }
);
