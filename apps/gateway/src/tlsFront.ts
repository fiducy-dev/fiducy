import { TLS_STATE_PERSIST_INTERVAL_MILLISECONDS } from './constants';
import { createTlsStateKeeper } from './tlsState';

import type { TlsFrontOptions, TlsStateKeeper } from './types';

function startCaddy(configPath: string): Bun.Subprocess {
  return Bun.spawn(['caddy', 'run', '--config', configPath, '--adapter', 'caddyfile'], {
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
  ...stateOptions
}: TlsFrontOptions): Promise<TlsStateKeeper> {
  const keeper = createTlsStateKeeper(stateOptions);
  const restored = await keeper.restore();
  console.log(
    restored ? 'Restored the TLS state' : 'No TLS state yet; Caddy will request a certificate'
  );
  startCaddy(caddyConfigPath);
  keeper.start(TLS_STATE_PERSIST_INTERVAL_MILLISECONDS);
  return keeper;
}
