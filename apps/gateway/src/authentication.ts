import { fail, succeed } from '@fiducy/core';

import { APP_ID_QUERY_PARAMETER, APP_SECRET_HEADERS, FROZEN_APP_MESSAGE } from './constants';
import { describeFailure } from './responses';

import type { AppDirectory, GatewayResult, RegisteredApp, RevokeCaller } from './types';

export function readAppSecret(headers: Headers): string | null {
  for (const headerName of APP_SECRET_HEADERS) {
    const value = headers.get(headerName)?.trim();
    if (value) return value.replace(/^Bearer\s+/i, '');
  }
  return null;
}

export async function authenticateApp(
  appDirectory: AppDirectory,
  headers: Headers
): Promise<GatewayResult<RegisteredApp>> {
  const appSecret = readAppSecret(headers);
  if (!appSecret) return fail(describeFailure(401, 'Send your app secret as a Bearer token'));
  const app = await appDirectory.findAppBySecret(appSecret);
  if (!app) return fail(describeFailure(401, 'This app secret is not valid'));
  return succeed(app);
}

function matchesToken(received: string, expected: string): boolean {
  const receivedBytes = new TextEncoder().encode(received);
  const expectedBytes = new TextEncoder().encode(expected);
  if (receivedBytes.length !== expectedBytes.length) return false;
  let difference = 0;
  for (let index = 0; index < expectedBytes.length; index += 1) {
    difference |= (receivedBytes[index] ?? 0) ^ (expectedBytes[index] ?? 0);
  }
  return difference === 0;
}

export function isControlPlaneCall(headers: Headers, controlPlaneToken?: string): boolean {
  const bearer = readAppSecret(headers);
  if (!bearer || !controlPlaneToken) return false;
  return matchesToken(bearer, controlPlaneToken);
}

export async function identifyRevokeCaller(
  request: Request,
  appDirectory: AppDirectory,
  controlPlaneToken?: string
): Promise<GatewayResult<RevokeCaller>> {
  if (!isControlPlaneCall(request.headers, controlPlaneToken)) {
    const app = await authenticateApp(appDirectory, request.headers);
    if (!app.ok) return app;
    return succeed({ appID: app.value.appID, isControlPlane: false });
  }
  const appID = new URL(request.url).searchParams.get(APP_ID_QUERY_PARAMETER);
  if (!appID) return fail(describeFailure(400, `Send the app ID as ?${APP_ID_QUERY_PARAMETER}=`));
  return succeed({ appID, isControlPlane: true });
}

export function refuseFrozenApp(app: RegisteredApp): GatewayResult<RegisteredApp> {
  if (app.isFrozen) return fail(describeFailure(403, FROZEN_APP_MESSAGE));
  return succeed(app);
}
