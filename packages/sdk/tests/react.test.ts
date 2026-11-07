import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import { FIDUCY_KEYS_CHANGED, saveConnectedKey } from '../src/keysApi';

let server: ReturnType<typeof Bun.serve>;
let lastBody: unknown = null;
const savedKey = {
  keyID: 'key_1',
  provider: 'openai' as const,
  createdAt: '2026-11-02T00:00:00.000Z'
};

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    async fetch(request) {
      lastBody = await request.json();
      if (new URL(request.url).pathname === '/fail/keys')
        return Response.json({ data: null, message: 'Sign in first' }, { status: 401 });
      return Response.json({ data: savedKey, message: 'Saved' }, { status: 201 });
    }
  });
});

afterAll(() => server.stop());

describe('saveConnectedKey', () => {
  it('posts the handle to the app route and announces the change', async () => {
    const target = new EventTarget();
    const events: unknown[] = [];
    target.addEventListener(FIDUCY_KEYS_CHANGED, (event) =>
      events.push((event as CustomEvent).detail)
    );
    const previousWindow = globalThis.window;
    Object.assign(globalThis, { window: target });
    try {
      const basePath = `${server.url.origin}/api/fiducy`;
      const key = await saveConnectedKey({ provider: 'openai', handle: 'kh_test' }, basePath);
      expect(key).toEqual(savedKey);
      expect(lastBody).toEqual({ provider: 'openai', handle: 'kh_test' });
      expect(events).toEqual([{ basePath, source: null }]);
    } finally {
      Object.assign(globalThis, { window: previousWindow });
    }
  });

  it('throws the server message when the save fails', async () => {
    await expect(
      saveConnectedKey({ provider: 'openai', handle: 'kh_test' }, `${server.url.origin}/fail`)
    ).rejects.toThrow('Sign in first');
  });
});

describe('@fiducy/sdk/react entry', () => {
  it('does not import TanStack Query', async () => {
    const result = await Bun.build({
      entrypoints: [new URL('../src/react.ts', import.meta.url).pathname],
      target: 'browser',
      packages: 'external'
    });
    expect(result.success).toBe(true);
    const code = await result.outputs.at(0)?.text();
    expect(code).not.toContain('@tanstack/react-query');
  });

  it('keeps useFiducyKeys in the react-query entry', async () => {
    const result = await Bun.build({
      entrypoints: [new URL('../src/reactQuery.ts', import.meta.url).pathname],
      target: 'browser',
      packages: 'external'
    });
    expect(await result.outputs.at(0)?.text()).toContain('@tanstack/react-query');
  });
});
