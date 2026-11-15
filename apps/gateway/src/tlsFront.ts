import { TLS_STATE_PERSIST_INTERVAL_MILLISECONDS } from './constants';
import { createTlsStateKeeper } from './tlsState';

import type { TlsFrontOptions, TlsStateKeeper } from './types';

// A child process gets the environment this process started with unless it is handed one, and
// the public host only arrives later, from the enclave config. So Caddy is handed it explicitly.
export function createCaddyEnvironment(publicHost: string): Record<string, string | undefined> {
  return { ...process.env, FIDUCY_PUBLIC_HOST: publicHost };
}

function startCaddy(configPath: string, publicHost: string): Bun.Subprocess {
  return Bun.spawn(['caddy', 'run', '--config', configPath, '--adapter', 'caddyfile'], {
    env: createCaddyEnvironment(publicHost),
    stdout: 'inherit',
    stderr: 'inherit',
    onExit: (_process, exitCode) => {
      console.error(`Caddy exited with code ${exitCode ?? 'unknown'}; stopping the gateway`);
      process.exit(1);
    }
  });
}

export async function startTlsFront({
  caddyConfigPath,
  publicHost,
  ...stateOptions
}: TlsFrontOptions): Promise<TlsStateKeeper> {
  const keeper = createTlsStateKeeper(stateOptions);
  const restored = await keeper.restore();
  console.log(
    restored ? 'Restored the TLS state' : 'No TLS state yet; Caddy will request a certificate'
  );
  startCaddy(caddyConfigPath, publicHost);
  keeper.start(TLS_STATE_PERSIST_INTERVAL_MILLISECONDS);
  return keeper;
}
