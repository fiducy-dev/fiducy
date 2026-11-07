import { GATEWAY_ERROR_HEADER, KEY_UNAVAILABLE_ERROR } from '@fiducy/core';

import { KEY_RECORD_HEADER, PROVIDER_LABELS } from '../constants.ts';
import { createProviderSettings } from '../gatewayClient.ts';

import type { SealedRecord } from '@fiducy/core';
import type { GatewayProvider } from '../types.ts';
import type { FiducyConnection, FiducyStorage, GetUserID, MissingKey } from './types.ts';
import type { MissingKeyReason, ProviderFetch, ProviderSettingsResult } from './types.ts';
import type { GatewayErrorBody, StoredUserKey, UserLookup } from './types.ts';

const MISSING_KEY_MESSAGES: Record<MissingKeyReason, (label: string) => string> = {
  'signed-out': (label) => `Sign in to use your ${label} key`,
  'no-key': (label) => `Connect your ${label} key to keep going`
};

function encodeRecord(record: SealedRecord): string {
  return Buffer.from(JSON.stringify(record)).toString('base64url');
}

async function toProviderError(response: Response, code: string, replacement?: string) {
  const body = (await response.json().catch(() => null)) as GatewayErrorBody | null;
  const message = replacement ?? body?.message ?? `The Fiducy gateway answered ${response.status}`;
  const error = { type: 'fiducy_error', code: response.status, status: code, message };
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return Response.json(
    { type: 'error', error, data: null, message },
    { status: response.status, headers }
  );
}

function describeMissingKey(provider: GatewayProvider, reason: MissingKeyReason): MissingKey {
  const message = MISSING_KEY_MESSAGES[reason](PROVIDER_LABELS[provider]);
  return { ok: false, reason, provider, message };
}

async function findUserID(user: UserLookup, getUserID: GetUserID): Promise<string | null> {
  if ('userID' in user) return user.userID;
  if ('request' in user) return getUserID(user.request);
  return getUserID(new Request('http://localhost/', { headers: user.headers }));
}

function createHealingFetch(storage: FiducyStorage, stored: StoredUserKey): ProviderFetch {
  const label = PROVIDER_LABELS[stored.provider];
  const healingFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await fetch(input, init);
    const errorCode = response.headers.get(GATEWAY_ERROR_HEADER);
    if (!errorCode) return response;
    if (errorCode !== KEY_UNAVAILABLE_ERROR) return toProviderError(response, errorCode);
    await storage.deleteKey(stored.userID, stored.keyID);
    const message = `The saved ${label} key is no longer available. Connect it again.`;
    return toProviderError(response, errorCode, message);
  };
  return Object.assign(healingFetch, globalThis.fetch);
}

export function createProviderSettingsResolver(
  storage: FiducyStorage,
  getUserID: GetUserID,
  readConnection: () => FiducyConnection
) {
  return async (provider: GatewayProvider, user: UserLookup): Promise<ProviderSettingsResult> => {
    const userID = await findUserID(user, getUserID);
    if (!userID) return describeMissingKey(provider, 'signed-out');
    const stored = await storage.findKey(userID, provider);
    if (!stored) return describeMissingKey(provider, 'no-key');
    const { gatewayURL, appSecret } = readConnection();
    const settings = createProviderSettings(gatewayURL, appSecret, provider, stored.handle);
    if (stored.record) settings.headers[KEY_RECORD_HEADER] = encodeRecord(stored.record);
    return { ok: true, ...settings, fetch: createHealingFetch(storage, stored) };
  };
}

export function respondToMissingKey(missingKey: MissingKey): Response {
  const status = missingKey.reason === 'signed-out' ? 401 : 409;
  const data = { reason: missingKey.reason, provider: missingKey.provider };
  return Response.json({ data, message: missingKey.message }, { status });
}
