import { createEndpoint } from '@farm.js/core/api';

import { createApp, listApps } from '@/lib/appService';
import { getGatewayClient } from '@/lib/gatewayClient';
import { requireOwner } from '@/lib/middleware';
import { respondWith } from '@/lib/responses';
import { getControlStore } from '@/lib/storage';
import { appSettingsSchema } from '@/lib/validators';

export const GET = createEndpoint({ middleware: [requireOwner] }, async ({ context }) => {
  const apps = await listApps(getControlStore(), context.ownerID);
  return respondWith(200, apps, 'Apps loaded');
});

export const POST = createEndpoint(
  { body: appSettingsSchema, middleware: [requireOwner] },
  async ({ body, context }) => {
    const created = await createApp(getControlStore(), context.ownerID, body);
    await getGatewayClient().refreshApps();
    return respondWith(201, created, 'App created. Copy the secret now, it is shown only once');
  }
);
