import { buildUpstreamRequest, isPathAllowed, relayResponse } from '@fiducy/providers';

import { authenticateApp } from '../authentication';
import { enforceRequestLimit, resolveApiKey } from '../resolveKey';
import { describeFailure, respondWithFailure } from '../responses';

import type { ProviderName, TokenUsage } from '@fiducy/providers';
import type { GatewayDependencies, UsageEvent } from '../types';

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

export async function proxyProviderRequest(
  request: Request,
  providerName: ProviderName,
  path: string,
  dependencies: GatewayDependencies
) {
  const provider = dependencies.providerRegistry[providerName];
  if (!isPathAllowed(provider, path))
    return respondWithFailure(describeFailure(400, 'This provider path is not allowed'));
  const app = await authenticateApp(dependencies.appDirectory, request.headers);
  if (!app.ok) return respondWithFailure(app.error);
  const resolved = await resolveApiKey(app.value, request.headers, dependencies);
  if (!resolved.ok) return respondWithFailure(resolved.error);
  const { apiKey, record } = resolved.value;
  const withinLimit = await enforceRequestLimit(app.value, record.keyID, dependencies);
  if (!withinLimit.ok) return respondWithFailure(withinLimit.error);

  const upstreamRequest = buildUpstreamRequest({
    provider,
    path,
    method: request.method,
    headers: request.headers,
    body: request.body,
    apiKey
  });
  if (!upstreamRequest.ok)
    return respondWithFailure(describeFailure(400, 'This provider path is not allowed'));

  const upstreamResponse = await fetchUpstream(upstreamRequest.value);
  if (!upstreamResponse)
    return respondWithFailure(describeFailure(502, 'The provider could not be reached'));

  const onUsage = (usage: TokenUsage) =>
    recordUsageInBackground(dependencies, {
      appID: record.appID,
      keyID: record.keyID,
      provider: providerName,
      usage,
      recordedAt: new Date()
    });
  return relayResponse({ upstreamResponse, apiKey, onUsage });
}
