import { createEndpoint } from '@farm.js/core/api';

import { getGatewayClient } from '@/lib/gatewayClient';
import { revokeAppKey } from '@/lib/keyService';
import { requireOwner } from '@/lib/middleware';
import { respondWith, respondWithFailure } from '@/lib/responses';
import { getControlStore } from '@/lib/storage';

export const DELETE = createEndpoint(
  { middleware: [requireOwner] },
  async ({ context, params }) => {
    const revoked = await revokeAppKey(
      getControlStore(),
      getGatewayClient(),
      context.ownerID,
      String(params.appID),
      String(params.keyID)
    );
    if (!revoked.ok) return respondWithFailure(revoked.error);
    return respondWith(
      200,
      { keyID: revoked.value },
      'Key revoked. Its sealed record is deleted and the handle no longer opens anything'
    );
  }
);
