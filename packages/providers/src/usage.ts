import type { TokenUsage } from './types.ts';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readNumber(source: unknown, keys: string[]): number {
  if (!isRecord(source)) return 0;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number') return value;
  }
  return 0;
}

function findUsageObject(payload: Record<string, unknown>): unknown {
  const wrapper = payload.message ?? payload.response;
  if (isRecord(wrapper) && isRecord(wrapper.usage)) return wrapper.usage;
  return payload.usage ?? payload.usageMetadata;
}

export function readUsage(payload: unknown): TokenUsage {
  if (!isRecord(payload)) return { inputTokens: 0, outputTokens: 0 };
  const usage = findUsageObject(payload);
  const cacheTokens =
    readNumber(usage, ['cache_creation_input_tokens']) +
    readNumber(usage, ['cache_read_input_tokens']);
  return {
    inputTokens:
      readNumber(usage, ['prompt_tokens', 'input_tokens', 'promptTokenCount']) + cacheTokens,
    outputTokens:
      readNumber(usage, ['completion_tokens', 'output_tokens', 'candidatesTokenCount']) +
      readNumber(usage, ['thoughtsTokenCount'])
  };
}

export function mergeUsage(current: TokenUsage, next: TokenUsage): TokenUsage {
  return {
    inputTokens: Math.max(current.inputTokens, next.inputTokens),
    outputTokens: Math.max(current.outputTokens, next.outputTokens)
  };
}

export function parseJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
