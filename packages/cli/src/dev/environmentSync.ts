import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { DEV_VALUE_PATTERNS, PRIVATE_FILE_MODE } from '../constants.ts';
import { findEnvironmentFile, readEnvironmentFiles } from '../environment.ts';
import { appendLines, readText } from '../files.ts';

import type { EnvironmentSync } from '../types.ts';

function isDevValue(name: string, value: string): boolean {
  return DEV_VALUE_PATTERNS[name]?.test(value) ?? false;
}

function replaceValue(root: string, name: string, value: string): string {
  const file = findEnvironmentFile(root, name) ?? '.env';
  const path = join(root, file);
  const pattern = new RegExp(`^(\\s*(?:export\\s+)?${name}\\s*=).*$`, 'm');
  const text = readText(path) ?? '';
  writeFileSync(path, text.replace(pattern, `${name}=${value}`));
  return file;
}

export function syncEnvironment(root: string, expected: Record<string, string>): EnvironmentSync {
  const current = readEnvironmentFiles(root);
  const names = Object.keys(expected);
  const missing = names.filter((name) => current[name] === undefined);
  const different = names.filter(
    (name) => current[name] !== undefined && current[name] !== expected[name]
  );
  const foreign = different.filter((name) => !isDevValue(name, current[name] ?? ''));
  if (foreign.length > 0) return { status: 'conflict', foreign, added: [], replaced: [] };
  const replaced = different.map((name) => ({
    name,
    file: replaceValue(root, name, expected[name] ?? '')
  }));
  if (missing.length > 0) {
    const lines = missing.map((name) => `${name}=${expected[name]}`);
    appendLines(join(root, '.env'), lines, PRIVATE_FILE_MODE);
  }
  const changed = missing.length > 0 || replaced.length > 0;
  return { status: changed ? 'updated' : 'current', foreign: [], added: missing, replaced };
}
