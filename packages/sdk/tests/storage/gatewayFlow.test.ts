import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

import { SAMPLE_API_KEY } from '@fiducy/testing';
import { CHAT_APP, startGatewayHarness } from '../../../../apps/gateway/tests/harness';
import { createFiducy } from '../../src/server';
import { STORAGE_SETUPS } from './setups';

import type { AppRegistration } from '../../../../apps/gateway/src/types';
import type { Fiducy } from '../../src/server';
import type { OpenedStorage } from './types';

const OWNED_APP: AppRegistration = {
  appID: 'app_ownstore_storage',
  name: 'Ownstore',
  appSecret: 'app_sk_ownstore_storage_7Hq2Vn',
  monthlyRequestLimitPerKey: 50,
  allowedOrigins: ['https://chat.example'],
  recordStorage: 'app'
};
const IMPORT_APP: AppRegistration = {
  appID: 'app_import_storage',
  name: 'Importer',
  appSecret: 'app_sk_import_storage_4Lp9Wq',
  monthlyRequestLimitPerKey: 50,
  allowedOrigins: ['https://chat.example'],
  allowKeyImport: true
};
const APP_URL = 'https://chat.example';

let harness: Awaited<ReturnType<typeof startGatewayHarness>>;

beforeAll(async () => {
  harness = await startGatewayHarness([OWNED_APP, IMPORT_APP]);
});

afterAll(() => harness.stop());

function sendAppRequest(fiducy: Fiducy, path: string, userID: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('x-user', userID);
  headers.set('host', 'chat.example');
  headers.set('origin', APP_URL);
  return fiducy.handler(new Request(`${APP_URL}/api/fiducy${path}`, { ...init, headers }));
}

async function connectKey(fiducy: Fiducy, app: AppRegistration, userID: string) {
  const { body } = await harness.storeKey(app.appID, SAMPLE_API_KEY);
  const response = await sendAppRequest(fiducy, '/keys', userID, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'openai', ...body.data })
  });
  expect(response.status).toBe(201);
  return { handle: body.data.handle, keyID: body.data.handle.slice(3, 25) };
}

for (const setup of STORAGE_SETUPS) {
  describe.skipIf(!setup.isAvailable)(`Fiducy with ${setup.label}`, () => {
    let opened: OpenedStorage;
    const createApp = (app: AppRegistration) =>
      createFiducy({
        gatewayURL: harness.gatewayURL,
        appSecret: app.appSecret,
        storage: opened.storage,
        getUserID: (request) => request.headers.get('x-user')
      });

    beforeAll(async () => {
      opened = await setup.open();
    }, 60000);

    afterAll(async () => {
      await opened.close();
    });

    it('connects a key, chats with it, and revokes the old key when the user replaces it', async () => {
      const fiducy = createApp(CHAT_APP);
      const first = await connectKey(fiducy, CHAT_APP, 'user_replace');
      const second = await connectKey(fiducy, CHAT_APP, 'user_replace');
      expect(await harness.keyStore.findRecord(first.keyID)).toBeNull();
      expect((await fiducy.listKeys('user_replace')).map((key) => key.keyID)).toEqual([
        second.keyID
      ]);
      const settings = await fiducy.providerSettings('openai', { userID: 'user_replace' });
      if (!settings.ok) throw new Error(settings.message);
      const result = await generateText({
        model: createOpenAI(settings).chat('gpt-4o-mini'),
        prompt: 'hi'
      });
      expect(result.text).toBe('Hello');
    });

    it('stores the sealed record in the app database when the app owns records', async () => {
      const fiducy = createApp(OWNED_APP);
      await connectKey(fiducy, OWNED_APP, 'user_owned');
      const settings = await fiducy.providerSettings('openai', { userID: 'user_owned' });
      if (!settings.ok) throw new Error(settings.message);
      expect(settings.headers['x-key-record']).toBeString();
      const result = await generateText({
        model: createOpenAI(settings).chat('gpt-4o-mini'),
        prompt: 'hi'
      });
      expect(result.text).toBe('Hello');
    });

    it('imports existing keys, keeps their source, and skips users who already have one', async () => {
      const fiducy = createApp(IMPORT_APP);
      const input = [
        { userID: 'user_imported', provider: 'openai' as const, apiKey: SAMPLE_API_KEY }
      ];
      expect((await fiducy.importKeys(input)).imported).toHaveLength(1);
      expect((await fiducy.importKeys(input)).skipped).toHaveLength(1);
      const [stored] = await opened.storage.listKeys('user_imported');
      expect(stored?.source).toBe('import');
      const settings = await fiducy.providerSettings('openai', { userID: 'user_imported' });
      if (!settings.ok) throw new Error(settings.message);
      const result = await generateText({
        model: createOpenAI(settings).chat('gpt-4o-mini'),
        prompt: 'hi'
      });
      expect(result.text).toBe('Hello');
    });

    it('revokes through the route and keeps other users out', async () => {
      const fiducy = createApp(CHAT_APP);
      const { keyID } = await connectKey(fiducy, CHAT_APP, 'user_revoke');
      const intruder = await sendAppRequest(fiducy, `/keys/${keyID}`, 'user_intruder', {
        method: 'DELETE'
      });
      expect(intruder.status).toBe(404);
      const owner = await sendAppRequest(fiducy, `/keys/${keyID}`, 'user_revoke', {
        method: 'DELETE'
      });
      expect(owner.status).toBe(200);
      expect(await harness.keyStore.findRecord(keyID)).toBeNull();
      expect(await fiducy.listKeys('user_revoke')).toEqual([]);
    });
  });
}
