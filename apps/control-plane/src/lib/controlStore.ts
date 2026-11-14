import { APP_NAMESPACE, OWNER_NAMESPACE } from './constants';
import { DAILY_USAGE_NAMESPACE, GATEWAY_HEARTBEAT_KEY, KEY_ENTRY_NAMESPACE } from './constants';
import { REVOKED_KEYS_NAMESPACE, TWO_FACTOR_NAMESPACE, USAGE_NAMESPACE } from './constants';

import type { ControlStore, KeyValueStore, StoredApp, UsageSummary } from './types';
import type { DailyUsage, GatewayHeartbeat, StoredKeyEntry, StoredTwoFactor } from './types';

function createEmptyUsage(month: string): UsageSummary {
  return { month, requestCount: 0, inputTokens: 0, outputTokens: 0, requestsByKey: {} };
}

function createEmptyDailyUsage(date: string): DailyUsage {
  return { date, requestCount: 0, inputTokens: 0, outputTokens: 0, byProvider: {} };
}

function lastKeySegment(key: string): string {
  return key.split(':').at(-1) ?? key;
}

export function createControlStore(keyValueStore: KeyValueStore): ControlStore {
  const findApp = async (appID: string) =>
    ((await keyValueStore.getItem(`${APP_NAMESPACE}:${appID}`)) as StoredApp | null) ?? null;

  const findApps = async (appIDs: string[]) => {
    const apps = await Promise.all(appIDs.map(findApp));
    return apps.filter((app): app is StoredApp => app !== null);
  };

  const listRevokedKeyIDs = async (appID: string) =>
    ((await keyValueStore.getItem(`${REVOKED_KEYS_NAMESPACE}:${appID}`)) as string[] | null) ?? [];

  const findKeyEntry = async (appID: string, keyID: string) =>
    ((await keyValueStore.getItem(
      `${KEY_ENTRY_NAMESPACE}:${appID}:${keyID}`
    )) as StoredKeyEntry | null) ?? null;

  return {
    saveApp: async (app) => {
      await keyValueStore.setItem(`${APP_NAMESPACE}:${app.appID}`, app);
      await keyValueStore.setItem(`${OWNER_NAMESPACE}:${app.ownerID}:${app.appID}`, true);
    },
    findApp,
    deleteApp: async (app) => {
      await keyValueStore.removeItem(`${APP_NAMESPACE}:${app.appID}`);
      await keyValueStore.removeItem(`${OWNER_NAMESPACE}:${app.ownerID}:${app.appID}`);
    },
    listAppsByOwner: async (ownerID) => {
      const keys = await keyValueStore.getKeys(`${OWNER_NAMESPACE}:${ownerID}`);
      return findApps(keys.map(lastKeySegment));
    },
    listAllApps: async () => {
      const keys = await keyValueStore.getKeys(APP_NAMESPACE);
      return findApps(keys.map(lastKeySegment));
    },
    readUsage: async (appID, month) => {
      const stored = await keyValueStore.getItem(`${USAGE_NAMESPACE}:${appID}:${month}`);
      return (stored as UsageSummary | null) ?? createEmptyUsage(month);
    },
    saveUsage: async (appID, summary) => {
      await keyValueStore.setItem(`${USAGE_NAMESPACE}:${appID}:${summary.month}`, summary);
    },
    saveKeyEntry: async (entry) => {
      await keyValueStore.setItem(`${KEY_ENTRY_NAMESPACE}:${entry.appID}:${entry.keyID}`, entry);
    },
    findKeyEntry,
    listKeyEntries: async (appID) => {
      const keys = await keyValueStore.getKeys(`${KEY_ENTRY_NAMESPACE}:${appID}`);
      const entries = await Promise.all(
        keys.map((key) => findKeyEntry(appID, lastKeySegment(key)))
      );
      return entries.filter((entry): entry is StoredKeyEntry => entry !== null);
    },
    listRevokedKeyIDs,
    addRevokedKeyID: async (appID, keyID) => {
      const revokedKeyIDs = await listRevokedKeyIDs(appID);
      if (revokedKeyIDs.includes(keyID)) return;
      await keyValueStore.setItem(`${REVOKED_KEYS_NAMESPACE}:${appID}`, [...revokedKeyIDs, keyID]);
    },
    readDailyUsage: async (appID, date) => {
      const stored = await keyValueStore.getItem(`${DAILY_USAGE_NAMESPACE}:${appID}:${date}`);
      return (stored as DailyUsage | null) ?? createEmptyDailyUsage(date);
    },
    saveDailyUsage: async (appID, usage) => {
      await keyValueStore.setItem(`${DAILY_USAGE_NAMESPACE}:${appID}:${usage.date}`, usage);
    },
    readGatewayHeartbeat: async () =>
      ((await keyValueStore.getItem(GATEWAY_HEARTBEAT_KEY)) as GatewayHeartbeat | null) ?? null,
    saveGatewayHeartbeat: async (heartbeat) => {
      await keyValueStore.setItem(GATEWAY_HEARTBEAT_KEY, heartbeat);
    },
    findTwoFactor: async (ownerID) =>
      ((await keyValueStore.getItem(
        `${TWO_FACTOR_NAMESPACE}:${ownerID}`
      )) as StoredTwoFactor | null) ?? null,
    saveTwoFactor: async (record) => {
      await keyValueStore.setItem(`${TWO_FACTOR_NAMESPACE}:${record.ownerID}`, record);
    }
  };
}

export function createMemoryKeyValueStore(): KeyValueStore {
  const entries = new Map<string, unknown>();
  return {
    getItem: async (key) => structuredClone(entries.get(key)) ?? null,
    setItem: async (key, value) => {
      entries.set(key, structuredClone(value));
    },
    removeItem: async (key) => {
      entries.delete(key);
    },
    getKeys: async (base = '') =>
      [...entries.keys()].filter((key) => !base || key.startsWith(`${base}:`))
  };
}
