import { createEndpoint } from '@farm.js/core/api';

import { setAppFrozen } from '@/lib/appService';
import { getGatewayClient } from '@/lib/gatewayClient';
import { requireOwner } from '@/lib/middleware';
import { respondWith, respondWithFailure } from '@/lib/responses';
import { getControlStore } from '@/lib/storage';
import { freezeSchema } from '@/lib/validators';

export const POST = createEndpoint(
  { body: freezeSchema, middleware: [requireOwner] },
  async ({ body, context, params }) => {
    const store = getControlStore();
    const appID = String(params.appID);
    const updated = await setAppFrozen(store, context.ownerID, appID, body.isFrozen);
    if (!updated.ok) return respondWithFailure(updated.error);
    const isRefreshed = await getGatewayClient().refreshApps();
    const timing = isRefreshed ? 'now' : 'within 30 seconds';
    const action = body.isFrozen ? 'refuses every call for this app' : 'serves this app again';
    return respondWith(200, updated.value, `The gateway ${action} ${timing}`);
  }
);
