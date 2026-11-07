import { DEFAULT_BASE_PATH } from './constants.ts';

import type { WidgetSealedRecord } from '@fiducy/widget';
import type { FiducyBrowserConfig, GatewayProvider, KeyRouteLookup } from './types.ts';
import type { GatewayResponseBody, UserKeySummaryView } from './types.ts';

export const FIDUCY_KEYS_CHANGED = 'fiducy:keys-changed';

export class FiducyRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function callApp<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin', ...init });
  const body = (await response.json().catch(() => null)) as GatewayResponseBody<T> | null;
  if (!response.ok || !body?.data) {
    throw new FiducyRequestError(
      body?.message ?? `Request failed: ${response.status}`,
      response.status
    );
  }
  return body.data;
}

export function notifyKeysChanged(basePath: string, source: EventTarget | null = null) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FIDUCY_KEYS_CHANGED, { detail: { basePath, source } }));
}

export async function saveConnectedKey(
  body: { provider: GatewayProvider; handle: string; record?: WidgetSealedRecord },
  basePath = DEFAULT_BASE_PATH,
  source: EventTarget | null = null
): Promise<UserKeySummaryView> {
  const key = await callApp<UserKeySummaryView>(`${basePath}/keys`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  notifyKeysChanged(basePath, source);
  return key;
}

export async function removeConnectedKey(
  keyID: string,
  basePath = DEFAULT_BASE_PATH,
  source: EventTarget | null = null
) {
  await callApp<{ keyID: string }>(`${basePath}/keys/${encodeURIComponent(keyID)}`, {
    method: 'DELETE'
  });
  notifyKeysChanged(basePath, source);
}

export async function fetchBrowserConfig(basePath: string): Promise<FiducyBrowserConfig> {
  const response = await fetch(`${basePath}/config`, { credentials: 'same-origin' });
  const body = (await response
    .json()
    .catch(() => null)) as GatewayResponseBody<FiducyBrowserConfig> | null;
  if (response.ok && body?.data?.gatewayURL) return body.data;
  if (body?.message && response.status !== 404) throw new Error(body.message);
  throw new Error(
    `No Fiducy route answers at ${basePath}/config. Mount fiducy.handler at ${basePath}, or set base-path.`
  );
}

export async function findProviderKey(
  provider: GatewayProvider,
  basePath: string
): Promise<KeyRouteLookup> {
  try {
    const { keys } = await callApp<{ keys: UserKeySummaryView[] }>(`${basePath}/keys`);
    const key = keys.find((candidate) => candidate.provider === provider) ?? null;
    return { state: key ? 'connected' : 'connect', key };
  } catch (error) {
    if (error instanceof FiducyRequestError && error.status === 401) {
      return { state: 'signed-out', key: null };
    }
    throw error;
  }
}
