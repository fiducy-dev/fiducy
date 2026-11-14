import { fail, succeed } from '@fiducy/core';
import { meterRequest } from '@fiducy/providers';

import { DEFAULT_MAXIMUM_OUTPUT_TOKENS, UNMETERED_METHODS } from './constants';
import { describeFailure } from './responses';
import { refundSpend, reserveSpend, settleSpend } from './spendLimits';

import type { MeterRequestError, MeteredRequest, ProviderName } from '@fiducy/providers';
import type { GatewayFailure, GatewayResult, MeteredCall, RegisteredApp } from './types';
import type { ResolvedGatewayDependencies, SpendLimits, SpendReservation } from './types';

function describeMeterFailure(error: MeterRequestError): GatewayFailure {
  if (error === 'invalid_body')
    return describeFailure(400, 'Send a JSON object as the request body');
  return describeFailure(403, 'This endpoint is not available while spend limits are on');
}

function logInBackground(task: Promise<void>, action: string) {
  task.catch((error: unknown) => {
    console.error(`Could not ${action}: ${error instanceof Error ? error.message : String(error)}`);
  });
}

function acquireSlot(
  limits: SpendLimits,
  keyID: string,
  dependencies: ResolvedGatewayDependencies
) {
  const limit = limits.concurrentRequestLimitPerKey;
  if (limit === undefined) return { isAllowed: true, release: () => {} };
  const isAllowed = dependencies.concurrencyTracker.acquireSlot(keyID, limit);
  const release = () => dependencies.concurrencyTracker.releaseSlot(keyID);
  return { isAllowed, release };
}

function createMeteredCall(
  body: string,
  reservation: SpendReservation,
  releaseSlot: () => void,
  { spendCounter }: ResolvedGatewayDependencies
): MeteredCall {
  let hasFinished = false;
  const finish = (task: () => Promise<void>, action: string) => {
    if (hasFinished) return;
    hasFinished = true;
    releaseSlot();
    logInBackground(task(), action);
  };
  return {
    body,
    settle: (usage, outcome) =>
      finish(() => settleSpend(reservation, usage, outcome, spendCounter), 'settle spend'),
    refund: () => finish(() => refundSpend(reservation, spendCounter), 'refund spend')
  };
}

async function reserveWithSlot(
  app: RegisteredApp,
  keyID: string,
  metered: MeteredRequest,
  dependencies: ResolvedGatewayDependencies
): Promise<GatewayResult<MeteredCall>> {
  const slot = acquireSlot(app.spendLimits ?? {}, keyID, dependencies);
  if (!slot.isAllowed)
    return fail(describeFailure(429, 'This key has too many requests running at once'));
  try {
    const reservation = await reserveSpend(app, keyID, metered, dependencies.spendCounter);
    if (!reservation.ok) {
      slot.release();
      return reservation;
    }
    return succeed(createMeteredCall(metered.body, reservation.value, slot.release, dependencies));
  } catch (error) {
    slot.release();
    throw error;
  }
}

function hasSpendLimits(limits: SpendLimits | undefined): limits is SpendLimits {
  return Object.values(limits ?? {}).some((limit) => typeof limit === 'number');
}

export async function startMeteredCall(
  request: Request,
  provider: ProviderName,
  path: string,
  app: RegisteredApp,
  keyID: string,
  dependencies: ResolvedGatewayDependencies
): Promise<GatewayResult<MeteredCall | null>> {
  const limits = app.spendLimits;
  if (!hasSpendLimits(limits) || UNMETERED_METHODS.includes(request.method)) return succeed(null);
  const maximumOutputTokens = limits.maximumOutputTokens ?? DEFAULT_MAXIMUM_OUTPUT_TOKENS;
  const metered = meterRequest({ provider, path, body: await request.text(), maximumOutputTokens });
  if (!metered.ok) return fail(describeMeterFailure(metered.error));
  return reserveWithSlot(app, keyID, metered.value, dependencies);
}
