import { SAMPLE_API_KEY } from '@fiducy/testing';

import { createFiducy, memoryStorage } from '../src/server';

import type { AppRegistration } from '../../../apps/gateway/src/types';
import type { startGatewayHarness } from '../../../apps/gateway/tests/harness';
import type { CreateFiducyOptions, Fiducy, FiducyStorage } from '../src/server';
import type { FetchGateway } from '../src/types';

export type GatewayHarness = Awaited<ReturnType<typeof startGatewayHarness>>;

export const APP_URL = 'https://chat.example';

export function readTestUser(request: Request): string | null {
  return request.headers.get('x-user');
}

export function createTestApp(
  harness: GatewayHarness,
  app: AppRegistration,
  storage: FiducyStorage = memoryStorage(),
  fetchGateway: FetchGateway = fetch,
  extraOptions: Partial<CreateFiducyOptions> = {}
) {
  return createFiducy({
    gatewayURL: harness.gatewayURL,
    appSecret: app.appSecret,
    storage,
    getUserID: readTestUser,
    fetch: fetchGateway,
    ...extraOptions
  });
}

export function appRequest(path: string, user: string | null, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (user) headers.set('x-user', user);
  headers.set('host', 'chat.example');
  return new Request(`${APP_URL}/api/fiducy${path}`, { ...init, headers });
}

export async function connectKey(
  harness: GatewayHarness,
  fiducy: Fiducy,
  app: AppRegistration,
  user: string
) {
  const { body } = await harness.storeKey(app.appID, SAMPLE_API_KEY);
  const sealed = body.data;
  const response = await fiducy.handler(
    appRequest('/keys', user, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: APP_URL },
      body: JSON.stringify({ provider: 'openai', ...sealed })
    })
  );
  return { response, sealed };
}
