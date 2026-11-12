import { createLocalKeyWrapper } from '@fiducy/core';
import { createProviderRegistry } from '@fiducy/providers';
import { startMockProvider } from '@fiducy/testing';

import {
  createMemoryAppDirectory,
  createMemoryKeyStore,
  createMemoryUsageLedger
} from '../src/memoryStores';
import { createGateway } from '../src/router';

import type { AppRegistration, RateLimiter, SpendCounter } from '../src/types';
import type { StoreKeyResponseBody } from './types';

export const CHAT_APP: AppRegistration = {
  appID: 'app_chatforge',
  name: 'Chatforge',
  appSecret: 'app_sk_chatforge_9Vx2Lr7Tn4Wd6Hc3',
  monthlyRequestLimitPerKey: 3,
  allowedOrigins: ['https://chatforge.example']
};

export const CONTROL_PLANE_TOKEN = 'gateway_token_harness_3Kd8Pz1Qw6';

export const DESK_APP: AppRegistration = {
  appID: 'app_promptdesk',
  name: 'Promptdesk',
  appSecret: 'app_sk_promptdesk_2Qw8Ym1Kp4Lz5Ub',
  monthlyRequestLimitPerKey: 100,
  allowedOrigins: ['https://promptdesk.example']
};

export async function startGatewayHarness(
  extraApps: AppRegistration[] = [],
  rateLimiter?: RateLimiter,
  spendCounter?: SpendCounter
) {
  const mockProvider = startMockProvider();
  const usageLedger = createMemoryUsageLedger();
  const keyStore = createMemoryKeyStore();
  const gateway = createGateway({
    keyWrapper: createLocalKeyWrapper(crypto.getRandomValues(new Uint8Array(32))),
    keyStore,
    appDirectory: await createMemoryAppDirectory([CHAT_APP, DESK_APP, ...extraApps]),
    usageLedger,
    providerRegistry: createProviderRegistry({
      openai: mockProvider.baseURL,
      anthropic: mockProvider.baseURL,
      gemini: mockProvider.baseURL,
      openrouter: mockProvider.baseURL
    }),
    controlPlaneToken: CONTROL_PLANE_TOKEN,
    rateLimiter,
    spendCounter
  });
  const server = Bun.serve({ port: 0, fetch: gateway });
  const gatewayURL = `http://localhost:${server.port}`;

  const storeKey = async (
    appID: string,
    apiKey: string,
    extraHeaders: Record<string, string> = {}
  ) => {
    const response = await fetch(`${gatewayURL}/keys`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...extraHeaders },
      body: JSON.stringify({ appID, apiKey })
    });
    const body = (await response.json()) as StoreKeyResponseBody;
    return { status: response.status, body, retryAfter: response.headers.get('retry-after') };
  };

  const stop = () => {
    server.stop(true);
    mockProvider.server.stop(true);
  };

  return { gatewayURL, mockProvider, usageLedger, keyStore, storeKey, stop };
}
