import { fail, succeed } from './result';

import { APP_NOT_FOUND, APP_SECRET_NOT_VALID } from './failures';
import { generateAppID, generateAppSecret, hashSecret, previewAppSecret } from './secrets';
import { matchesToken } from './secrets';

import type { AppSettings, AppView, ControlResult, ControlStore } from './types';
import type { CreatedApp, GatewayApp, StoredApp } from './types';

export function toAppView({ appSecretHash, ownerID, ...app }: StoredApp): AppView {
  return app;
}

export function toGatewayApp(
  { ownerID, appSecretPreview, createdAt, frozenAt, ...app }: StoredApp,
  revokedKeyIDs: string[] = []
): GatewayApp {
  return { ...app, revokedKeyIDs };
}

async function issueAppSecret() {
  const appSecret = generateAppSecret();
  return {
    appSecret,
    appSecretHash: await hashSecret(appSecret),
    appSecretPreview: previewAppSecret(appSecret)
  };
}

export async function findOwnedApp(
  store: ControlStore,
  ownerID: string,
  appID: string
): Promise<ControlResult<StoredApp>> {
  const app = await store.findApp(appID);
  if (!app || app.ownerID !== ownerID) return fail(APP_NOT_FOUND);
  return succeed(app);
}

export async function createApp(
  store: ControlStore,
  ownerID: string,
  settings: AppSettings
): Promise<CreatedApp> {
  const { appSecret, ...secretFields } = await issueAppSecret();
  const app: StoredApp = {
    ...settings,
    ...secretFields,
    appID: generateAppID(),
    ownerID,
    createdAt: new Date().toISOString()
  };
  await store.saveApp(app);
  return { app: toAppView(app), appSecret };
}

export async function listApps(store: ControlStore, ownerID: string): Promise<AppView[]> {
  const apps = await store.listAppsByOwner(ownerID);
  return apps
    .sort((first, second) => first.createdAt.localeCompare(second.createdAt))
    .map(toAppView);
}

export async function updateApp(
  store: ControlStore,
  ownerID: string,
  appID: string,
  changes: Partial<Omit<AppSettings, 'recordStorage'>>
): Promise<ControlResult<AppView>> {
  const owned = await findOwnedApp(store, ownerID, appID);
  if (!owned.ok) return owned;
  const updated = { ...owned.value, ...changes };
  await store.saveApp(updated);
  return succeed(toAppView(updated));
}

export async function rotateAppSecret(
  store: ControlStore,
  ownerID: string,
  appID: string
): Promise<ControlResult<CreatedApp>> {
  const owned = await findOwnedApp(store, ownerID, appID);
  if (!owned.ok) return owned;
  const { appSecret, ...secretFields } = await issueAppSecret();
  const updated = { ...owned.value, ...secretFields };
  await store.saveApp(updated);
  return succeed({ app: toAppView(updated), appSecret });
}

export async function setAppFrozen(
  store: ControlStore,
  ownerID: string,
  appID: string,
  isFrozen: boolean
): Promise<ControlResult<AppView>> {
  const owned = await findOwnedApp(store, ownerID, appID);
  if (!owned.ok) return owned;
  const frozenAt = isFrozen ? new Date().toISOString() : null;
  const updated = { ...owned.value, isFrozen, frozenAt };
  await store.saveApp(updated);
  return succeed(toAppView(updated));
}

export async function freezeAppBySecret(
  store: ControlStore,
  appSecret: string
): Promise<ControlResult<string>> {
  const appSecretHash = await hashSecret(appSecret);
  const apps = await store.listAllApps();
  const app = apps.find((candidate) => matchesToken(candidate.appSecretHash, appSecretHash));
  if (!app) return fail(APP_SECRET_NOT_VALID);
  if (!app.isFrozen) {
    await store.saveApp({ ...app, isFrozen: true, frozenAt: new Date().toISOString() });
  }
  return succeed(app.appID);
}

export async function deleteApp(
  store: ControlStore,
  ownerID: string,
  appID: string
): Promise<ControlResult<string>> {
  const owned = await findOwnedApp(store, ownerID, appID);
  if (!owned.ok) return owned;
  await store.deleteApp(owned.value);
  return succeed(appID);
}

export async function listGatewayApps(store: ControlStore): Promise<GatewayApp[]> {
  const apps = await store.listAllApps();
  return Promise.all(
    apps.map(async (app) => toGatewayApp(app, await store.listRevokedKeyIDs(app.appID)))
  );
}
