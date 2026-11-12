import { createLocalKeyWrapper } from '@fiducy/core';
import {
  createMemoryAppDirectory,
  createMemoryUsageLedger
} from '@fiducy/gateway/src/memoryStores.ts';
import { createGateway } from '@fiducy/gateway/src/router.ts';
import { createProviderRegistry } from '@fiducy/providers';
import { answerMockProviderRequest } from '@fiducy/testing';

import { DEV_APP_NAME, DEV_MONTHLY_REQUEST_LIMIT, DEV_ORIGIN_HOSTS } from '../constants.ts';
import { DEV_ORIGIN_PORTS, MOCK_PROVIDER_PATH_PREFIXES } from '../constants.ts';
import { createFileKeyStore } from './fileKeyStore.ts';

import type { RequestHandler } from '@fiducy/gateway/src/types.ts';
import type { DevState, Output } from '../types.ts';

export function listDevOrigins(extraOrigins: string[]): string[] {
  const defaults = DEV_ORIGIN_HOSTS.flatMap((host) =>
    DEV_ORIGIN_PORTS.map((port) => `http://${host}:${port}`)
  );
  return [...new Set([...defaults, ...extraOrigins])];
}

function explainBlockedOrigin(origin: string): Response {
  const message = `This dev gateway does not allow ${origin || 'this page'} to embed the key widget. Restart it with: npx fiducy dev --origin ${origin || '<your app origin>'}`;
  return new Response(message, {
    status: 403,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'x-content-type-options': 'nosniff' }
  });
}

interface DevGatewayInput {
  root: string;
  state: DevState;
  gatewayURL: string;
  origins: string[];
  mock: boolean;
  output: Output;
}

export async function createDevGatewayHandler(input: DevGatewayInput): Promise<RequestHandler> {
  const { root, state, gatewayURL, origins, mock, output } = input;
  const gateway = createGateway({
    keyWrapper: createLocalKeyWrapper(new Uint8Array(Buffer.from(state.masterKey, 'base64url'))),
    keyStore: createFileKeyStore(root),
    appDirectory: await createMemoryAppDirectory([
      {
        appID: state.appID,
        appSecret: state.appSecret,
        name: DEV_APP_NAME,
        monthlyRequestLimitPerKey: DEV_MONTHLY_REQUEST_LIMIT,
        allowedOrigins: origins
      }
    ]),
    usageLedger: createMemoryUsageLedger(),
    providerRegistry: createProviderRegistry(
      mock
        ? { openai: gatewayURL, anthropic: gatewayURL, gemini: gatewayURL, openrouter: gatewayURL }
        : undefined
    ),
    mockProviders: mock
  });
  return async (request) => {
    const url = new URL(request.url);
    if (mock && MOCK_PROVIDER_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
      return answerMockProviderRequest(url.pathname, await request.text());
    }
    const origin = url.searchParams.get('origin') ?? '';
    if (url.pathname === '/widget' && !origins.includes(origin)) {
      output.error(`Blocked the key widget for ${origin}. Restart with --origin ${origin}`);
      return explainBlockedOrigin(origin);
    }
    return gateway(request);
  };
}
