import { buildUpstreamRequest, isPathAllowed, relayResponse } from '@fiducy/providers';

import { authenticateApp, refuseFrozenApp } from '../authentication';
import { enforceRequestLimit, resolveApiKey } from '../resolveKey';
import { describeFailure, respondWithFailure } from '../responses';
import { startMeteredCall } from '../spendGuard';

import type { ProviderName, TokenUsage, UsageOutcome } from '@fiducy/providers';
import type { GatewayDependencies, MeteredCall, ResolvedGatewayDependencies } from '../types';
import type { UsageEvent } from '../types';

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function recordUsageInBackground(dependencies: GatewayDependencies, event: UsageEvent) {
  dependencies.usageLedger.recordUsage(event).catch((error: unknown) => {
    console.error(`Failed to record usage for key ${event.keyID}: ${normalizeError(error)}`);
  });
}

async function fetchUpstream(upstreamRequest: Request) {
  try {
    return await fetch(upstreamRequest);
  } catch (error) {
    console.error(`Provider request failed: ${normalizeError(error)}`);
    return null;
  }
}

async function relayWithSettlement(
  upstreamResponse: Response,
  apiKey: string,
  meteredCall: MeteredCall | null,
  onUsage: (usage: TokenUsage, outcome: UsageOutcome) => void
) {
  if (!upstreamResponse.ok) meteredCall?.refund();
  try {
    return await relayResponse({ upstreamResponse, apiKey, onUsage });
  } catch (error) {
    meteredCall?.settle({ inputTokens: 0, outputTokens: 0 }, 'interrupted');
    throw error;
  }
}

export async function proxyProviderRequest(
  request: Request,
  providerName: ProviderName,
  path: string,
  dependencies: ResolvedGatewayDependencies
) {
  const provider = dependencies.providerRegistry[providerName];
  if (!isPathAllowed(provider, path))
    return respondWithFailure(describeFailure(400, 'This provider path is not allowed'));
  const authenticated = await authenticateApp(dependencies.appDirectory, request.headers);
  const app = authenticated.ok ? refuseFrozenApp(authenticated.value) : authenticated;
  if (!app.ok) return respondWithFailure(app.error);
  const resolved = await resolveApiKey(app.value, request.headers, dependencies);
  if (!resolved.ok) return respondWithFailure(resolved.error);
  const { apiKey, record } = resolved.value;
  const withinLimit = await enforceRequestLimit(app.value, record.keyID, dependencies);
  if (!withinLimit.ok) return respondWithFailure(withinLimit.error);
  const metered = await startMeteredCall(
    request,
    providerName,
    path,
    app.value,
    record.keyID,
    dependencies
  );
  if (!metered.ok) return respondWithFailure(metered.error);
  const meteredCall = metered.value;

  const upstreamRequest = buildUpstreamRequest({
    provider,
    path,
    method: request.method,
    headers: request.headers,
    body: meteredCall?.body ?? request.body,
    apiKey
  });
  if (!upstreamRequest.ok) {
    meteredCall?.refund();
    return respondWithFailure(describeFailure(400, 'This provider path is not allowed'));
  }

  const upstreamResponse = await fetchUpstream(upstreamRequest.value);
  if (!upstreamResponse) {
    meteredCall?.refund();
    return respondWithFailure(describeFailure(502, 'The provider could not be reached'));
  }

  const onUsage = (usage: TokenUsage, outcome: UsageOutcome) => {
    meteredCall?.settle(usage, outcome);
    recordUsageInBackground(dependencies, {
      appID: record.appID,
      keyID: record.keyID,
      provider: providerName,
      usage,
      recordedAt: new Date()
    });
  };
  return relayWithSettlement(upstreamResponse, apiKey, meteredCall, onUsage);
}
