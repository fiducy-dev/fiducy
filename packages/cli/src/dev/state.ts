import { join } from 'node:path';

import { DEFAULT_DEV_PORT, DEV_STATE_FILE } from '../constants.ts';
import { ensureStateDirectory, readText, writePrivateFile } from '../files.ts';
import { isDevState } from '../validators.ts';

import type { DevState } from '../types.ts';

function randomToken(byteLength: number): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(byteLength))).toString('base64url');
}

function createDevState(port: number): DevState {
  return {
    appID: `app_dev_${randomToken(9)}`,
    appSecret: `fsk_dev_${randomToken(24)}`,
    masterKey: randomToken(32),
    port
  };
}

export function readDevState(root: string): DevState | null {
  const text = readText(join(root, '.fiducy', DEV_STATE_FILE));
  if (text === null) return null;
  const parsed: unknown = JSON.parse(text);
  if (!isDevState(parsed)) {
    throw new Error(`.fiducy/${DEV_STATE_FILE} is malformed. Delete it to start fresh.`);
  }
  return parsed;
}

export function loadDevState(root: string, requestedPort: number | undefined): DevState {
  const directory = ensureStateDirectory(root);
  const existing = readDevState(root);
  const state = existing ?? createDevState(requestedPort ?? DEFAULT_DEV_PORT);
  const next = { ...state, port: requestedPort ?? state.port };
  if (!existing || next.port !== existing.port) {
    writePrivateFile(join(directory, DEV_STATE_FILE), `${JSON.stringify(next, null, 2)}\n`);
  }
  return next;
}
