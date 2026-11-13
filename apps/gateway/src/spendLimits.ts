import { fail, succeed } from '@fiducy/core';
import { estimateCostInMicrodollars, findModelPrice } from '@fiducy/providers';

import { DAY_COUNTER_LIFETIME_SECONDS, MICRODOLLARS_PER_DOLLAR } from './constants';
import { MINUTE_COUNTER_LIFETIME_SECONDS, SPEND_COUNTER_PREFIX } from './constants';
import { DAILY_APP_LIMIT_MESSAGE, DAILY_KEY_LIMIT_MESSAGE } from './constants';
import { MINUTE_APP_LIMIT_MESSAGE, UNPRICED_MODEL_MESSAGE } from './constants';
import { describeFailure } from './responses';

import type { MeteredRequest, TokenUsage, UsageOutcome } from '@fiducy/providers';
import type { GatewayResult, RegisteredApp, SpendCharge, SpendCounter } from './types';
import type { SpendReservation, SpendScope } from './types';

function listSpendScopes(app: RegisteredApp, keyID: string, now: Date): SpendScope[] {
  const limits = app.spendLimits ?? {};
  const day = now.toISOString().slice(0, 10);
  const minute = now.toISOString().slice(0, 16);
  const scopes: SpendScope[] = [
    {
      counterID: `${SPEND_COUNTER_PREFIX}key:${keyID}:${day}`,
      dollarLimit: limits.dailyDollarLimitPerKey,
      lifetimeSeconds: DAY_COUNTER_LIFETIME_SECONDS,
      limitMessage: DAILY_KEY_LIMIT_MESSAGE
    },
    {
      counterID: `${SPEND_COUNTER_PREFIX}app:${app.appID}:${day}`,
      dollarLimit: limits.dailyDollarLimitPerApp,
      lifetimeSeconds: DAY_COUNTER_LIFETIME_SECONDS,
      limitMessage: DAILY_APP_LIMIT_MESSAGE
    },
    {
      counterID: `${SPEND_COUNTER_PREFIX}app:${app.appID}:${minute}`,
      dollarLimit: limits.minuteDollarLimitPerApp,
      lifetimeSeconds: MINUTE_COUNTER_LIFETIME_SECONDS,
      limitMessage: MINUTE_APP_LIMIT_MESSAGE
    }
  ];
  return scopes.filter((scope) => typeof scope.dollarLimit === 'number');
}

function toCharge(scope: SpendScope, amount: number, now: Date): SpendCharge {
  return {
    counterID: scope.counterID,
    amount,
    limit: Math.round((scope.dollarLimit ?? 0) * MICRODOLLARS_PER_DOLLAR),
    expiresAt: Math.floor(now.getTime() / 1000) + scope.lifetimeSeconds
  };
}

function estimateWorstCase(metered: MeteredRequest) {
  return {
    inputTokens: metered.estimatedInputTokens,
    outputTokens: metered.outputTokenCeiling * metered.responseCount
  };
}

export async function reserveSpend(
  app: RegisteredApp,
  keyID: string,
  metered: MeteredRequest,
  spendCounter: SpendCounter,
  now = new Date()
): Promise<GatewayResult<SpendReservation>> {
  const price = findModelPrice(metered.model);
  if (!price) return fail(describeFailure(403, UNPRICED_MODEL_MESSAGE));
  const reservedAmount = estimateCostInMicrodollars(price, estimateWorstCase(metered));
  const scopes = listSpendScopes(app, keyID, now);
  const charges = scopes.map((scope) => toCharge(scope, reservedAmount, now));
  const reserved = await spendCounter.reserveSpend(charges);
  if (!reserved.ok) {
    const message = scopes[reserved.error]?.limitMessage ?? 'A spend limit was reached';
    return fail(describeFailure(429, message));
  }
  return succeed({ charges, reservedAmount, price });
}

function settleAmount(reservation: SpendReservation, usage: TokenUsage, outcome: UsageOutcome) {
  const actualAmount = estimateCostInMicrodollars(reservation.price, usage);
  const hasUsage = usage.inputTokens + usage.outputTokens > 0;
  if (outcome === 'complete' && hasUsage) return actualAmount;
  return Math.max(actualAmount, reservation.reservedAmount);
}

export async function settleSpend(
  reservation: SpendReservation,
  usage: TokenUsage,
  outcome: UsageOutcome,
  spendCounter: SpendCounter
): Promise<void> {
  const difference = settleAmount(reservation, usage, outcome) - reservation.reservedAmount;
  if (difference === 0 || reservation.charges.length === 0) return;
  const adjustments = reservation.charges.map((charge) => ({ ...charge, amount: difference }));
  await spendCounter.adjustSpend(adjustments);
}

export async function refundSpend(
  reservation: SpendReservation,
  spendCounter: SpendCounter
): Promise<void> {
  if (reservation.reservedAmount === 0 || reservation.charges.length === 0) return;
  const refunds = reservation.charges.map((charge) => ({
    ...charge,
    amount: -reservation.reservedAmount
  }));
  await spendCounter.adjustSpend(refunds);
}
