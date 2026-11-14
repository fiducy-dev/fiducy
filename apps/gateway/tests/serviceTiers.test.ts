import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import { SAMPLE_API_KEY } from '@fiducy/testing';
import { startGatewayHarness } from './harness';

import type { AppRegistration } from '../src/types';

const METERED_APP: AppRegistration = {
  appID: 'app_sluice',
  name: 'Sluice',
  appSecret: 'app_sk_sluice_5Gm8Qt2Wx7Ld3Nv',
  monthlyRequestLimitPerKey: 1000,
  allowedOrigins: ['https://sluice.example'],
  spendLimits: { dailyDollarLimitPerKey: 5 }
};

let harness: Awaited<ReturnType<typeof startGatewayHarness>>;
let handle: string;

beforeAll(async () => {
  harness = await startGatewayHarness([METERED_APP]);
  handle = (await harness.storeKey(METERED_APP.appID, SAMPLE_API_KEY)).body.data.handle;
});

afterAll(() => harness.stop());

function callProvider(path: string, body: object) {
  return fetch(`${harness.gatewayURL}${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${METERED_APP.appSecret}`,
      'x-api-key': METERED_APP.appSecret,
      'x-key-handle': handle,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}

describe('paid speed tiers on an app with spend limits', () => {
  it('blocks OpenAI fast before the call', async () => {
    const callsBefore = harness.mockProvider.recordedRequests.length;
    const response = await callProvider('/openai/v1/chat/completions', {
      model: 'gpt-4o-mini',
      service_tier: 'fast',
      messages: [{ role: 'user', content: 'Hi' }]
    });
    expect(response.status).toBe(403);
    expect(harness.mockProvider.recordedRequests.length).toBe(callsBefore);
  });

  it('blocks Anthropic fast mode before the call', async () => {
    const callsBefore = harness.mockProvider.recordedRequests.length;
    const response = await callProvider('/anthropic/v1/messages', {
      model: 'claude-opus-5-5',
      speed: 'fast',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Hi' }]
    });
    expect(response.status).toBe(403);
    expect(harness.mockProvider.recordedRequests.length).toBe(callsBefore);
  });

  it('sends OpenAI calls at the standard tier', async () => {
    const response = await callProvider('/openai/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hi' }]
    });
    expect(response.status).toBe(200);
    const forwarded = JSON.parse(harness.mockProvider.recordedRequests.at(-1)?.body ?? '{}');
    expect(forwarded.service_tier).toBe('default');
  });
});
