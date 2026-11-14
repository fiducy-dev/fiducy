import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import { createLocalKeyWrapper } from '@fiducy/core';
import { createProviderRegistry } from '@fiducy/providers';
import { SAMPLE_API_KEY, startMockProvider } from '@fiducy/testing';
import { createMemoryAppDirectory, createMemoryKeyStore } from '../src/memoryStores';
import { createMemoryUsageLedger } from '../src/memoryStores';
import { createGateway } from '../src/router';

import type { AppDirectory, AppRegistration, RegisteredApp } from '../src/types';

const TOLLGATE_APP: AppRegistration = {
  appID: 'app_tollgate',
  name: 'Tollgate',
  appSecret: 'app_sk_tollgate_4Rm9Xc2Vb6Nq1Ls',
  monthlyRequestLimitPerKey: 100,
  allowedOrigins: ['https://tollgate.example'],
  allowKeyImport: true
};
const CONTROL_PLANE_TOKEN = 'gateway_token_freeze_7Hd2Lq9Wz4';

const mockProvider = startMockProvider();
const freezeState = { isFrozen: false, refreshCount: 0 };
let gatewayURL: string;
let stopGateway: () => void;
let handle: string;

function withFreezeState(app: RegisteredApp | null): RegisteredApp | null {
  return app ? { ...app, isFrozen: freezeState.isFrozen } : null;
}

async function createSwitchableDirectory(): Promise<AppDirectory> {
  const directory = await createMemoryAppDirectory([TOLLGATE_APP]);
  return {
    findApp: async (appID) => withFreezeState(await directory.findApp(appID)),
    findAppBySecret: async (appSecret) =>
      withFreezeState(await directory.findAppBySecret(appSecret)),
    refresh: async () => {
      freezeState.refreshCount += 1;
    }
  };
}

beforeAll(async () => {
  const gateway = createGateway({
    keyWrapper: createLocalKeyWrapper(crypto.getRandomValues(new Uint8Array(32))),
    keyStore: createMemoryKeyStore(),
    appDirectory: await createSwitchableDirectory(),
    usageLedger: createMemoryUsageLedger(),
    providerRegistry: createProviderRegistry({ openai: mockProvider.baseURL }),
    controlPlaneToken: CONTROL_PLANE_TOKEN
  });
  const server = Bun.serve({ port: 0, fetch: gateway });
  gatewayURL = `http://localhost:${server.port}`;
  stopGateway = () => server.stop(true);
  handle = (await storeKey()).body.data.handle;
  freezeState.isFrozen = true;
});

afterAll(() => {
  stopGateway();
  mockProvider.server.stop(true);
});

async function storeKey() {
  const response = await fetch(`${gatewayURL}/keys`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ appID: TOLLGATE_APP.appID, apiKey: SAMPLE_API_KEY })
  });
  return { status: response.status, body: (await response.json()) as { data: { handle: string } } };
}

function callAsApp(path: string, init: RequestInit = {}) {
  return fetch(`${gatewayURL}${path}`, {
    method: 'POST',
    ...init,
    headers: {
      authorization: `Bearer ${TOLLGATE_APP.appSecret}`,
      'x-key-handle': handle,
      ...init.headers
    }
  });
}

describe('a frozen app', () => {
  it('cannot call a provider, and can again once unfrozen', async () => {
    const body = JSON.stringify({ model: 'gpt-4o-mini', messages: [] });
    const refused = await callAsApp('/openai/v1/chat/completions', { body });
    expect(refused.status).toBe(403);
    expect(((await refused.json()) as { message: string }).message).toContain('frozen');
    freezeState.isFrozen = false;
    expect((await callAsApp('/openai/v1/chat/completions', { body })).status).toBe(200);
    freezeState.isFrozen = true;
  });

  it('cannot take new keys from the widget or an import', async () => {
    expect((await storeKey()).status).toBe(403);
    const imported = await callAsApp('/keys/import', {
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ apiKeys: [SAMPLE_API_KEY] })
    });
    expect(imported.status).toBe(403);
  });

  it('can still revoke a key', async () => {
    const keyID = handle.slice(3, 25);
    const response = await callAsApp(`/keys/${keyID}`, { method: 'DELETE' });
    expect(response.status).toBe(200);
  });
});

describe('refreshing app configs on demand', () => {
  it('only answers the control plane', async () => {
    const refused = await fetch(`${gatewayURL}/apps/refresh`, {
      method: 'POST',
      headers: { authorization: `Bearer ${TOLLGATE_APP.appSecret}` }
    });
    expect(refused.status).toBe(401);
    const accepted = await fetch(`${gatewayURL}/apps/refresh`, {
      method: 'POST',
      headers: { authorization: `Bearer ${CONTROL_PLANE_TOKEN}` }
    });
    expect(accepted.status).toBe(200);
    expect(freezeState.refreshCount).toBe(1);
  });
});
