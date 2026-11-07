import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createLocalKeyWrapper } from '@fiducy/core';
import { createProviderRegistry } from '@fiducy/providers';
import { startMockProvider } from '@fiducy/testing';

import {
  createMemoryAppDirectory,
  createMemoryKeyStore,
  createMemoryUsageLedger
} from '../../gateway/src/memoryStores';
import { createGateway } from '../../gateway/src/router';

const DEMO_PORT = 4900 + Math.floor(Math.random() * 500);
const STARTUP_TIMEOUT_MILLISECONDS = 60000;

export const DEMO_APP_ID = 'app_demo_chat';
export const DEMO_APP_SECRET = 'fsk_demo_e2e_5Kq8Wn2Rv7Ty3Lp';

async function waitForDemo(demoURL: string) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MILLISECONDS;
  while (Date.now() < deadline) {
    const response = await fetch(demoURL).catch(() => null);
    if (response?.ok) return;
    await Bun.sleep(500);
  }
  throw new Error('The demo did not start in time');
}

function buildPackage(name: string) {
  const build = Bun.spawnSync(['bun', 'run', 'build'], {
    cwd: join(import.meta.dir, '../../../packages', name)
  });
  if (build.exitCode !== 0) throw new Error(`${name} build failed: ${build.stderr.toString()}`);
}

async function startGateway(demoURL: string, providerURL: string) {
  const usageLedger = createMemoryUsageLedger();
  const gateway = createGateway({
    keyWrapper: createLocalKeyWrapper(crypto.getRandomValues(new Uint8Array(32))),
    keyStore: createMemoryKeyStore(),
    appDirectory: await createMemoryAppDirectory([
      {
        appID: DEMO_APP_ID,
        name: 'Demo chat',
        appSecret: DEMO_APP_SECRET,
        monthlyRequestLimitPerKey: 1,
        allowedOrigins: [demoURL]
      }
    ]),
    usageLedger,
    providerRegistry: createProviderRegistry({ openai: providerURL })
  });
  const server = Bun.serve({ port: 0, fetch: gateway });
  return { server, usageLedger, gatewayURL: `http://localhost:${server.port}` };
}

export async function startDemoStack() {
  const demoURL = `http://localhost:${DEMO_PORT}`;
  buildPackage('core');
  buildPackage('widget');
  buildPackage('sdk');
  buildPackage('farm');
  buildPackage('assistant-ui');
  const dataDirectory = mkdtempSync(join(tmpdir(), 'fiducy-demo-'));
  const mockProvider = startMockProvider();
  const gateway = await startGateway(demoURL, mockProvider.baseURL);
  const demo = Bun.spawn(['bunx', 'farm', 'dev', '--port', String(DEMO_PORT)], {
    cwd: join(import.meta.dir, '..'),
    env: {
      ...process.env,
      FIDUCY_GATEWAY_URL: gateway.gatewayURL,
      FIDUCY_APP_ID: DEMO_APP_ID,
      FIDUCY_APP_SECRET: DEMO_APP_SECRET,
      FIDUCY_DEMO_DATA_DIR: dataDirectory
    },
    stdout: 'ignore',
    stderr: 'ignore'
  });
  await waitForDemo(demoURL);

  const stop = async () => {
    gateway.server.stop(true);
    mockProvider.server.stop(true);
    demo.kill();
    await demo.exited;
    rmSync(dataDirectory, { recursive: true, force: true });
  };

  return { demoURL, dataDirectory, gatewayURL: gateway.gatewayURL, mockProvider, stop };
}
