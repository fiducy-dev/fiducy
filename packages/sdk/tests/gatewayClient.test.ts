import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, streamText } from 'ai';

import { SAMPLE_API_KEY, SAMPLE_HANDLE } from '@fiducy/testing';
import { CHAT_APP, DESK_APP, startGatewayHarness } from '../../../apps/gateway/tests/harness';
import { createGatewayClient, createProviderSettings } from '../src/gatewayClient';

let harness: Awaited<ReturnType<typeof startGatewayHarness>>;

beforeAll(async () => {
  harness = await startGatewayHarness();
});

afterAll(() => harness.stop());

async function storeHandle(appID: string) {
  const stored = await harness.storeKey(appID, SAMPLE_API_KEY);
  return stored.body.data.handle;
}

function createClient(appSecret = CHAT_APP.appSecret) {
  return createGatewayClient({ gatewayURL: `${harness.gatewayURL}/`, appSecret });
}

describe('provider settings for the AI SDK', () => {
  it('points each provider at its gateway path with the app secret and handle', () => {
    const settings = createClient().providerSettings('anthropic', SAMPLE_HANDLE);
    expect(settings).toEqual({
      baseURL: `${harness.gatewayURL}/anthropic/v1`,
      apiKey: CHAT_APP.appSecret,
      headers: { 'x-key-handle': SAMPLE_HANDLE }
    });
  });

  it('generates text with the OpenAI provider and the real key swapped in', async () => {
    const handle = await storeHandle(DESK_APP.appID);
    const openai = createOpenAI(
      createClient(DESK_APP.appSecret).providerSettings('openai', handle)
    );
    const result = await generateText({ model: openai.chat('gpt-4o-mini'), prompt: 'Hi' });
    expect(result.text).toBe('Hello');
    const forwarded = harness.mockProvider.recordedRequests.at(-1);
    expect(forwarded?.headers.get('authorization')).toBe(`Bearer ${SAMPLE_API_KEY}`);
    expect(forwarded?.headers.get('x-key-handle')).toBeNull();
  });

  it('streams text with the Anthropic provider', async () => {
    const handle = await storeHandle(DESK_APP.appID);
    const settings = createClient(DESK_APP.appSecret).providerSettings('anthropic', handle);
    const anthropic = createAnthropic(settings);
    const result = streamText({ model: anthropic('claude-sonnet-4-5'), prompt: 'Hi' });
    expect(await result.text).toBe('Hi there');
    const forwarded = harness.mockProvider.recordedRequests.at(-1);
    expect(forwarded?.headers.get('x-api-key')).toBe(SAMPLE_API_KEY);
  });

  it('generates and streams text with the Google provider for Gemini', async () => {
    const handle = await storeHandle(DESK_APP.appID);
    const settings = createClient(DESK_APP.appSecret).providerSettings('gemini', handle);
    const google = createGoogleGenerativeAI(settings);
    const result = await generateText({ model: google('gemini-2.5-flash'), prompt: 'Hi' });
    expect(result.text).toBe('Hello');
    const forwarded = harness.mockProvider.recordedRequests.at(-1);
    expect(forwarded?.path).toBe('/v1beta/models/gemini-2.5-flash:generateContent');
    expect(forwarded?.headers.get('x-goog-api-key')).toBe(SAMPLE_API_KEY);
    const streamed = streamText({ model: google('gemini-2.5-flash'), prompt: 'Hi' });
    expect(await streamed.text).toBe('Hi from Gemini');
  });

  it('generates text through OpenRouter with an OpenAI-compatible client', async () => {
    const handle = await storeHandle(DESK_APP.appID);
    const settings = createClient(DESK_APP.appSecret).providerSettings('openrouter', handle);
    const openrouter = createOpenAI(settings);
    const result = await generateText({
      model: openrouter.chat('openai/gpt-4o-mini'),
      prompt: 'Hi'
    });
    expect(result.text).toBe('Hello');
    const forwarded = harness.mockProvider.recordedRequests.at(-1);
    expect(forwarded?.path).toBe('/api/v1/chat/completions');
    expect(forwarded?.headers.get('authorization')).toBe(`Bearer ${SAMPLE_API_KEY}`);
  });

  it('generates text with the OpenRouter provider package', async () => {
    const handle = await storeHandle(DESK_APP.appID);
    const settings = createClient(DESK_APP.appSecret).providerSettings('openrouter', handle);
    const openrouter = createOpenRouter(settings);
    const result = await generateText({ model: openrouter('openai/gpt-4o-mini'), prompt: 'Hi' });
    expect(result.text).toBe('Hello');
    const forwarded = harness.mockProvider.recordedRequests.at(-1);
    expect(forwarded?.headers.get('authorization')).toBe(`Bearer ${SAMPLE_API_KEY}`);
  });
});

describe('managing keys from the app server', () => {
  it('revokes a key so later calls fail', async () => {
    const handle = await storeHandle(CHAT_APP.appID);
    const client = createClient();
    const revoked = await client.revokeKey(handle);
    expect(revoked.ok).toBe(true);
    const again = await client.revokeKey(handle);
    expect(again).toEqual({
      ok: false,
      error: { status: 404, message: 'No key found with this ID' }
    });
  });

  it('refuses malformed handles without calling the gateway', async () => {
    const client = createGatewayClient({
      gatewayURL: harness.gatewayURL,
      appSecret: CHAT_APP.appSecret,
      fetch: () => Promise.reject(new Error('should not be called'))
    });
    expect((await client.revokeKey('kh_bad')).ok).toBe(false);
  });

  it('reports an unreachable gateway as a failure', async () => {
    const client = createGatewayClient({ gatewayURL: 'http://localhost:1', appSecret: 'secret' });
    const result = await client.revokeKey(SAMPLE_HANDLE);
    expect(result.ok ? null : result.error.status).toBe(0);
  });
});

describe('running in a browser', () => {
  it('refuses to take the app secret', () => {
    const browserGlobals = globalThis as { window?: unknown; document?: unknown };
    browserGlobals.window = {};
    browserGlobals.document = {};
    try {
      expect(() => createClient()).toThrow('must run on your server');
      expect(() =>
        createProviderSettings(harness.gatewayURL, CHAT_APP.appSecret, 'openai', SAMPLE_HANDLE)
      ).toThrow('must run on your server');
    } finally {
      browserGlobals.window = undefined;
      browserGlobals.document = undefined;
    }
  });
});
