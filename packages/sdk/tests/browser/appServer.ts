import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createFiducy, memoryStorage } from '../../src/server';
import { PAGE_SCRIPTS } from './entries';

import type { AppRegistration } from '../../../../apps/gateway/src/types';
import type { GatewayHarness } from '../fixtures';

const USER_COOKIE = 'example_user';

function readUser(request: Request): string | null {
  const cookies = request.headers.get('cookie') ?? '';
  return new RegExp(`(?:^|;\\s*)${USER_COOKIE}=([a-z0-9_]+)`).exec(cookies)?.[1] ?? null;
}

async function buildPageScripts(): Promise<Map<string, string>> {
  const directory = join(import.meta.dir, '.pages');
  mkdirSync(directory, { recursive: true });
  const scripts = new Map<string, string>();
  for (const [name, source] of Object.entries(PAGE_SCRIPTS)) {
    const entry = join(directory, `${name}.ts`);
    writeFileSync(entry, source);
    const build = await Bun.build({ entrypoints: [entry], target: 'browser', format: 'esm' });
    if (!build.success) throw new Error(build.logs.map(String).join('\n'));
    scripts.set(name, (await build.outputs[0]?.text()) ?? '');
  }
  return scripts;
}

function renderPage(name: string): string {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:16px;font:16px system-ui;color:#111">
<h1 style="font-size:18px">Settings</h1>
<div id="slot"></div>
<script>window.events = []; window.recordEvent = (type, detail) => window.events.push({ type, detail });</script>
<script type="module" src="/${name}.js"></script>
</body></html>`;
}

export async function startElementApp(harness: GatewayHarness, app: AppRegistration) {
  const scripts = await buildPageScripts();
  const storage = memoryStorage();
  const fiducy = createFiducy({
    gatewayURL: harness.gatewayURL,
    appID: app.appID,
    appSecret: app.appSecret,
    storage,
    getUserID: readUser
  });
  const server = Bun.serve({
    port: 0,
    fetch: (request) => {
      const { pathname } = new URL(request.url);
      if (pathname.startsWith('/api/fiducy')) return fiducy.handler(request);
      const script = pathname.endsWith('.js') ? scripts.get(pathname.slice(1, -3)) : undefined;
      if (script) return new Response(script, { headers: { 'content-type': 'text/javascript' } });
      return new Response(renderPage(pathname.slice(1) || 'element'), {
        headers: { 'content-type': 'text/html' }
      });
    }
  });
  const appURL = `http://127.0.0.1:${server.port}`;
  return { server, appURL, fiducy, storage, userCookie: USER_COOKIE };
}
