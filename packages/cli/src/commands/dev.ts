import { join } from 'node:path';

import { DEV_HOST, PRIVATE_FILE_MODE } from '../constants.ts';
import { createDevGatewayHandler, listDevOrigins } from '../dev/gateway.ts';
import { PortInUseError, serveOnLocalhost } from '../dev/server.ts';
import { loadDevState } from '../dev/state.ts';
import { readEnvironmentFiles } from '../environment.ts';
import { readText, writeNewFile } from '../files.ts';
import { UsageError, parseFlags, readBoolean, readString, readStrings } from '../flags.ts';
import { isOrigin, isPort } from '../validators.ts';

import type { CommandContext, DevGateway, DevOptions, DevState, Output } from '../types.ts';

export const DEV_HELP = `Usage: fiducy dev [--port 3438] [--origin http://localhost:5173] [--mock]

Runs a local Fiducy gateway on 127.0.0.1 for development. It keeps a dev app ID,
app secret and master key in .fiducy/ (git-ignored, readable only by you), so
saved keys survive restarts.

  --port     Port for the gateway (default 3438, remembered after the first run)
  --origin   Extra origin allowed to embed the key widget (repeatable)
  --mock     Answer OpenAI and Anthropic calls with a fake model, so no real key is spent`;

function readDevOptions(argv: string[]): DevOptions {
  const flags = parseFlags(argv, {
    port: { type: 'string' },
    origin: { type: 'string', multiple: true },
    mock: { type: 'boolean' }
  });
  const portText = readString(flags, 'port');
  const port = portText === undefined ? undefined : Number(portText);
  if (port !== undefined && !isPort(port)) throw new UsageError(`--port ${portText} is not a port`);
  const origins = readStrings(flags, 'origin').map((origin) => origin.replace(/\/$/, ''));
  for (const origin of origins) {
    if (!isOrigin(origin)) {
      throw new UsageError(`--origin ${origin} is not an origin like http://localhost:5173`);
    }
  }
  return { port, origins, mock: readBoolean(flags, 'mock') };
}

function buildEnvironmentLines(state: DevState, gatewayURL: string): string[] {
  return [
    `FIDUCY_GATEWAY_URL=${gatewayURL}`,
    `FIDUCY_APP_ID=${state.appID}`,
    `FIDUCY_APP_SECRET=${state.appSecret}`
  ];
}

function isEnvironmentIgnored(root: string): boolean {
  const lines = (readText(join(root, '.gitignore')) ?? '').split('\n').map((line) => line.trim());
  return lines.some((line) => ['.env', '.env*', '.env.*', '*.env', '/.env'].includes(line));
}

function reportEnvironment(root: string, lines: string[], output: Output) {
  const current = readEnvironmentFiles(root);
  const expected = Object.fromEntries(lines.map((line) => line.split('=', 2) as [string, string]));
  const missing = Object.keys(expected).filter((name) => current[name] === undefined);
  const different = Object.keys(expected).filter(
    (name) => current[name] !== undefined && current[name] !== expected[name]
  );
  if (missing.length === Object.keys(expected).length) {
    const created = writeNewFile(join(root, '.env'), `${lines.join('\n')}\n`, PRIVATE_FILE_MODE);
    if (created) {
      output.info('Wrote .env with the dev gateway settings. Restart your dev server to load it.');
      if (!isEnvironmentIgnored(root)) output.info('Add .env to your .gitignore.');
      return;
    }
  }
  if (missing.length === 0 && different.length === 0) {
    output.info('Your env files already point at this dev gateway.');
    return;
  }
  output.info('Add these lines to your server env file, then restart your dev server:');
  for (const line of lines) output.info(`  ${line}`);
  if (different.length > 0) {
    output.info(`Your env files have different values for ${different.join(', ')}.`);
  }
}

export async function startDevGateway(
  root: string,
  options: DevOptions,
  output: Output
): Promise<DevGateway> {
  const state = loadDevState(root, options.port);
  const gatewayURL = `http://localhost:${state.port}`;
  const origins = listDevOrigins(options.origins);
  const handler = await createDevGatewayHandler({
    root,
    state,
    gatewayURL,
    origins,
    mock: options.mock,
    output
  });
  const server = await serveOnLocalhost(handler, DEV_HOST, state.port);
  return { url: gatewayURL, state, close: server.close };
}

function waitForStop(gateway: DevGateway) {
  return new Promise<number>((resolve) => {
    const stop = () => {
      gateway.close().then(() => resolve(0));
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  });
}

export async function runDev(argv: string[], { cwd, output }: CommandContext): Promise<number> {
  const options = readDevOptions(argv);
  let gateway: DevGateway;
  try {
    gateway = await startDevGateway(cwd, options, output);
  } catch (error) {
    if (!(error instanceof PortInUseError)) throw error;
    output.error(
      `Port ${error.message} is busy. Run npx fiducy dev --port <free port>; the new port is remembered.`
    );
    return 1;
  }
  output.info(
    `Fiducy dev gateway on ${gateway.url}${options.mock ? ' with a fake model (--mock)' : ''}`
  );
  reportEnvironment(cwd, buildEnvironmentLines(gateway.state, gateway.url), output);
  output.info(
    'Widget origins: localhost and 127.0.0.1 on common dev ports. Add others with --origin.'
  );
  output.info('Keys stay in .fiducy/ until you delete it. Ctrl+C to stop.');
  return waitForStop(gateway);
}
