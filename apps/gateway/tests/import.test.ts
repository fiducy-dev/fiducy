import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import { CHAT_APP, startGatewayHarness } from './harness';

import type { AppRegistration } from '../src/types';

const IMPORT_APP: AppRegistration = {
  appID: 'app_migrator',
  name: 'Migrator',
  appSecret: 'app_sk_migrator_7Hk2Pq9Xv4Lm1Ns',
  monthlyRequestLimitPerKey: 100,
  allowedOrigins: ['https://migrator.example'],
  allowKeyImport: true
};

const OWNED_IMPORT_APP: AppRegistration = {
  ...IMPORT_APP,
  appID: 'app_migrator_owned',
  appSecret: 'app_sk_migrator_owned_5Tr8Wc3Jb6',
  recordStorage: 'app'
};

let harness: Awaited<ReturnType<typeof startGatewayHarness>>;

beforeAll(async () => {
  harness = await startGatewayHarness([IMPORT_APP, OWNED_IMPORT_APP]);
});

afterAll(() => harness.stop());

function importKeys(appSecret: string, body: unknown, headers: Record<string, string> = {}) {
  return fetch(`${harness.gatewayURL}/keys/import`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${appSecret}`,
      'content-type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  });
}

describe('importing keys an app already stores', () => {
  it('seals each key and returns handles in the order sent', async () => {
    const response = await importKeys(IMPORT_APP.appSecret, {
      apiKeys: ['sk-import-first-0001', 'sk-import-second-0002']
    });
    expect(response.status).toBe(201);
    const { data } = (await response.json()) as { data: { keys: Array<{ handle: string }> } };
    expect(data.keys).toHaveLength(2);
    for (const { handle } of data.keys) {
      expect(handle).toStartWith('kh_');
      const record = await harness.keyStore.findRecord(handle.slice(3, 25));
      expect(record?.appID).toBe(IMPORT_APP.appID);
      expect(JSON.stringify(record)).not.toContain('sk-import');
    }
  });

  it('returns records instead of storing them when the app keeps its own', async () => {
    const response = await importKeys(OWNED_IMPORT_APP.appSecret, { apiKeys: ['sk-owned-0003'] });
    const { data } = (await response.json()) as {
      data: { keys: Array<{ handle: string; record: { keyID: string } }> };
    };
    const [key] = data.keys;
    expect(key?.record.keyID).toBe(key?.handle.slice(3, 25) ?? '');
    expect(await harness.keyStore.findRecord(key?.record.keyID ?? '')).toBeNull();
  });

  it('refuses apps that have not turned import on', async () => {
    const response = await importKeys(CHAT_APP.appSecret, { apiKeys: ['sk-blocked-0004'] });
    expect(response.status).toBe(403);
  });

  it('refuses bad secrets, browsers and malformed batches', async () => {
    expect((await importKeys('app_sk_wrong', { apiKeys: ['sk-x'] })).status).toBe(401);
    const fromBrowser = await importKeys(
      IMPORT_APP.appSecret,
      { apiKeys: ['sk-x'] },
      { origin: 'https://migrator.example' }
    );
    expect(fromBrowser.status).toBe(403);
    expect((await importKeys(IMPORT_APP.appSecret, { apiKeys: [] })).status).toBe(400);
    expect((await importKeys(IMPORT_APP.appSecret, { apiKeys: ['  '] })).status).toBe(400);
    const tooMany = Array.from({ length: 101 }, (_, index) => `sk-batch-${index}`);
    expect((await importKeys(IMPORT_APP.appSecret, { apiKeys: tooMany })).status).toBe(400);
  });
});
