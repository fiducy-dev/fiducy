import { CHARACTERS_PER_ESTIMATED_TOKEN, GEMINI_MODEL_PATTERN } from './constants.ts';
import { MAXIMUM_ESTIMATED_INPUT_TOKENS, METERED_ENDPOINTS } from './constants.ts';
import { fail, succeed } from './result.ts';
import { isRecord, parseJSON } from './usage.ts';

import type { Result } from '@fiducy/core';
import type { JSONObject, MeteredEndpoint, MeteredRequest } from './types.ts';
import type { MeterRequestError, MeterRequestInput, ProviderName } from './types.ts';

function readPathname(path: string): string {
  return new URL(path, 'http://gateway.invalid').pathname;
}

function findMeteredEndpoint(provider: ProviderName, pathname: string) {
  return METERED_ENDPOINTS.find(
    (endpoint) => endpoint.provider === provider && endpoint.pathPattern.test(pathname)
  );
}

function readModel(provider: ProviderName, pathname: string, body: JSONObject): string {
  if (provider === 'gemini') return GEMINI_MODEL_PATTERN.exec(pathname)?.[1] ?? '';
  return typeof body.model === 'string' ? body.model : '';
}

function readOutputLimitTarget(endpoint: MeteredEndpoint, body: JSONObject): JSONObject | null {
  if (endpoint.outputLimitStyle !== 'gemini') return body;
  body.generationConfig ??= {};
  return isRecord(body.generationConfig) ? body.generationConfig : null;
}

function clampOutputLimit(target: JSONObject, endpoint: MeteredEndpoint, maximum: number): number {
  const presentFields = endpoint.clampedFields.filter((field) => typeof target[field] === 'number');
  if (presentFields.length === 0) {
    target[endpoint.outputLimitField] = maximum;
    return maximum;
  }
  for (const field of presentFields) target[field] = Math.min(Number(target[field]), maximum);
  return Math.max(...presentFields.map((field) => Number(target[field])));
}

function readResponseCount(body: JSONObject, outputLimitTarget: JSONObject): number {
  const requested = body.n ?? outputLimitTarget.candidateCount;
  return Number.isInteger(requested) && Number(requested) > 1 ? Number(requested) : 1;
}

function requestStreamUsage(endpoint: MeteredEndpoint, body: JSONObject) {
  if (!endpoint.requestsStreamUsage || body.stream !== true) return;
  const streamOptions = isRecord(body.stream_options) ? body.stream_options : {};
  body.stream_options = { ...streamOptions, include_usage: true };
}

function estimateInputTokens(body: string): number {
  const estimate = Math.ceil(body.length / CHARACTERS_PER_ESTIMATED_TOKEN);
  return Math.min(estimate, MAXIMUM_ESTIMATED_INPUT_TOKENS);
}

export function meterRequest({
  provider,
  path,
  body,
  maximumOutputTokens
}: MeterRequestInput): Result<MeteredRequest, MeterRequestError> {
  const pathname = readPathname(path);
  const endpoint = findMeteredEndpoint(provider, pathname);
  if (!endpoint) return fail('endpoint_not_metered');
  const parsedBody = parseJSON(body);
  if (!isRecord(parsedBody) || Array.isArray(parsedBody)) return fail('invalid_body');
  const outputLimitTarget = readOutputLimitTarget(endpoint, parsedBody);
  if (!outputLimitTarget) return fail('invalid_body');

  const outputTokenCeiling =
    endpoint.outputLimitStyle === 'none'
      ? 0
      : clampOutputLimit(outputLimitTarget, endpoint, maximumOutputTokens);
  requestStreamUsage(endpoint, parsedBody);
  return succeed({
    body: JSON.stringify(parsedBody),
    model: readModel(provider, pathname, parsedBody),
    estimatedInputTokens: estimateInputTokens(body),
    outputTokenCeiling,
    responseCount: readResponseCount(parsedBody, outputLimitTarget)
  });
}
