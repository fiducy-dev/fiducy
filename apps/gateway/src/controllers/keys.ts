import { sealSecret } from '@fiducy/core';

import { authenticateApp, identifyRevokeCaller } from '../authentication';
import { respondWith, respondWithFailure, respondWithRateLimit } from '../responses';
import { identifyClient } from '../tokenBucketRateLimiter';
import { readJSONBody, validateImportKeysBody, validateStoreKeyBody } from '../validators';

import type { GatewayDependencies, KeySource, RegisteredApp, SealedKey } from '../types';

function isFromForeignOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (origin === null) return false;
  const gatewayHost = request.headers.get('host') ?? new URL(request.url).host;
  return URL.parse(origin)?.host !== gatewayHost;
}

async function sealAndStore(
  app: RegisteredApp,
  apiKey: string,
  source: KeySource,
  dependencies: GatewayDependencies
): Promise<SealedKey> {
  const { handle, record } = await sealSecret({
    appID: app.appID,
    apiKey,
    keyWrapper: dependencies.keyWrapper
  });
  if (app.recordStorage !== 'app') await dependencies.keyStore.saveRecord(record);
  await dependencies.keyEvents?.report({
    type: 'saved',
    appID: app.appID,
    keyID: record.keyID,
    source
  });
  return app.recordStorage === 'app' ? { handle, record } : { handle };
}

export async function storeKey(request: Request, dependencies: GatewayDependencies) {
  const rateLimit = dependencies.rateLimiter?.consumeToken(identifyClient(request));
  if (rateLimit?.isAllowed === false) return respondWithRateLimit(rateLimit.retryAfterSeconds);
  if (isFromForeignOrigin(request))
    return respondWith(403, null, 'Keys can only be added through the key widget');
  const body = validateStoreKeyBody(await readJSONBody(request));
  if (!body.ok) return respondWithFailure(body.error);
  const app = await dependencies.appDirectory.findApp(body.value.appID);
  if (!app) return respondWith(404, null, 'No app is registered with this appID');

  const sealed = await sealAndStore(app, body.value.apiKey, 'widget', dependencies);
  if (sealed.record) {
    return respondWith(201, sealed, 'Key sealed. Store the handle and the record');
  }
  return respondWith(201, sealed, 'Key stored. Save the handle, not the key');
}

export async function importKeys(request: Request, dependencies: GatewayDependencies) {
  if (request.headers.has('origin'))
    return respondWith(403, null, 'Import keys from your server, not from a browser');
  const app = await authenticateApp(dependencies.appDirectory, request.headers);
  if (!app.ok) return respondWithFailure(app.error);
  if (!app.value.allowKeyImport) {
    return respondWith(403, null, 'Key import is off for this app. Turn it on in the dashboard');
  }
  const body = validateImportKeysBody(await readJSONBody(request));
  if (!body.ok) return respondWithFailure(body.error);

  const keys: SealedKey[] = [];
  for (const apiKey of body.value.apiKeys) {
    keys.push(await sealAndStore(app.value, apiKey, 'import', dependencies));
  }
  return respondWith(201, { keys }, `Imported ${keys.length} keys. Save each handle`);
}

export async function revokeKey(
  request: Request,
  keyID: string,
  dependencies: GatewayDependencies
) {
  const caller = await identifyRevokeCaller(
    request,
    dependencies.appDirectory,
    dependencies.controlPlaneToken
  );
  if (!caller.ok) return respondWithFailure(caller.error);
  const app = await dependencies.appDirectory.findApp(caller.value.appID);
  if (!app) return respondWith(404, null, 'No app is registered with this appID');
  if (app.recordStorage === 'app') {
    return respondWith(409, null, 'This app stores its own records. Delete the record to revoke');
  }
  const record = await dependencies.keyStore.findRecord(keyID);
  if (record?.appID !== app.appID) return respondWith(404, null, 'No key found with this ID');

  await dependencies.keyStore.deleteRecord(keyID);
  if (!caller.value.isControlPlane) {
    await dependencies.keyEvents?.report({ type: 'revoked', appID: app.appID, keyID });
  }
  return respondWith(200, { keyID }, 'Key revoked');
}
