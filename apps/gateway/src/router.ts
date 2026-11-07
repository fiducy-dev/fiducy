import { KEY_IMPORT_PATH, KEY_ROUTE_PATTERN, PROVIDER_ROUTE_PATTERN } from './constants';
import { serveAttestation } from './controllers/attestation';
import { importKeys, revokeKey, storeKey } from './controllers/keys';
import { proxyProviderRequest } from './controllers/proxy';
import { serveWidget, serveWidgetFont } from './controllers/widget';
import { respondWith } from './responses';
import { WIDGET_FONT_PATH } from './widget/font';

import type { ProviderName } from '@fiducy/providers';
import type { GatewayDependencies, RequestHandler } from './types';

async function routeRequest(request: Request, dependencies: GatewayDependencies) {
  const { pathname, search } = new URL(request.url);
  if (request.method === 'GET' && pathname === '/health')
    return respondWith(200, { status: 'ok' }, 'Gateway is up');
  if (request.method === 'GET' && pathname === '/attestation')
    return serveAttestation(request, dependencies);
  if (request.method === 'GET' && pathname === '/widget') return serveWidget(request, dependencies);
  if (request.method === 'GET' && pathname === WIDGET_FONT_PATH) return serveWidgetFont();
  if (request.method === 'POST' && pathname === '/keys') return storeKey(request, dependencies);
  if (request.method === 'POST' && pathname === KEY_IMPORT_PATH)
    return importKeys(request, dependencies);

  const keyRoute = KEY_ROUTE_PATTERN.exec(pathname);
  if (request.method === 'DELETE' && keyRoute?.[1])
    return revokeKey(request, keyRoute[1], dependencies);

  const providerRoute = PROVIDER_ROUTE_PATTERN.exec(pathname);
  const providerName = providerRoute?.[1] as ProviderName | undefined;
  const providerPath = providerRoute?.[2];
  if (providerName && providerPath) {
    return proxyProviderRequest(request, providerName, `${providerPath}${search}`, dependencies);
  }
  return respondWith(404, null, 'Route not found');
}

export function createGateway(dependencies: GatewayDependencies): RequestHandler {
  return async (request) => {
    try {
      return await routeRequest(request, dependencies);
    } catch (error) {
      console.error(
        `Unexpected gateway error: ${error instanceof Error ? error.message : String(error)}`
      );
      return respondWith(500, null, 'Something went wrong');
    }
  };
}
