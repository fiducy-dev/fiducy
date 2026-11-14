import { createEndpoint } from '@farm.js/core/api';

import { freezeAppBySecret } from '@/lib/appService';
import { readBearerToken } from '@/lib/common';
import { getGatewayClient } from '@/lib/gatewayClient';
import { respondWith, respondWithFailure } from '@/lib/responses';
import { getControlStore } from '@/lib/storage';

export const POST = createEndpoint({}, async ({ request }) => {
  const appSecret = readBearerToken(request.headers);
  if (!appSecret) return respondWith(401, null, 'Send your app secret as a Bearer token');
  const frozen = await freezeAppBySecret(getControlStore(), appSecret);
  if (!frozen.ok) return respondWithFailure(frozen.error);
  await getGatewayClient().refreshApps();
  return respondWith(
    200,
    { appID: frozen.value },
    'App frozen. Unfreeze it from the dashboard once you are safe'
  );
});
