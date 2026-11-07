import { fail, parseHandle, succeed } from '@fiducy/core';

import { KEY_HANDLE_HEADER, PROVIDER_BASE_PATHS } from './constants.ts';

import type {
  FetchGateway,
  GatewayClient,
  GatewayClientOptions,
  GatewayProvider,
  GatewayResponseBody,
  GatewayResult,
  ImportedKeys,
  ProviderSettings,
  RevokedKey
} from './types.ts';

const INVALID_HANDLE_ERROR = { status: 400, message: 'The key handle is malformed' };
const BROWSER_ERROR =
  '@fiducy/sdk takes your app secret and must run on your server. In the browser, use @fiducy/sdk/react.';

function assertServer() {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    throw new Error(BROWSER_ERROR);
  }
}

function joinURL(gatewayURL: string, path: string): string {
  return `${gatewayURL.replace(/\/+$/, '')}${path}`;
}

async function readGatewayResponse<T>(response: Response): Promise<GatewayResult<T>> {
  const body = (await response.json().catch(() => null)) as GatewayResponseBody<T> | null;
  const message = body?.message ?? `The gateway answered with status ${response.status}`;
  if (!response.ok || body?.data == null) return fail({ status: response.status, message });
  return succeed(body.data);
}

async function callGateway<T>(
  fetchGateway: FetchGateway,
  url: string,
  init: RequestInit
): Promise<GatewayResult<T>> {
  try {
    return await readGatewayResponse<T>(await fetchGateway(url, init));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return fail({ status: 0, message: `The gateway could not be reached: ${reason}` });
  }
}

export function createProviderSettings(
  gatewayURL: string,
  appSecret: string,
  provider: GatewayProvider,
  handle: string
): ProviderSettings {
  assertServer();
  return {
    baseURL: joinURL(gatewayURL, PROVIDER_BASE_PATHS[provider]),
    apiKey: appSecret,
    headers: { [KEY_HANDLE_HEADER]: handle }
  };
}

export function createGatewayClient({
  gatewayURL,
  appSecret,
  fetch: fetchGateway = fetch
}: GatewayClientOptions): GatewayClient {
  assertServer();
  const authorization = { authorization: `Bearer ${appSecret}` };

  const revokeKey = async (handle: string): Promise<GatewayResult<RevokedKey>> => {
    const parsedHandle = parseHandle(handle);
    if (!parsedHandle.ok) return fail(INVALID_HANDLE_ERROR);
    const url = joinURL(gatewayURL, `/keys/${parsedHandle.value.keyID}`);
    return callGateway(fetchGateway, url, { method: 'DELETE', headers: authorization });
  };

  const importKeys = (apiKeys: string[]): Promise<GatewayResult<ImportedKeys>> =>
    callGateway(fetchGateway, joinURL(gatewayURL, '/keys/import'), {
      method: 'POST',
      headers: { ...authorization, 'content-type': 'application/json' },
      body: JSON.stringify({ apiKeys })
    });

  return {
    providerSettings: (provider, handle) =>
      createProviderSettings(gatewayURL, appSecret, provider, handle),
    revokeKey,
    importKeys
  };
}
