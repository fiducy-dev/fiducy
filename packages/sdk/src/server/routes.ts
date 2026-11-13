import { KEY_ID_PATH_PATTERN } from '../constants.ts';
import { requireAppID } from './environment.ts';
import { FiducyConfigurationError, FiducyGatewayError, FiducyInputError } from './errors.ts';
import { isCrossSite, readJSONBody, respondWith } from './http.ts';
import { readSaveKeyInput } from './validators.ts';

import type { RouterInput } from './types.ts';

function respondToError(error: unknown): Response {
  if (error instanceof FiducyInputError) return respondWith(400, null, error.message);
  if (error instanceof FiducyGatewayError) return respondWith(502, null, error.message);
  if (error instanceof FiducyConfigurationError) return respondWith(500, null, error.message);
  throw error;
}

export function createRouter({ basePath, getUserID, readConnection, actions }: RouterInput) {
  const serveConfig = () => {
    const connection = readConnection();
    const { gatewayURL, enclavePCR0, enclavePCR16, skipAttestation } = connection;
    const appID = requireAppID(connection);
    const config = { gatewayURL, appID, basePath, enclavePCR0, enclavePCR16, skipAttestation };
    return respondWith(200, config, 'Fiducy config loaded');
  };

  const routeKeys = async (request: Request, userID: string, path: string) => {
    if (path === '/keys' && request.method === 'GET') {
      return respondWith(200, { keys: await actions.listKeys(userID) }, 'Keys loaded');
    }
    if (isCrossSite(request)) return respondWith(403, null, 'Cross-site requests are not allowed');
    if (path === '/keys' && request.method === 'POST') {
      const input = readSaveKeyInput(await readJSONBody(request));
      return respondWith(201, await actions.saveKey(userID, input), 'Key connected');
    }
    const keyID = KEY_ID_PATH_PATTERN.exec(path)?.[1];
    if (keyID && request.method === 'DELETE') {
      const revoked = await actions.revokeKey(userID, keyID);
      if (!revoked) return respondWith(404, null, 'No key with this ID for this user');
      return respondWith(200, { keyID }, 'Key revoked');
    }
    return respondWith(404, null, 'Route not found');
  };

  const routeRequest = async (request: Request) => {
    const { pathname } = new URL(request.url);
    const path = pathname.slice(basePath.length);
    if (!pathname.startsWith(basePath) || (path !== '' && !path.startsWith('/'))) {
      return respondWith(404, null, `Fiducy only answers under ${basePath}`);
    }
    if (path === '/config' && request.method === 'GET') return serveConfig();
    const userID = await getUserID(request);
    if (!userID) return respondWith(401, null, 'Sign in to manage your API keys');
    return routeKeys(request, userID, path);
  };

  return async (request: Request) => {
    try {
      return await routeRequest(request);
    } catch (error) {
      return respondToError(error);
    }
  };
}
