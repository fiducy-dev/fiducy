import { describe, expect, it } from 'bun:test';

import { createLocalKeyWrapper } from '@fiducy/core';
import { createProviderRegistry } from '@fiducy/providers';

import { createMemoryAppDirectory, createMemoryKeyStore } from '../src/memoryStores';
import { createMemoryUsageLedger } from '../src/memoryStores';
import { createGateway } from '../src/router';
import { CHAT_APP } from './harness';

import type { GatewayDependencies } from '../src/types';

async function readWidgetPage(options: Partial<GatewayDependencies>) {
  const gateway = createGateway({
    keyWrapper: createLocalKeyWrapper(crypto.getRandomValues(new Uint8Array(32))),
    keyStore: createMemoryKeyStore(),
    appDirectory: await createMemoryAppDirectory([CHAT_APP]),
    usageLedger: createMemoryUsageLedger(),
    providerRegistry: createProviderRegistry(),
    ...options
  });
  const origin = encodeURIComponent(CHAT_APP.allowedOrigins[0] ?? '');
  const response = await gateway(
    new Request(`http://gateway/widget?app=${CHAT_APP.appID}&origin=${origin}`)
  );
  expect(response.status).toBe(200);
  return response.text();
}

describe('what the key widget says about where the key goes', () => {
  it('says the key is sealed in an enclave only when the gateway can attest', async () => {
    const page = await readWidgetPage({ attest: async () => new Uint8Array([1]) });
    expect(page).toContain('Sealed in an enclave');
    expect(page).toContain('never sees your key. It is sealed');
  });

  it('asks for a made-up key on a test gateway with mock providers', async () => {
    const page = await readWidgetPage({ mockProviders: true });
    expect(page).not.toContain('Sealed in an enclave');
    expect(page).toContain('Test gateway');
    expect(page).toContain('Enter a made-up key, not a real one.');
  });

  it('says plainly that there is no enclave on any other gateway', async () => {
    const page = await readWidgetPage({});
    expect(page).not.toContain('Sealed in an enclave');
    expect(page).toContain('No enclave');
    expect(page).toContain('this gateway is not running in an enclave');
  });
});
