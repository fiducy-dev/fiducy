import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

import { SAMPLE_API_KEY } from '@fiducy/testing';
import { EXAMPLE_APPS } from './examples';
import { STALE_KEY_MESSAGE, ask, signInAndConnectKey, waitForKeyState } from './flow';
import { buildPackages, chooseExamplePort, startExample } from './stack';

import type { Browser } from 'playwright';

const ROOT = resolve(import.meta.dir, '../..');
const CLI_PATH = join(ROOT, 'packages/cli/dist/index.js');
const selectedNames = Bun.env.EXAMPLES?.split(',') ?? EXAMPLE_APPS.map(({ name }) => name);

let browser: Browser;
let projectRoot: string;

function startDevGateway(port: number, origin: string) {
  return Bun.spawn(
    ['node', CLI_PATH, 'dev', '--mock', '--port', String(port), '--origin', origin],
    {
      cwd: projectRoot,
      stdout: Bun.env.EXAMPLES_VERBOSE ? 'inherit' : 'ignore',
      stderr: Bun.env.EXAMPLES_VERBOSE ? 'inherit' : 'ignore'
    }
  );
}

async function waitForGateway(url: string) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const response = await fetch(`${url}/health`).catch(() => null);
    if (response?.ok) return;
    await Bun.sleep(200);
  }
  throw new Error(`fiducy dev did not start at ${url}`);
}

beforeAll(async () => {
  buildPackages();
  const build = Bun.spawnSync(['bun', 'run', 'build'], { cwd: join(ROOT, 'packages/cli') });
  if (build.exitCode !== 0) throw new Error(`CLI build failed: ${build.stderr.toString()}`);
  browser = await chromium.launch();
}, 120000);

afterAll(async () => {
  await browser.close();
});

for (const example of EXAMPLE_APPS.filter(({ name }) => selectedNames.includes(name))) {
  describe(`npx fiducy dev with the ${example.name} example`, () => {
    it('serves the widget and model calls, keeps keys across restarts, and heals', async () => {
      projectRoot = mkdtempSync(join(tmpdir(), 'fiducy-cli-dev-'));
      const gatewayPort = chooseExamplePort();
      const gatewayURL = `http://localhost:${gatewayPort}`;
      const examplePort = chooseExamplePort();
      const origin = `http://localhost:${examplePort}`;
      let gateway = startDevGateway(gatewayPort, origin);
      await waitForGateway(gatewayURL);

      const statePath = join(projectRoot, '.fiducy/dev.json');
      expect(statSync(statePath).mode & 0o777).toBe(0o600);
      expect(statSync(join(projectRoot, '.env')).mode & 0o777).toBe(0o600);
      const state = JSON.parse(readFileSync(statePath, 'utf8'));
      const environment = readFileSync(join(projectRoot, '.env'), 'utf8');
      expect(environment).toContain(`FIDUCY_APP_SECRET=${state.appSecret}`);

      const app = await startExample(
        example,
        { gatewayURL, appID: state.appID, appSecret: state.appSecret },
        examplePort
      );
      const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
      const page = await context.newPage();
      try {
        await signInAndConnectKey(page, app.appURL);
        expect(await page.content()).not.toContain(SAMPLE_API_KEY);

        gateway.kill();
        await gateway.exited;
        gateway = startDevGateway(gatewayPort, origin);
        await waitForGateway(gatewayURL);
        await ask(page, 'Hello');

        rmSync(join(projectRoot, '.fiducy/dev-records.json'));
        await ask(page, STALE_KEY_MESSAGE);
        await page.reload();
        await waitForKeyState(page, 'connect');
        await page.screenshot({
          path: `${Bun.env.EXAMPLES_SCREENSHOTS ?? '/tmp'}/cli-dev-${example.name}.png`
        });
      } finally {
        await context.close();
        app.stop();
        gateway.kill();
        rmSync(projectRoot, { recursive: true, force: true });
      }
    }, 600000);
  });
}
