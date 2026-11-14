import { createEndpoint } from '@farm.js/core/api';

import { deleteApp, findOwnedApp, toAppView, updateApp } from '@/lib/appService';
import { getGatewayClient } from '@/lib/gatewayClient';
import { requireOwner, requireRecentSignIn, requireSecondFactor } from '@/lib/middleware';
import { respondWith, respondWithFailure } from '@/lib/responses';
import { getControlStore } from '@/lib/storage';
import { appSettingsUpdateSchema } from '@/lib/validators';

export const GET = createEndpoint({ middleware: [requireOwner] }, async ({ context, params }) => {
  const owned = await findOwnedApp(getControlStore(), context.ownerID, String(params.appID));
  if (!owned.ok) return respondWithFailure(owned.error);
  return respondWith(200, toAppView(owned.value), 'App loaded');
});

export const PATCH = createEndpoint(
  { body: appSettingsUpdateSchema, middleware: [requireOwner] },
  async ({ body, context, params }) => {
    const store = getControlStore();
    const updated = await updateApp(store, context.ownerID, String(params.appID), body);
    if (!updated.ok) return respondWithFailure(updated.error);
    await getGatewayClient().refreshApps();
    return respondWith(200, updated.value, 'App updated');
  }
);

export const DELETE = createEndpoint(
  { middleware: [requireRecentSignIn, requireSecondFactor] },
  async ({ context, params }) => {
    const deleted = await deleteApp(getControlStore(), context.ownerID, String(params.appID));
    if (!deleted.ok) return respondWithFailure(deleted.error);
    await getGatewayClient().refreshApps();
    return respondWith(200, { appID: deleted.value }, 'App deleted');
  }
);
