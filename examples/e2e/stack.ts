import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { startGatewayHarness } from '../../apps/gateway/tests/harness';

import type { AppRegistration } from '../../apps/gateway/src/types';
import type { ExampleApp, ExampleConnection } from './examples';

const ROOT = resolve(import.meta.dir, '../..');
const STARTUP_TIMEOUT_MILLISECONDS = 240000;

export const EXAMPLE_REGISTRATION: AppRegistration = {
  appID: 'app_examples_e2e',
  name: 'Example app',
  appSecret: 'fsk_examples_e2e_8Xk3Vn6Qp1Rw',
  monthlyRequestLimitPerKey: 1000,
  allowedOrigins: []
};

export function buildPackages() {
  for (const name of ['core', 'widget', 'sdk', 'farm']) {
    const build = Bun.spawnSync(['bun', 'run', 'build'], { cwd: join(ROOT, 'packages', name) });
    if (build.exitCode !== 0) throw new Error(`${name} build failed: ${build.stderr.toString()}`);
  }
}

export function startGateway() {
  return startGatewayHarness([EXAMPLE_REGISTRATION]);
}

async function waitForApp(url: string, process: Bun.Subprocess) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MILLISECONDS;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error(`The example exited with ${process.exitCode}`);
    const response = await fetch(url).catch(() => null);
    if (response?.ok) return;
    await Bun.sleep(1000);
  }
  throw new Error(`The example did not start at ${url}`);
}

export function chooseExamplePort(): number {
  return 5200 + Math.floor(Math.random() * 600);
}

export async function startExample(
  example: ExampleApp,
  connection: ExampleConnection,
  port = chooseExamplePort()
) {
  const appURL = `http://localhost:${port}`;
  EXAMPLE_REGISTRATION.allowedOrigins.push(appURL);
  const dataDirectory = mkdtempSync(join(tmpdir(), `fiducy-${example.name}-`));
  const directory = join(ROOT, 'examples', example.directory);
  const environmentFile = join(directory, '.env');
  writeFileSync(
    environmentFile,
    [
      `FIDUCY_GATEWAY_URL=${connection.gatewayURL}`,
      `FIDUCY_APP_ID=${connection.appID}`,
      `FIDUCY_APP_SECRET=${connection.appSecret}`,
      `EXAMPLE_DATA_DIR=${dataDirectory}`,
      ''
    ].join('\n')
  );
  const process = Bun.spawn(example.command(port), {
    cwd: directory,
    env: { PATH: Bun.env.PATH ?? '', HOME: Bun.env.HOME ?? '', PORT: String(port) },
    stdout: Bun.env.EXAMPLES_VERBOSE ? 'inherit' : 'ignore',
    stderr: Bun.env.EXAMPLES_VERBOSE ? 'inherit' : 'ignore'
  });
  await waitForApp(`${appURL}${example.readyPath ?? '/'}`, process);
  const readStoredKeyIDs = async () => {
    const file = Bun.file(join(dataDirectory, 'fiducy-keys.json'));
    const stored = (await file.json()) as { keys: { keyID: string }[] };
    return stored.keys.map((key) => key.keyID);
  };
  const stop = () => {
    process.kill();
    rmSync(environmentFile, { force: true });
  };
  return { appURL, readStoredKeyIDs, stop };
}
