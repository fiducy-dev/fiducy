import { fail, succeed } from '@fiducy/core';

import { MONTHLY_REQUEST_LIMIT_MESSAGE, REQUEST_COUNTER_GRACE_SECONDS } from './constants';
import { REQUEST_COUNTER_PREFIX } from './constants';
import { describeFailure } from './responses';

import type { GatewayResult, RegisteredApp, RequestReservation } from './types';
import type { SpendCharge, SpendCounter } from './types';

// The monthly request count is kept in the same counters as spend (DynamoDB on AWS, memory in
// local development), so it survives restarts and two requests cannot both take the last slot.
function describeRequestCharge(app: RegisteredApp, keyID: string, now: Date): SpendCharge {
  const month = now.toISOString().slice(0, 7);
  const nextMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return {
    counterID: `${REQUEST_COUNTER_PREFIX}key:${keyID}:${month}`,
    amount: 1,
    limit: app.monthlyRequestLimitPerKey,
    expiresAt: Math.floor(nextMonth / 1000) + REQUEST_COUNTER_GRACE_SECONDS
  };
}

function createRefund(charge: SpendCharge, spendCounter: SpendCounter) {
  let hasRefunded = false;
  return () => {
    if (hasRefunded) return;
    hasRefunded = true;
    spendCounter.adjustSpend([{ ...charge, amount: -1 }]).catch((error: unknown) => {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(`Could not refund request counter ${charge.counterID}: ${reason}`);
    });
  };
}

export async function reserveRequest(
  app: RegisteredApp,
  keyID: string,
  spendCounter: SpendCounter,
  now = new Date()
): Promise<GatewayResult<RequestReservation>> {
  const charge = describeRequestCharge(app, keyID, now);
  const reserved = await spendCounter.reserveSpend([charge]);
  if (!reserved.ok) return fail(describeFailure(429, MONTHLY_REQUEST_LIMIT_MESSAGE));
  return succeed({ refund: createRefund(charge, spendCounter) });
}
