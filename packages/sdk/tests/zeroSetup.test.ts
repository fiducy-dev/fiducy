import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

import { CHAT_APP, startGatewayHarness } from '../../../apps/gateway/tests/harness';
import { createFiducy, memoryStorage, respondToMissingKey } from '../src/server';
import { APP_URL, appRequest, connectKey, createTestApp, readTestUser } from './fixtures';

import type { GatewayHarness } from './fixtures';

const ENVIRONMENT_NAMES = [
  'FIDUCY_GATEWAY_URL',
  'FIDUCY_APP_ID',
  'FIDUCY_APP_SECRET',
  'NEXT_PUBLIC_FIDUCY_APP_SECRET',
  'FIDUCY_ENCLAVE_PCR0',
  'FIDUCY_ENCLAVE_PCR16',
  'FIDUCY_SKIP_ATTESTATION'
];

let harness: GatewayHarness;

beforeAll(async () => {
  harness = await startGatewayHarness();
});

afterAll(() => harness.stop());

afterEach(() => {
  for (const name of ENVIRONMENT_NAMES) delete process.env[name];
});

function setConnectionEnvironment() {
  process.env.FIDUCY_GATEWAY_URL = harness.gatewayURL;
  process.env.FIDUCY_APP_ID = CHAT_APP.appID;
  process.env.FIDUCY_APP_SECRET = CHAT_APP.appSecret;
}

function createFromEnvironment() {
  return createFiducy({ storage: memoryStorage(), getUserID: readTestUser });
}

async function readBody(response: Response) {
  return (await response.json()) as { data: Record<string, unknown> | null; message: string };
}

describe('setup from server env', () => {
  it('reads the gateway URL, app ID and secret from FIDUCY_* env vars', async () => {
    setConnectionEnvironment();
    const fiducy = createFromEnvironment();
    await connectKey(harness, fiducy, CHAT_APP, 'env_user');
    const settings = await fiducy.providerSettings('openai', { userID: 'env_user' });
    if (!settings.ok) throw new Error(settings.message);
    const result = await generateText({
      model: createOpenAI(settings).chat('gpt-4o-mini'),
      prompt: 'hi'
    });
    expect(result.text).toBe('Hello');
  });

  it('reads an env object for frameworks that keep .env out of process.env', async () => {
    const fiducy = createFiducy({
      storage: memoryStorage(),
      getUserID: readTestUser,
      env: {
        FIDUCY_GATEWAY_URL: harness.gatewayURL,
        FIDUCY_APP_ID: CHAT_APP.appID,
        FIDUCY_APP_SECRET: CHAT_APP.appSecret
      }
    });
    const response = await fiducy.handler(appRequest('/config', null));
    expect(response.status).toBe(200);
  });

  it('serves the public config to the browser without sign-in or the secret', async () => {
    setConnectionEnvironment();
    const response = await createFromEnvironment().handler(appRequest('/config', null));
    const body = await readBody(response);
    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      gatewayURL: harness.gatewayURL,
      appID: CHAT_APP.appID,
      basePath: '/api/fiducy',
      enclavePCR0: null,
      enclavePCR16: null,
      skipAttestation: false
    });
    expect(JSON.stringify(body)).not.toContain(CHAT_APP.appSecret);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('tells the browser which enclave to expect, from FIDUCY_ENCLAVE_PCR0', async () => {
    setConnectionEnvironment();
    const rollover = `${'AB'.repeat(48)}, ${'cd'.repeat(48)}`;
    process.env.FIDUCY_ENCLAVE_PCR0 = rollover;
    process.env.FIDUCY_ENCLAVE_PCR16 = '11'.repeat(48);
    process.env.FIDUCY_SKIP_ATTESTATION = 'true';
    const body = await readBody(await createFromEnvironment().handler(appRequest('/config', null)));
    expect(body.data?.enclavePCR0).toBe(`${'ab'.repeat(48)},${'cd'.repeat(48)}`);
    expect(body.data?.enclavePCR16).toBe('11'.repeat(48));
    expect(body.data?.skipAttestation).toBe(true);
  });

  it('names a FIDUCY_ENCLAVE_PCR0 that is not a PCR0', async () => {
    setConnectionEnvironment();
    process.env.FIDUCY_ENCLAVE_PCR0 = 'sha384:abc';
    const response = await createFromEnvironment().handler(appRequest('/config', null));
    expect(response.status).toBe(500);
    expect((await readBody(response)).message).toContain('96-character hex PCR0');
  });

  it('names the missing env var instead of failing later', async () => {
    process.env.FIDUCY_GATEWAY_URL = harness.gatewayURL;
    const response = await createFromEnvironment().handler(appRequest('/config', null));
    expect(response.status).toBe(500);
    expect((await readBody(response)).message).toContain('FIDUCY_APP_SECRET');
  });

  it('rejects a gateway URL that is not a full URL', async () => {
    setConnectionEnvironment();
    process.env.FIDUCY_GATEWAY_URL = 'localhost:3438';
    const response = await createFromEnvironment().handler(appRequest('/config', null));
    expect((await readBody(response)).message).toContain('full http(s) URL');
  });

  it('refuses to start when the app secret is in a public env var', () => {
    setConnectionEnvironment();
    process.env.NEXT_PUBLIC_FIDUCY_APP_SECRET = CHAT_APP.appSecret;
    expect(() => createFromEnvironment()).toThrow(
      'NEXT_PUBLIC_FIDUCY_APP_SECRET is a public env var'
    );
    expect(() => createFromEnvironment()).not.toThrow(CHAT_APP.appSecret);
  });

  it('checks the env object a framework passes in', () => {
    expect(() =>
      createFiducy({
        storage: memoryStorage(),
        getUserID: readTestUser,
        env: { VITE_FIDUCY_APP_SECRET: CHAT_APP.appSecret }
      })
    ).toThrow('VITE_FIDUCY_APP_SECRET is a public env var');
  });
});

describe('providerSettings tells signed out apart from no key', () => {
  it('looks the user up from the request or from headers', async () => {
    const fiducy = createTestApp(harness, CHAT_APP);
    await connectKey(harness, fiducy, CHAT_APP, 'lookup_user');
    const fromRequest = await fiducy.providerSettings('openai', {
      request: appRequest('/chat', 'lookup_user')
    });
    const fromHeaders = await fiducy.providerSettings('openai', {
      headers: new Headers({ 'x-user': 'lookup_user' })
    });
    expect(fromRequest.ok).toBe(true);
    expect(fromHeaders.ok).toBe(true);
  });

  it('answers 401 when signed out and 409 when the key is missing', async () => {
    const fiducy = createTestApp(harness, CHAT_APP);
    const signedOut = await fiducy.providerSettings('openai', {
      request: appRequest('/chat', null)
    });
    const noKey = await fiducy.providerSettings('anthropic', { userID: 'nobody' });
    if (signedOut.ok || noKey.ok) throw new Error('expected missing keys');
    expect(signedOut.reason).toBe('signed-out');
    expect(noKey.reason).toBe('no-key');
    expect(respondToMissingKey(signedOut).status).toBe(401);
    const response = respondToMissingKey(noKey);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      data: { reason: 'no-key', provider: 'anthropic' },
      message: 'Connect your Anthropic key to keep going'
    });
  });
});

describe('stale handles heal themselves', () => {
  it('drops a handle once the gateway no longer has its key', async () => {
    const fiducy = createTestApp(harness, CHAT_APP);
    const { sealed } = await connectKey(harness, fiducy, CHAT_APP, 'stale_user');
    await harness.keyStore.deleteRecord(sealed.handle.slice(3, 25));
    const settings = await fiducy.providerSettings('openai', { userID: 'stale_user' });
    if (!settings.ok) throw new Error(settings.message);
    const call = generateText({
      model: createOpenAI(settings).chat('gpt-4o-mini'),
      prompt: 'hi',
      maxRetries: 0
    });
    expect(call).rejects.toThrow('The saved OpenAI key is no longer available. Connect it again.');
    await call.catch(() => null);
    const after = await fiducy.providerSettings('openai', { userID: 'stale_user' });
    expect(after).toMatchObject({ ok: false, reason: 'no-key' });
  });

  it('keeps the handle when the provider itself returns an error', async () => {
    const fiducy = createTestApp(harness, CHAT_APP);
    await connectKey(harness, fiducy, CHAT_APP, 'provider_error_user');
    const settings = await fiducy.providerSettings('openai', { userID: 'provider_error_user' });
    if (!settings.ok) throw new Error(settings.message);
    const response = await settings.fetch(`${settings.baseURL}/models/missing`, {
      headers: { ...settings.headers, authorization: `Bearer ${settings.apiKey}` }
    });
    expect(response.ok).toBe(false);
    expect((await fiducy.listKeys('provider_error_user')).length).toBe(1);
  });
});

describe('the key route only takes small JSON bodies from the same site', () => {
  it('rejects form posts, oversized bodies and lookalike paths', async () => {
    const fiducy = createTestApp(harness, CHAT_APP);
    const formPost = await fiducy.handler(
      appRequest('/keys', 'body_user', {
        method: 'POST',
        headers: { 'content-type': 'text/plain', origin: APP_URL },
        body: '{}'
      })
    );
    const oversized = await fiducy.handler(
      appRequest('/keys', 'body_user', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: APP_URL },
        body: JSON.stringify({ padding: 'x'.repeat(20000) })
      })
    );
    const lookalike = await fiducy.handler(
      new Request(`${APP_URL}/api/fiducyextra/keys`, { headers: { 'x-user': 'body_user' } })
    );
    expect(formPost.status).toBe(400);
    expect(oversized.status).toBe(400);
    expect(lookalike.status).toBe(404);
  });
});
