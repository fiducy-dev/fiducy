import { join } from 'node:path';
import { parseEnv } from 'node:util';

import { ENVIRONMENT_FILES } from './constants.ts';
import { readText } from './files.ts';

export function readEnvironmentFiles(root: string): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const name of ENVIRONMENT_FILES) {
    const text = readText(join(root, name));
    if (text !== null) Object.assign(merged, parseEnv(text));
  }
  return merged;
}

export function findEnvironmentFile(root: string, name: string): string | null {
  for (const file of [...ENVIRONMENT_FILES].reverse()) {
    const text = readText(join(root, file));
    if (text !== null && Object.hasOwn(parseEnv(text), name)) return file;
  }
  return null;
}

export function loadEnvironmentFiles(root: string, target: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(readEnvironmentFiles(root))) target[name] ??= value;
}
