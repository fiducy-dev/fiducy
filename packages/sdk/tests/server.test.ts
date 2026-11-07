import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

import { SAMPLE_API_KEY } from '@fiducy/testing';
import { CHAT_APP, startGatewayHarness } from '../../../apps/gateway/tests/harness';
import { keyValueStorage, memoryStorage } from '../src/server';
import { APP_URL, appRequest, connectKey, createTestApp } from './fixtures';

import type { SealedRecord } from '@fiducy/core';
import type { AppRegistration } from '../../../apps/gateway/src/types';
import type { FiducyStorage, KeyValueDriver, StoredUserKey } from '../src/server';
import type { FetchGateway } from '../src/types';
import type { GatewayHarness } from './fixtures';

const OWNED_APP: AppRegistration = {
  appID: 'app_ownstore_sdk',
  name: 'Ownstore',
  appSecret: 'app_sk_ownstore_sdk_3Wq7Rt1Nm',
  monthlyRequestLimitPerKey: 50,
  allowedOrigins: ['https://ownstore.example'],
  recordStorage: 'app'
};
const IMPORT_APP: AppRegistration = {
  appID: 'app_import_sdk',
  name: 'Importer',
  appSecret: 'app_sk_import_sdk_8Rv2Kd5Yp',
  monthlyRequestLimitPerKey: 50,
  allowedOrigins: ['https://importer.example'],
  allowKeyImport: true
};

let harness: GatewayHarness;

beforeAll(async () => {
  harness = await startGatewayHarness([OWNED_APP, IMPORT_APP]);
});

afterAll(() => harness.stop());

function createApp(
  app: AppRegistration,
  storage: FiducyStorage = memoryStorage(),
  fetchGateway: FetchGateway = fetch
) {
  return createTestApp(harness, app, storage, fetchGateway);
}

function connect(fiducy: ReturnType<typeof createApp>, app: AppRegistration, user: string) {
  return connectKey(harness, fiducy, app, user);
}

describe('the app-side Fiducy handler', () => {
  it('saves a handle for the signed-in user and lists it without the handle', async () => {
    const fiducy = createApp(CHAT_APP);
    const { response, sealed } = await connect(fiducy, CHAT_APP, 'user_1');
    expect(response.status).toBe(201);
    const listed = await fiducy.handler(appRequest('/keys', 'user_1'));
    const body = (await listed.json()) as { data: { keys: { provider: string }[] } };
    expect(body.data.keys).toHaveLength(1);
    expect(body.data.keys[0]?.provider).toBe('openai');
    expect(JSON.stringify(body)).not.toContain(sealed.handle);
  });

  it('chats with the stored key through the AI SDK', async () => {
    const fiducy = createApp(CHAT_APP);
    await connect(fiducy, CHAT_APP, 'user_2');
    const settings = await fiducy.providerSettings('openai', { userID: 'user_2' });
    if (!settings.ok) throw new Error(settings.message);
    const result = await generateText({
      model: createOpenAI(settings).chat('gpt-4o-mini'),
      prompt: 'hi'
    });
    expect(result.text).toBe('Hello');
    const forwarded = harness.mockProvider.recordedRequests.at(-1);
    expect(forwarded?.headers.get('authorization')).toBe(`Bearer ${SAMPLE_API_KEY}`);
  });

  it('sends the record along when the app stores its own records', async () => {
    const fiducy = createApp(OWNED_APP);
    const { sealed } = await connect(fiducy, OWNED_APP, 'user_3');
    expect(sealed.record).toBeDefined();
    const settings = await fiducy.providerSettings('openai', { userID: 'user_3' });
    if (!settings.ok) throw new Error(settings.message);
    expect(settings.headers['x-key-record']).toBeString();
    const result = await generateText({
      model: createOpenAI(settings).chat('gpt-4o-mini'),
      prompt: 'hi'
    });
    expect(result.text).toBe('Hello');
  });

  it('revokes a key at the gateway and in storage', async () => {
    const fiducy = createApp(CHAT_APP);
    const { sealed } = await connect(fiducy, CHAT_APP, 'user_4');
    const keyID = sealed.handle.slice(3, 25);
    const response = await fiducy.handler(
      appRequest(`/keys/${keyID}`, 'user_4', { method: 'DELETE', headers: { origin: APP_URL } })
    );
    expect(response.status).toBe(200);
    expect(await harness.keyStore.findRecord(keyID)).toBeNull();
    expect(await fiducy.providerSettings('openai', { userID: 'user_4' })).toMatchObject({
      ok: false,
      reason: 'no-key'
    });
  });

  it('keeps the key when the gateway fails to revoke it', async () => {
    const storage = memoryStorage();
    const { sealed } = await connect(createApp(CHAT_APP, storage), CHAT_APP, 'user_7');
    const keyID = sealed.handle.slice(3, 25);
    const failingGateway: FetchGateway = async () =>
      Response.json({ data: null, message: 'Unavailable' }, { status: 503 });
    const fiducy = createApp(CHAT_APP, storage, failingGateway);
    const response = await fiducy.handler(
      appRequest(`/keys/${keyID}`, 'user_7', { method: 'DELETE', headers: { origin: APP_URL } })
    );
    expect(response.status).toBe(502);
    expect(await harness.keyStore.findRecord(keyID)).not.toBeNull();
    expect(await fiducy.listKeys('user_7')).toHaveLength(1);
  });

  it('uses the newest key when a provider has two', async () => {
    const storage = memoryStorage();
    const base = { userID: 'user_8', provider: 'openai' as const, handle: 'kh_x' };
    await storage.saveKey({ ...base, keyID: 'old', createdAt: '2026-01-01T00:00:00.000Z' });
    await storage.saveKey({ ...base, keyID: 'new', createdAt: '2026-02-01T00:00:00.000Z' });
    expect((await storage.findKey('user_8', 'openai'))?.keyID).toBe('new');
  });

  it('keeps users apart and refuses anonymous and cross-site requests', async () => {
    const fiducy = createApp(CHAT_APP);
    const { sealed } = await connect(fiducy, CHAT_APP, 'user_5');
    expect((await fiducy.providerSettings('openai', { userID: 'someone_else' })).ok).toBe(false);
    expect((await fiducy.handler(appRequest('/keys', null))).status).toBe(401);
    const crossSite = await fiducy.handler(
      appRequest('/keys', 'user_5', {
        method: 'POST',
        headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
        body: JSON.stringify({ provider: 'openai', handle: sealed.handle })
      })
    );
    expect(crossSite.status).toBe(403);
  });

  it('rejects a record that does not match its handle', async () => {
    const fiducy = createApp(OWNED_APP);
    const first = await harness.storeKey(OWNED_APP.appID, SAMPLE_API_KEY);
    const second = await harness.storeKey(OWNED_APP.appID, SAMPLE_API_KEY);
    const response = await fiducy.handler(
      appRequest('/keys', 'user_6', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider: 'openai',
          handle: first.body.data.handle,
          record: second.body.data.record
        })
      })
    );
    expect(response.status).toBe(400);
  });
});

describe('importing keys an app already stores', () => {
  it('seals keys at the gateway, saves handles and chats with them', async () => {
    const storage = memoryStorage();
    const fiducy = createApp(IMPORT_APP, storage);
    const result = await fiducy.importKeys([
      { userID: 'legacy_1', provider: 'openai', apiKey: SAMPLE_API_KEY },
      { userID: 'legacy_2', provider: 'anthropic', apiKey: 'sk-ant-legacy-0002' }
    ]);
    expect(result.imported.map((key) => key.userID)).toEqual(['legacy_1', 'legacy_2']);
    expect(result.skipped).toEqual([]);
    const [stored] = await storage.listKeys('legacy_1');
    expect(stored?.source).toBe('import');
    expect(stored?.handle).toStartWith('kh_');

    const settings = await fiducy.providerSettings('openai', { userID: 'legacy_1' });
    if (!settings.ok) throw new Error('missing settings');
    const { text } = await generateText({
      model: createOpenAI(settings).chat('gpt-4o-mini'),
      prompt: 'Hi'
    });
    expect(text).toBe('Hello');
    const forwarded = harness.mockProvider.recordedRequests.at(-1);
    expect(forwarded?.headers.get('authorization')).toBe(`Bearer ${SAMPLE_API_KEY}`);
  });

  it('skips users who already connected a key, so it is safe to run again', async () => {
    const fiducy = createApp(IMPORT_APP);
    const first = await fiducy.importKeys([
      { userID: 'rerun_1', provider: 'openai', apiKey: 'sk-rerun-0001' }
    ]);
    const second = await fiducy.importKeys([
      { userID: 'rerun_1', provider: 'openai', apiKey: 'sk-rerun-0001' },
      { userID: 'rerun_2', provider: 'openai', apiKey: 'sk-rerun-0002' },
      { userID: 'rerun_2', provider: 'openai', apiKey: 'sk-rerun-0003' }
    ]);
    expect(first.imported).toHaveLength(1);
    expect(second.imported.map((key) => key.userID)).toEqual(['rerun_2']);
    expect(second.skipped).toEqual([
      { userID: 'rerun_1', provider: 'openai' },
      { userID: 'rerun_2', provider: 'openai' }
    ]);
  });

  it('fails loudly when the app has not turned import on', async () => {
    const fiducy = createApp(CHAT_APP);
    await expect(
      fiducy.importKeys([{ userID: 'blocked', provider: 'openai', apiKey: 'sk-blocked' }])
    ).rejects.toThrow('Key import is off');
  });
});

describe('key-value storage for Farm.js mounts and unstorage', () => {
  it('saves, lists, finds and deletes per user', async () => {
    const items = new Map<string, StoredUserKey>();
    const driver: KeyValueDriver = {
      getItem: async (key) => items.get(key) ?? null,
      setItem: async (key, value) => {
        items.set(key, value);
      },
      removeItem: async (key) => {
        items.delete(key);
      },
      getKeys: async (base = '') => [...items.keys()].filter((key) => key.startsWith(base))
    };
    const storage = keyValueStorage(driver);
    const key: StoredUserKey = {
      userID: 'user_1',
      provider: 'openai',
      keyID: 'AAAAAAAAAAAAAAAAAAAAAA',
      handle: 'kh_x',
      createdAt: new Date().toISOString()
    };
    await storage.saveKey(key);
    expect(await storage.findKey('user_1', 'openai')).toEqual(key);
    expect(await storage.listKeys('user_2')).toEqual([]);
    expect(await storage.deleteKey('user_2', key.keyID)).toBe(false);
    expect(await storage.deleteKey('user_1', key.keyID)).toBe(true);
    expect(await storage.listKeys('user_1')).toEqual([]);
  });
});
