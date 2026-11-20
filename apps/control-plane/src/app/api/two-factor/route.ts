import { createEndpoint } from '@farm.js/core/api';

import { requireOwner, requireRecentSignIn } from '@/lib/middleware';
import { respondWith, respondWithFailure } from '@/lib/responses';
import { getControlStore } from '@/lib/storage';
import { readTwoFactorStatus, startTwoFactor } from '@/lib/twoFactorService';

export const GET = createEndpoint({ middleware: [requireOwner] }, async ({ context }) => {
  const status = await readTwoFactorStatus(getControlStore(), context.ownerID);
  return respondWith(200, status, 'Two-factor status loaded');
});

export const POST = createEndpoint({ middleware: [requireRecentSignIn] }, async ({ context }) => {
  const store = getControlStore();
  const started = await startTwoFactor(store, context.ownerID, context.ownerEmail);
  if (!started.ok) return respondWithFailure(started.error);
  return respondWith(200, started.value, 'Scan the code, then enter the 6 digits');
});
