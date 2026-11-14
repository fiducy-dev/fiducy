import { fail, succeed } from './result';

import { findOwnedApp } from './appService';
import { groupBy, splitIntoBatches } from './common';
import { REVOKE_ALL_BATCH_SIZE, UNKNOWN_PROVIDER } from './constants';
import { KEY_NOT_FOUND } from './failures';
import { toUsageMonth } from './usageService';

import type { AppKeyView, ControlResult, ControlStore, StoredKeyEntry } from './types';
import type { GatewayClient, KeyEvent, RevokedKeys } from './types';
import type { StoredApp, UsageEvent } from './types';

function laterTime(first: string | null, second: string): string {
  return first && first > second ? first : second;
}

export async function noteSavedKey(store: ControlStore, { appID, keyID, source }: KeyEvent) {
  const existing = await store.findKeyEntry(appID, keyID);
  if (existing) {
    if (source && !existing.source) await store.saveKeyEntry({ ...existing, source });
    return;
  }
  await store.saveKeyEntry({
    keyID,
    appID,
    provider: UNKNOWN_PROVIDER,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    status: 'active',
    source: source ?? 'widget'
  });
}

function pickLatestEvent(events: UsageEvent[]): UsageEvent {
  return events.reduce((latest, event) => (event.recordedAt >= latest.recordedAt ? event : latest));
}

function pickEarliestTime(events: UsageEvent[]): string {
  return events.reduce(
    (earliest, event) => (event.recordedAt < earliest ? event.recordedAt : earliest),
    events[0]?.recordedAt ?? ''
  );
}

async function noteKeyUse(store: ControlStore, keyEvents: UsageEvent[]) {
  const latestEvent = pickLatestEvent(keyEvents);
  const existing = await store.findKeyEntry(latestEvent.appID, latestEvent.keyID);
  const entry: StoredKeyEntry = existing ?? {
    keyID: latestEvent.keyID,
    appID: latestEvent.appID,
    provider: latestEvent.provider,
    createdAt: pickEarliestTime(keyEvents),
    lastUsedAt: null,
    status: 'active'
  };
  await store.saveKeyEntry({
    ...entry,
    provider: latestEvent.provider,
    lastUsedAt: laterTime(entry.lastUsedAt, latestEvent.recordedAt)
  });
}

export async function noteKeyUses(store: ControlStore, events: UsageEvent[]) {
  const eventsByKey = groupBy(events, (event) => `${event.appID}|${event.keyID}`);
  for (const keyEvents of eventsByKey.values()) await noteKeyUse(store, keyEvents);
}

function byMostRecent(first: AppKeyView, second: AppKeyView): number {
  return (second.lastUsedAt ?? second.createdAt).localeCompare(first.lastUsedAt ?? first.createdAt);
}

export async function listAppKeys(
  store: ControlStore,
  ownerID: string,
  appID: string
): Promise<ControlResult<AppKeyView[]>> {
  const owned = await findOwnedApp(store, ownerID, appID);
  if (!owned.ok) return fail(owned.error);
  const [entries, usage] = await Promise.all([
    store.listKeyEntries(appID),
    store.readUsage(appID, toUsageMonth(new Date()))
  ]);
  const keys = entries.map(({ appID: _appID, ...entry }) => ({
    ...entry,
    requestCount: usage.requestsByKey[entry.keyID] ?? 0
  }));
  return succeed(keys.sort(byMostRecent));
}

export async function revokeAppKey(
  store: ControlStore,
  gateway: GatewayClient,
  ownerID: string,
  appID: string,
  keyID: string
): Promise<ControlResult<string>> {
  const owned = await findOwnedApp(store, ownerID, appID);
  if (!owned.ok) return fail(owned.error);
  const entry = await store.findKeyEntry(appID, keyID);
  if (!entry) return fail(KEY_NOT_FOUND);
  if (owned.value.recordStorage !== 'app') {
    const deleted = await gateway.deleteRecord(appID, keyID);
    if (!deleted.ok) return deleted;
  }
  await noteRevokedKey(store, appID, keyID);
  return succeed(keyID);
}

async function revokeKeyEntry(
  store: ControlStore,
  gateway: GatewayClient,
  app: StoredApp,
  keyID: string
): Promise<boolean> {
  if (app.recordStorage !== 'app') {
    const deleted = await gateway.deleteRecord(app.appID, keyID);
    if (!deleted.ok) return false;
  }
  await noteRevokedKey(store, app.appID, keyID);
  return true;
}

export async function revokeAllAppKeys(
  store: ControlStore,
  gateway: GatewayClient,
  ownerID: string,
  appID: string
): Promise<ControlResult<RevokedKeys>> {
  const owned = await findOwnedApp(store, ownerID, appID);
  if (!owned.ok) return fail(owned.error);
  const entries = await store.listKeyEntries(appID);
  const activeKeyIDs = entries
    .filter((entry) => entry.status === 'active')
    .map((entry) => entry.keyID);
  const results: boolean[] = [];
  for (const batch of splitIntoBatches(activeKeyIDs, REVOKE_ALL_BATCH_SIZE)) {
    const revoked = batch.map((keyID) => revokeKeyEntry(store, gateway, owned.value, keyID));
    results.push(...(await Promise.all(revoked)));
  }
  const revokedCount = results.filter(Boolean).length;
  return succeed({ revokedCount, failedCount: results.length - revokedCount });
}

export async function noteRevokedKey(store: ControlStore, appID: string, keyID: string) {
  const entry = await store.findKeyEntry(appID, keyID);
  if (!entry) return;
  await store.saveKeyEntry({ ...entry, status: 'revoked' });
  const app = await store.findApp(appID);
  if (app?.recordStorage === 'app') await store.addRevokedKeyID(appID, keyID);
}

export async function noteKeyEvent(store: ControlStore, event: KeyEvent) {
  if (event.type === 'saved') await noteSavedKey(store, event);
  else await noteRevokedKey(store, event.appID, event.keyID);
}
