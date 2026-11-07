import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createLocalKeyWrapper } from '@fiducy/core';
import { createProviderRegistry } from '@fiducy/providers';
import { startMockProvider } from '@fiducy/testing';

import { createRemoteAppDirectory } from '../src/remoteAppDirectory';
import { createRemoteKeyEvents } from '../src/remoteKeyEvents';
import { createRemoteUsageLedger } from '../src/remoteUsageLedger';
import { createGateway } from '../src/router';

import type { SealedRecord } from '@fiducy/core';
import type { KeyStore } from '../src/types';

interface PrototypeSecrets {
  gatewayToken: string;
  masterKey: string;
  demoAppID?: string;
  demoAppSecret?: string;
}

const ROOT = join(import.meta.dir, '../../..');
const STATE_DIR = join(ROOT, '.prototype');
const SECRETS_PATH = join(STATE_DIR, 'secrets.json');
const KEY_RECORDS_PATH = join(STATE_DIR, 'key-records.json');
const CONTROL_PORT = 3000;
const DEMO_PORT = 3001;
const GATEWAY_PORT = 8787;
const STARTUP_TIMEOUT_MILLISECONDS = 120000;

const useMockProvider = process.argv.includes('--mock');
const controlURL = `http://localhost:${CONTROL_PORT}`;
const demoURL = `http://localhost:${DEMO_PORT}`;
const gatewayURL = `http://localhost:${GATEWAY_PORT}`;

function randomToken(byteLength: number): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(byteLength))).toString('base64url');
}

function loadSecrets(): PrototypeSecrets {
  mkdirSync(STATE_DIR, { recursive: true });
  if (existsSync(SECRETS_PATH)) return JSON.parse(readFileSync(SECRETS_PATH, 'utf8'));
  const secrets = { gatewayToken: randomToken(32), masterKey: randomToken(32) };
  writeFileSync(SECRETS_PATH, JSON.stringify(secrets, null, 2), { mode: 0o600 });
  return secrets;
}

function createFileKeyStore(path: string): KeyStore {
  const records = new Map<string, SealedRecord>(
    existsSync(path) ? Object.entries(JSON.parse(readFileSync(path, 'utf8'))) : []
  );
  const save = () =>
    writeFileSync(path, JSON.stringify(Object.fromEntries(records), null, 2), { mode: 0o600 });
  return {
    saveRecord: async (record) => {
      records.set(record.keyID, record);
      save();
    },
    findRecord: async (keyID) => records.get(keyID) ?? null,
    deleteRecord: async (keyID) => {
      const deleted = records.delete(keyID);
      if (deleted) save();
      return deleted;
    }
  };
}

async function waitFor(url: string, name: string, process: Bun.Subprocess) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MILLISECONDS;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error(`${name} exited with code ${process.exitCode}`);
    const response = await fetch(url).catch(() => null);
    if (response?.ok) return;
    await Bun.sleep(500);
  }
  throw new Error(`${name} did not start at ${url}`);
}

function startFarmApp(directory: string, port: number, env: Record<string, string>) {
  return Bun.spawn(['bunx', 'farm', 'dev', '--port', String(port)], {
    cwd: join(ROOT, 'apps', directory),
    env: { ...process.env, ...env },
    stdout: 'ignore',
    stderr: 'inherit'
  });
}

function startDemo(secrets: PrototypeSecrets) {
  if (!secrets.demoAppID || !secrets.demoAppSecret) {
    console.log(`
No demo app yet. Create one in the dashboard at ${controlURL} with ${demoURL} as an allowed
origin, then add its ID and secret to ${SECRETS_PATH} as demoAppID and demoAppSecret and run again.`);
    return null;
  }
  return startFarmApp('demo', DEMO_PORT, {
    FIDUCY_APP_ID: secrets.demoAppID,
    FIDUCY_APP_SECRET: secrets.demoAppSecret,
    FIDUCY_GATEWAY_URL: gatewayURL
  });
}

if (!Bun.which('node')) {
  console.error('Farm.js runs on Node. Install Node 22 or newer (for example: nvm install 22).');
  process.exit(1);
}

const secrets = loadSecrets();
const connection = { controlPlaneURL: controlURL, gatewayToken: secrets.gatewayToken };

const controlPlane = startFarmApp('control-plane', CONTROL_PORT, {
  FARM_AUTH_URL: controlURL,
  FIDUCY_CONTROL_DATA_DIR: join(STATE_DIR, 'control'),
  FIDUCY_GATEWAY_TOKEN: secrets.gatewayToken,
  FIDUCY_GATEWAY_URL: gatewayURL
});
await waitFor(`${controlURL}/api/config`, 'The control plane', controlPlane);

const mockProvider = useMockProvider ? startMockProvider() : null;

function logMockRequests(provider: ReturnType<typeof startMockProvider>) {
  let seen = 0;
  setInterval(() => {
    for (const request of provider.recordedRequests.slice(seen)) {
      const apiKey = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
      console.log(
        `[fake OpenAI] ${request.path} received the decrypted key ...${apiKey.slice(-4)}`
      );
    }
    seen = provider.recordedRequests.length;
  }, 500);
}
if (mockProvider) logMockRequests(mockProvider);
const usageLedger = createRemoteUsageLedger({ ...connection, flushIntervalMilliseconds: 5000 });
const gateway = Bun.serve({
  port: GATEWAY_PORT,
  idleTimeout: 255,
  fetch: createGateway({
    keyWrapper: createLocalKeyWrapper(new Uint8Array(Buffer.from(secrets.masterKey, 'base64url'))),
    keyStore: createFileKeyStore(KEY_RECORDS_PATH),
    keyEvents: createRemoteKeyEvents(connection),
    appDirectory: createRemoteAppDirectory({ ...connection, refreshIntervalMilliseconds: 30000 }),
    usageLedger,
    providerRegistry: createProviderRegistry(
      mockProvider ? { openai: mockProvider.baseURL } : undefined
    ),
    mockProviders: mockProvider !== null
  })
});

const buildSDK = Bun.spawnSync(['bun', 'run', 'build'], { cwd: join(ROOT, 'packages/sdk') });
if (buildSDK.exitCode !== 0) throw new Error(`SDK build failed: ${buildSDK.stderr.toString()}`);
const demo = startDemo(secrets);
if (demo) await waitFor(demoURL, 'The demo', demo);

console.log(`
Fiducy prototype is running${useMockProvider ? ' with a fake OpenAI' : ''}
  Demo chat:      ${demo ? demoURL : 'not started'}
  Dashboard:      ${controlURL}
  Gateway:        ${gatewayURL}/health
State lives in .prototype/ (delete it to start fresh). Ctrl+C to stop.`);

const stop = async () => {
  await usageLedger.stop();
  gateway.stop(true);
  mockProvider?.server.stop(true);
  controlPlane.kill();
  demo?.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
