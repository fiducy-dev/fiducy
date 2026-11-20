import { createEndpoint } from '@farm.js/core/api';

import { requireRecentSignIn } from '@/lib/middleware';
import { respondWith, respondWithFailure } from '@/lib/responses';
import { getControlStore } from '@/lib/storage';
import { confirmTwoFactor } from '@/lib/twoFactorService';
import { twoFactorCodeSchema } from '@/lib/validators';

export const POST = createEndpoint(
  { body: twoFactorCodeSchema, middleware: [requireRecentSignIn] },
  async ({ body, context }) => {
    const confirmed = await confirmTwoFactor(getControlStore(), context.ownerID, body.code);
    if (!confirmed.ok) return respondWithFailure(confirmed.error);
    return respondWith(200, confirmed.value, 'Two-factor is on');
  }
);
