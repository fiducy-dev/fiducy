import { GATEWAY_APPS_PATH, MINIMUM_REFRESH_GAP_MILLISECONDS } from './constants';
import { callControlPlane, normalizeError } from './controlPlane';
import { hashSecret } from './hashing';

import type { AppDirectory, RegisteredApp, RemoteAppConfig } from './types';
import type { RemoteAppDirectoryOptions } from './types';

function toRegisteredApp({ appSecretHash, ...app }: RemoteAppConfig): RegisteredApp {
  return app;
}

export function createRemoteAppDirectory(options: RemoteAppDirectoryOptions): AppDirectory {
  let appsByID = new Map<string, RegisteredApp>();
  let appsBySecretHash = new Map<string, RegisteredApp>();
  let lastRefreshAt = 0;
  let pendingRefresh: Promise<void> | null = null;

  const loadApps = async () => {
    try {
      const configs = (await callControlPlane(options, GATEWAY_APPS_PATH)) as RemoteAppConfig[];
      appsByID = new Map(configs.map((config) => [config.appID, toRegisteredApp(config)]));
      appsBySecretHash = new Map(
        configs.map((config) => [config.appSecretHash, toRegisteredApp(config)])
      );
    } catch (error) {
      console.error(`Could not refresh app configs: ${normalizeError(error)}`);
    } finally {
      lastRefreshAt = Date.now();
      pendingRefresh = null;
    }
  };

  const refresh = (force: boolean) => {
    const age = Date.now() - lastRefreshAt;
    const isStale = age >= options.refreshIntervalMilliseconds;
    const mayRetry = force && age >= MINIMUM_REFRESH_GAP_MILLISECONDS;
    if (!isStale && !mayRetry) return Promise.resolve();
    pendingRefresh ??= loadApps();
    return pendingRefresh;
  };

  const findWithRefresh = async (lookup: () => RegisteredApp | undefined) => {
    await refresh(false);
    const cached = lookup();
    if (cached) return cached;
    await refresh(true);
    return lookup() ?? null;
  };

  return {
    refresh: async () => {
      await pendingRefresh;
      pendingRefresh = loadApps();
      return pendingRefresh;
    },
    findApp: (appID) => findWithRefresh(() => appsByID.get(appID)),
    findAppBySecret: async (appSecret) => {
      const appSecretHash = await hashSecret(appSecret);
      return findWithRefresh(() => appsBySecretHash.get(appSecretHash));
    }
  };
}
