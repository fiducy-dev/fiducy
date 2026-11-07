import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createLocalKeyWrapper } from '@fiducy/core';
import { createProviderRegistry } from '@fiducy/providers';
import { startMockProvider } from '@fiducy/testing';

import { createMemoryKeyStore } from '../../gateway/src/memoryStores';
import { createRemoteAppDirectory } from '../../gateway/src/remoteAppDirectory';
import { createRemoteKeyEvents } from '../../gateway/src/remoteKeyEvents';
import { createRemoteUsageLedger } from '../../gateway/src/remoteUsageLedger';
import { createGateway } from '../../gateway/src/router';

const GATEWAY_TOKEN = 'gateway_token_e2e_7Hn3Qs9Vb2';
const CONTROL_PLANE_PORT = 4400 + Math.floor(Math.random() * 500);
const STARTUP_TIMEOUT_MILLISECONDS = 60000;

async function waitForControlPlane(controlPlaneURL: string) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MILLISECONDS;
  while (Date.now() < deadline) {
    const response = await fetch(`${controlPlaneURL}/api/config`).catch(() => null);
    if (response?.ok) return;
    await Bun.sleep(500);
  }
  throw new Error('The control plane did not start in time');
}

function startGateway(controlPlaneURL: string, providerURL: string) {
  const connection = { controlPlaneURL, gatewayToken: GATEWAY_TOKEN };
  const usageLedger = createRemoteUsageLedger({ ...connection, flushIntervalMilliseconds: 60000 });
  const gateway = createGateway({
    keyWrapper: createLocalKeyWrapper(crypto.getRandomValues(new Uint8Array(32))),
    keyStore: createMemoryKeyStore(),
    keyEvents: createRemoteKeyEvents(connection),
    appDirectory: createRemoteAppDirectory({ ...connection, refreshIntervalMilliseconds: 60000 }),
    usageLedger,
    providerRegistry: createProviderRegistry({ openai: providerURL }),
    controlPlaneToken: GATEWAY_TOKEN
  });
  const server = Bun.serve({ port: 0, fetch: gateway });
  return { server, usageLedger, gatewayURL: `http://localhost:${server.port}` };
}

export async function startStack() {
  const controlPlaneURL = `http://localhost:${CONTROL_PLANE_PORT}`;
  const mockProvider = startMockProvider();
  const gateway = startGateway(controlPlaneURL, mockProvider.baseURL);
  const controlPlane = Bun.spawn(['bunx', 'farm', 'dev', '--port', String(CONTROL_PLANE_PORT)], {
    cwd: join(import.meta.dir, '..'),
    env: {
      ...process.env,
      FARM_AUTH_URL: controlPlaneURL,
      FIDUCY_CONTROL_DATA_DIR: mkdtempSync(join(tmpdir(), 'fiducy-control-')),
      FIDUCY_GATEWAY_TOKEN: GATEWAY_TOKEN,
      FIDUCY_GATEWAY_URL: gateway.gatewayURL
    },
    stdout: 'ignore',
    stderr: 'ignore'
  });
  await waitForControlPlane(controlPlaneURL);

  const stop = async () => {
    await gateway.usageLedger.stop();
    gateway.server.stop(true);
    mockProvider.server.stop(true);
    controlPlane.kill();
    await controlPlane.exited;
  };

  return {
    controlPlaneURL,
    gatewayURL: gateway.gatewayURL,
    usageLedger: gateway.usageLedger,
    stop
  };
}
