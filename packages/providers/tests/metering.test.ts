import { describe, expect, it } from 'bun:test';

import { estimateCostInMicrodollars, findModelPrice } from '../src';
import { meterRequest } from '../src';
import { observeUsageInBody } from '../src/stream';
import { readUsage } from '../src/usage';

import type { TokenUsage, UsageOutcome } from '../src';

function meterOpenAIChat(body: object, maximumOutputTokens = 1000) {
  return meterRequest({
    provider: 'openai',
    path: '/v1/chat/completions',
    body: JSON.stringify(body),
    maximumOutputTokens
  });
}

function readMeteredBody(result: ReturnType<typeof meterRequest>) {
  if (!result.ok) throw new Error(result.error);
  return JSON.parse(result.value.body);
}

describe('capping how much one request can generate', () => {
  it('adds an output limit when the request has none', () => {
    const metered = meterOpenAIChat({ model: 'gpt-4o-mini', messages: [] });
    expect(readMeteredBody(metered).max_completion_tokens).toBe(1000);
    expect(metered.ok && metered.value.outputTokenCeiling).toBe(1000);
  });

  it('lowers a limit above the ceiling and keeps a smaller one', () => {
    const lowered = meterOpenAIChat({ model: 'gpt-4o', max_tokens: 50000 });
    expect(readMeteredBody(lowered).max_tokens).toBe(1000);
    const kept = meterOpenAIChat({ model: 'gpt-4o', max_completion_tokens: 200 });
    expect(readMeteredBody(kept).max_completion_tokens).toBe(200);
    expect(kept.ok && kept.value.outputTokenCeiling).toBe(200);
  });

  it('uses each provider field: Responses, Anthropic and Gemini', () => {
    const responses = meterRequest({
      provider: 'openai',
      path: '/v1/responses',
      body: JSON.stringify({ model: 'gpt-5', input: 'Hi' }),
      maximumOutputTokens: 500
    });
    expect(readMeteredBody(responses).max_output_tokens).toBe(500);
    const anthropic = meterRequest({
      provider: 'anthropic',
      path: '/v1/messages',
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 64000 }),
      maximumOutputTokens: 500
    });
    expect(readMeteredBody(anthropic).max_tokens).toBe(500);
    const gemini = meterRequest({
      provider: 'gemini',
      path: '/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse',
      body: JSON.stringify({ contents: [], generationConfig: { candidateCount: 2 } }),
      maximumOutputTokens: 500
    });
    expect(readMeteredBody(gemini).generationConfig.maxOutputTokens).toBe(500);
    expect(gemini.ok && gemini.value.model).toBe('gemini-2.5-flash');
    expect(gemini.ok && gemini.value.responseCount).toBe(2);
  });

  it('asks OpenAI to report usage at the end of a stream', () => {
    const metered = meterOpenAIChat({ model: 'gpt-4o', stream: true, stream_options: {} });
    expect(readMeteredBody(metered).stream_options).toEqual({ include_usage: true });
  });

  it('refuses endpoints it cannot price and bodies that are not JSON objects', () => {
    const files = meterRequest({
      provider: 'openai',
      path: '/v1/files',
      body: '{}',
      maximumOutputTokens: 500
    });
    expect(files.ok ? null : files.error).toBe('endpoint_not_metered');
    const invalid = meterOpenAIChat([] as unknown as object);
    expect(invalid.ok ? null : invalid.error).toBe('invalid_body');
  });
});

describe('pricing a request', () => {
  it('matches the most specific model name, also behind an OpenRouter vendor prefix', () => {
    expect(findModelPrice('gpt-4o-mini-2024-07-18')?.model).toBe('gpt-4o-mini');
    expect(findModelPrice('openai/gpt-4o')?.model).toBe('gpt-4o');
    expect(findModelPrice('qwen/qwen3.8-flash:free')?.model).toBe('qwen3-8-flash');
  });

  it('reads dots and dashes in version numbers as the same name', () => {
    expect(findModelPrice('claude-opus-4-1-20250805')?.model).toBe('claude-opus-4-1');
    expect(findModelPrice('anthropic/claude-sonnet-4.5')?.model).toBe('claude-sonnet-4-5');
  });

  it('accepts dated snapshots and preview tags but not a different model', () => {
    expect(findModelPrice('gemini-2.5-flash-preview-09-2025')?.model).toBe('gemini-2-5-flash');
    expect(findModelPrice('claude-3-7-sonnet-latest')?.model).toBe('claude-3-7-sonnet');
    expect(findModelPrice('gpt-5.6-sol')).toBeNull();
    expect(findModelPrice('gpt-5-turbo-max')).toBeNull();
  });

  it('has no price for a model missing from the table', () => {
    expect(findModelPrice('mystery-model-9')).toBeNull();
    expect(findModelPrice('')).toBeNull();
  });

  it('counts dollars in millionths', () => {
    const price = findModelPrice('gpt-4o');
    if (!price) throw new Error('gpt-4o should have a price');
    const usage = { inputTokens: 1000, outputTokens: 500 };
    expect(estimateCostInMicrodollars(price, usage)).toBe(7500);
  });
});

describe('reading token usage', () => {
  it('counts Anthropic cache tokens and Gemini thinking tokens', () => {
    const anthropic = readUsage({
      usage: { input_tokens: 10, cache_creation_input_tokens: 900, cache_read_input_tokens: 90 }
    });
    expect(anthropic.inputTokens).toBe(1000);
    const gemini = readUsage({
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 7, thoughtsTokenCount: 30 }
    });
    expect(gemini.outputTokens).toBe(37);
  });

  it('reports an interrupted stream once, with what it saw so far', async () => {
    const reports: [TokenUsage, UsageOutcome][] = [];
    const source = new ReadableStream<Uint8Array>({
      start: (controller) => {
        controller.enqueue(new TextEncoder().encode('data: {"usage":{"prompt_tokens":4}}\n\n'));
      }
    });
    const observed = observeUsageInBody(source, (usage, outcome) => reports.push([usage, outcome]));
    const reader = observed.getReader();
    await reader.read();
    await reader.cancel();
    await reader.cancel().catch(() => {});
    expect(reports).toEqual([[{ inputTokens: 4, outputTokens: 0 }, 'interrupted']]);
  });
});
