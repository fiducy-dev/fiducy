import { afterEach, describe, expect, it } from 'bun:test';

import { createLocalKeyWrapper } from '@fiducy/core';

import { startTlsFrontFromEnvironment } from '../src/environment';
import { createCaddyEnvironment } from '../src/tlsFront';

const TLS_FRONT_VARIABLES = ['FIDUCY_TLS_STATE_DIR', 'FIDUCY_CADDY_CONFIG', 'FIDUCY_PUBLIC_HOST'];

function readInChild(variable: string, environment: Record<string, string | undefined>): string {
  const child = Bun.spawnSync(['printenv', variable], { env: environment });
  return child.stdout.toString().trim();
}

afterEach(() => {
  for (const variable of TLS_FRONT_VARIABLES) delete process.env[variable];
});

describe('the TLS front', () => {
  it('hands Caddy the public host', () => {
    const environment = createCaddyEnvironment('gw.example');

    expect(readInChild('FIDUCY_PUBLIC_HOST', environment)).toBe('gw.example');
  });

  it('hands Caddy what was set after startup along with the rest of the environment', () => {
    process.env.FIDUCY_TLS_STATE_DIR = '/data/set-after-startup';
    const environment = createCaddyEnvironment('gw.example');

    expect(readInChild('FIDUCY_TLS_STATE_DIR', environment)).toBe('/data/set-after-startup');
    expect(readInChild('PATH', environment)).toBe(process.env.PATH ?? '');
  });

  it('refuses to start Caddy without a public host', async () => {
    process.env.FIDUCY_TLS_STATE_DIR = '/tmp/fiducy-tls-unused';
    process.env.FIDUCY_CADDY_CONFIG = '/tmp/fiducy-caddyfile-unused';
    const keyWrapper = createLocalKeyWrapper(crypto.getRandomValues(new Uint8Array(32)));

    await expect(startTlsFrontFromEnvironment(keyWrapper)).rejects.toThrow('FIDUCY_PUBLIC_HOST');
  });

  it('stays off when no TLS state directory is configured', async () => {
    const keyWrapper = createLocalKeyWrapper(crypto.getRandomValues(new Uint8Array(32)));

    expect(await startTlsFrontFromEnvironment(keyWrapper)).toBeUndefined();
  });
});
