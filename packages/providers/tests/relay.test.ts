import { afterAll, describe, expect, it } from 'bun:test';

import { SAMPLE_API_KEY, SAMPLE_APP_SECRET, SAMPLE_HANDLE } from '@fiducy/testing';
import { ANTHROPIC_STREAM_CHUNKS, OPENAI_STREAM_CHUNKS, startMockProvider } from '@fiducy/testing';
import { OPENAI_RESPONSES_STREAM_CHUNKS } from '@fiducy/testing';
import { buildUpstreamRequest, createProviderRegistry, relayResponse } from '../src';

import type { ProviderName, TokenUsage } from '../src';

const mockProvider = startMockProvider();
const registry = createProviderRegistry({
  openai: mockProvider.baseURL,
  anthropic: mockProvider.baseURL
});

afterAll(() => mockProvider.server.stop(true));

function buildInboundHeaders(extraHeaders: Record<string, string> = {}): Headers {
  return new Headers({
    authorization: `Bearer ${SAMPLE_APP_SECRET}`,
    'x-key-handle': SAMPLE_HANDLE,
    cookie: 'session=abc',
    'content-type': 'application/json',
    ...extraHeaders
  });
}

async function sendThroughGateway(providerName: ProviderName, path: string, body: object) {
  const usageReports: TokenUsage[] = [];
  const upstreamRequest = buildUpstreamRequest({
    provider: registry[providerName],
    path,
    method: 'POST',
    headers: buildInboundHeaders(),
    body: JSON.stringify(body),
    apiKey: SAMPLE_API_KEY
  });
  if (!upstreamRequest.ok) throw new Error(upstreamRequest.error);
  const upstreamResponse = await fetch(upstreamRequest.value);
  const response = await relayResponse({
    upstreamResponse,
    apiKey: SAMPLE_API_KEY,
    onUsage: (usage) => usageReports.push(usage)
  });
  const responseText = await response.text();
  return { response, responseText, usageReports, recorded: mockProvider.recordedRequests.at(-1) };
}

describe('forwarding a request to the provider', () => {
  it('swaps the app secret for the real OpenAI key and drops private headers', async () => {
    const { recorded } = await sendThroughGateway('openai', '/v1/chat/completions', {
      stream: false
    });
    expect(recorded?.headers.get('authorization')).toBe(`Bearer ${SAMPLE_API_KEY}`);
    expect(recorded?.headers.get('x-key-handle')).toBeNull();
    expect(recorded?.headers.get('cookie')).toBeNull();
    expect(recorded?.headers.get('content-type')).toBe('application/json');
  });

  it('uses x-api-key and a default anthropic-version for Anthropic', async () => {
    const { recorded } = await sendThroughGateway('anthropic', '/v1/messages', { stream: true });
    expect(recorded?.headers.get('x-api-key')).toBe(SAMPLE_API_KEY);
    expect(recorded?.headers.get('authorization')).toBeNull();
    expect(recorded?.headers.get('anthropic-version')).toBe('2023-06-01');
  });

  it('keeps an anthropic-version the app chose', () => {
    const upstreamRequest = buildUpstreamRequest({
      provider: registry.anthropic,
      path: '/v1/messages',
      method: 'POST',
      headers: buildInboundHeaders({ 'anthropic-version': '2024-10-01' }),
      body: '{}',
      apiKey: SAMPLE_API_KEY
    });
    expect(upstreamRequest.ok && upstreamRequest.value.headers.get('anthropic-version')).toBe(
      '2024-10-01'
    );
  });

  it('refuses paths outside the provider API or pointing at another host', () => {
    const blockedPaths = [
      '/v2/models',
      '/v1/../admin',
      '/v1//evil.example/x',
      'https://evil.example/v1/x'
    ];
    for (const path of blockedPaths) {
      const upstreamRequest = buildUpstreamRequest({
        provider: registry.openai,
        path,
        method: 'GET',
        headers: new Headers(),
        body: null,
        apiKey: SAMPLE_API_KEY
      });
      expect(upstreamRequest).toEqual({ ok: false, error: 'path_not_allowed' });
    }
  });
});

describe('relaying the provider response', () => {
  it('drops a Fiducy error header the provider sent, so it cannot wipe stored handles', async () => {
    const upstreamResponse = new Response('{"error":{"message":"nope"}}', {
      status: 404,
      headers: { 'content-type': 'application/json', 'x-fiducy-error': 'key-unavailable' }
    });
    const response = await relayResponse({
      upstreamResponse,
      apiKey: SAMPLE_API_KEY,
      onUsage: () => undefined
    });
    expect(response.headers.get('x-fiducy-error')).toBeNull();
  });

  it('returns a JSON reply unchanged and reports its token usage', async () => {
    const { responseText, usageReports, response } = await sendThroughGateway(
      'openai',
      '/v1/chat/completions',
      {
        stream: false
      }
    );
    expect(JSON.parse(responseText).choices[0].message.content).toBe('Hello');
    expect(usageReports).toEqual([{ inputTokens: 9, outputTokens: 3 }]);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('streams OpenAI events byte for byte and counts usage across split chunks', async () => {
    const { responseText, usageReports } = await sendThroughGateway(
      'openai',
      '/v1/chat/completions',
      {
        stream: true
      }
    );
    expect(responseText).toBe(OPENAI_STREAM_CHUNKS.join(''));
    expect(usageReports).toEqual([{ inputTokens: 41, outputTokens: 17 }]);
  });

  it('counts OpenAI Responses API usage from the response.completed event', async () => {
    const { responseText, usageReports } = await sendThroughGateway('openai', '/v1/responses', {
      stream: true
    });
    expect(responseText).toBe(OPENAI_RESPONSES_STREAM_CHUNKS.join(''));
    expect(usageReports).toEqual([{ inputTokens: 36, outputTokens: 14 }]);
  });

  it('counts Anthropic usage from message_start and message_delta events', async () => {
    const { responseText, usageReports } = await sendThroughGateway('anthropic', '/v1/messages', {
      stream: true
    });
    expect(responseText).toBe(ANTHROPIC_STREAM_CHUNKS.join(''));
    expect(usageReports).toEqual([{ inputTokens: 25, outputTokens: 12 }]);
  });

  it('redacts the key and masked key fragments from provider errors', async () => {
    const { response, responseText } = await sendThroughGateway('openai', '/v1/invalid-key', {});
    expect(response.status).toBe(401);
    expect(responseText).not.toContain(SAMPLE_API_KEY);
    expect(responseText).not.toContain('sk-proj-a81f');
    expect(responseText).toContain('[redacted]');
  });
});
