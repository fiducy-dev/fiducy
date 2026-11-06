import { describe, expect, it } from 'bun:test';

import { hashSecret as hashSecretInGateway } from '../../gateway/src/hashing';
import { createApp, deleteApp, listApps, listGatewayApps } from '../src/lib/appService';
import { rotateAppSecret, updateApp } from '../src/lib/appService';
import { hashSecret } from '../src/lib/secrets';
import { appSettingsSchema, appSettingsUpdateSchema } from '../src/lib/validators';
import { CHAT_SETTINGS, OTHER_OWNER_ID, OWNER_ID, createTestStore } from './fixtures';

describe('creating an app', () => {
  it('returns the secret once and stores only its hash', async () => {
    const store = createTestStore();
    const { app, appSecret } = await createApp(store, OWNER_ID, CHAT_SETTINGS);
    expect(app.appID).toMatch(/^app_[A-Za-z0-9_-]{16}$/);
    expect(appSecret).toMatch(/^fsk_[A-Za-z0-9_-]{43}$/);
    expect(app.appSecretPreview).toBe(appSecret.slice(-4));
    const stored = await store.findApp(app.appID);
    expect(JSON.stringify(stored)).not.toContain(appSecret);
    expect(stored?.appSecretHash).toBe(await hashSecret(appSecret));
  });

  it('hashes secrets exactly like the gateway does', async () => {
    const appSecret = 'fsk_same_secret_on_both_sides';
    expect(await hashSecret(appSecret)).toBe(await hashSecretInGateway(appSecret));
  });

  it('never shows the hash or owner in what the dashboard receives', async () => {
    const store = createTestStore();
    await createApp(store, OWNER_ID, CHAT_SETTINGS);
    const [listed] = await listApps(store, OWNER_ID);
    expect(listed).not.toHaveProperty('appSecretHash');
    expect(listed).not.toHaveProperty('ownerID');
  });
});

describe('keeping accounts apart', () => {
  it('lists only the apps a developer owns', async () => {
    const store = createTestStore();
    await createApp(store, OWNER_ID, CHAT_SETTINGS);
    await createApp(store, OTHER_OWNER_ID, { ...CHAT_SETTINGS, name: 'Other' });
    expect((await listApps(store, OWNER_ID)).map((app) => app.name)).toEqual(['Chatforge']);
  });

  it('answers not found when someone touches an app they do not own', async () => {
    const store = createTestStore();
    const { app } = await createApp(store, OWNER_ID, CHAT_SETTINGS);
    const update = await updateApp(store, OTHER_OWNER_ID, app.appID, { name: 'Taken' });
    const rotation = await rotateAppSecret(store, OTHER_OWNER_ID, app.appID);
    const deletion = await deleteApp(store, OTHER_OWNER_ID, app.appID);
    for (const result of [update, rotation, deletion]) {
      expect(result).toMatchObject({ ok: false, error: { status: 404 } });
    }
    expect((await store.findApp(app.appID))?.name).toBe('Chatforge');
  });
});

describe('changing an app', () => {
  it('updates settings without touching the secret', async () => {
    const store = createTestStore();
    const { app } = await createApp(store, OWNER_ID, CHAT_SETTINGS);
    const before = await store.findApp(app.appID);
    const updated = await updateApp(store, OWNER_ID, app.appID, { monthlyRequestLimitPerKey: 5 });
    expect(updated).toMatchObject({ ok: true, value: { monthlyRequestLimitPerKey: 5 } });
    expect((await store.findApp(app.appID))?.appSecretHash).toBe(before?.appSecretHash ?? '');
  });

  it('keeps key import off until the owner turns it on, and tells the gateway', async () => {
    const store = createTestStore();
    const created = appSettingsSchema.parse({
      name: 'Chat',
      monthlyRequestLimitPerKey: 10,
      allowedOrigins: []
    });
    expect(created.allowKeyImport).toBe(false);
    const { app } = await createApp(store, OWNER_ID, created);
    const changes = appSettingsUpdateSchema.parse({ allowKeyImport: true });
    expect(changes).toEqual({ allowKeyImport: true });
    await updateApp(store, OWNER_ID, app.appID, changes);
    const [gatewayApp] = await listGatewayApps(store);
    expect(gatewayApp?.allowKeyImport).toBe(true);
  });

  it('sends spend limits to the gateway and clears them with an empty object', async () => {
    const store = createTestStore();
    const { app } = await createApp(store, OWNER_ID, CHAT_SETTINGS);
    const limits = appSettingsUpdateSchema.parse({
      spendLimits: { dailyDollarLimitPerKey: 5, maximumOutputTokens: 4096 }
    });
    await updateApp(store, OWNER_ID, app.appID, limits);
    expect((await listGatewayApps(store))[0]?.spendLimits).toEqual({
      dailyDollarLimitPerKey: 5,
      maximumOutputTokens: 4096
    });
    await updateApp(store, OWNER_ID, app.appID, appSettingsUpdateSchema.parse({ spendLimits: {} }));
    expect((await listGatewayApps(store))[0]?.spendLimits).toEqual({});
  });

  it('refuses spend limits that make no sense', () => {
    const negative = { spendLimits: { dailyDollarLimitPerApp: -1 } };
    const fractional = { spendLimits: { concurrentRequestLimitPerKey: 1.5 } };
    expect(appSettingsUpdateSchema.safeParse(negative).success).toBe(false);
    expect(appSettingsUpdateSchema.safeParse(fractional).success).toBe(false);
  });

  it('keeps where sealed keys live fixed after creation', () => {
    const parsed = appSettingsUpdateSchema.parse({ name: 'Renamed', recordStorage: 'app' });
    expect(parsed).toEqual({ name: 'Renamed' });
  });

  it('rotates the secret so the old one no longer matches', async () => {
    const store = createTestStore();
    const { app, appSecret } = await createApp(store, OWNER_ID, CHAT_SETTINGS);
    const rotated = await rotateAppSecret(store, OWNER_ID, app.appID);
    if (!rotated.ok) throw new Error('rotation failed');
    expect(rotated.value.appSecret).not.toBe(appSecret);
    const stored = await store.findApp(app.appID);
    expect(stored?.appSecretHash).toBe(await hashSecret(rotated.value.appSecret));
  });

  it('removes a deleted app from the owner list and the gateway feed', async () => {
    const store = createTestStore();
    const { app } = await createApp(store, OWNER_ID, CHAT_SETTINGS);
    expect(await deleteApp(store, OWNER_ID, app.appID)).toMatchObject({ ok: true });
    expect(await listApps(store, OWNER_ID)).toEqual([]);
    expect(await listGatewayApps(store)).toEqual([]);
  });
});

describe('the gateway feed', () => {
  it('lists every app with its secret hash and nothing the gateway does not need', async () => {
    const store = createTestStore();
    await createApp(store, OWNER_ID, CHAT_SETTINGS);
    await createApp(store, OTHER_OWNER_ID, { ...CHAT_SETTINGS, name: 'Other' });
    const feed = await listGatewayApps(store);
    expect(feed).toHaveLength(2);
    expect(Object.keys(feed[0] ?? {}).sort()).toEqual([
      'allowedOrigins',
      'appID',
      'appSecretHash',
      'monthlyRequestLimitPerKey',
      'name',
      'revokedKeyIDs'
    ]);
  });
});
