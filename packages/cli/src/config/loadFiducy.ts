import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

import { createJiti } from 'jiti';

import { CONFIG_DIRECTORIES, CONFIG_FILE_NAMES } from '../constants.ts';
import { loadEnvironmentFiles } from '../environment.ts';
import { readText } from '../files.ts';
import { readFiducySchema } from '../validators.ts';
import { readPathAliases } from './aliases.ts';

import type { LoadedFiducy } from '../types.ts';

export class ConfigNotFoundError extends Error {}

const IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function findFiducyModule(root: string, configPath?: string): string {
  if (configPath) {
    const path = isAbsolute(configPath) ? configPath : resolve(root, configPath);
    if (readText(path) === null) throw new ConfigNotFoundError(`No file at ${configPath}`);
    return path;
  }
  for (const directory of CONFIG_DIRECTORIES) {
    for (const name of CONFIG_FILE_NAMES) {
      const path = join(root, directory, name);
      if (readText(path) !== null) return path;
    }
  }
  throw new ConfigNotFoundError(
    'Could not find your Fiducy server module (fiducy.ts in the project root, lib/, src/lib/, server/utils/ or src/lib/server/). Pass its path with --config.'
  );
}

function writeFrameworkStubs(directory: string, environment: Record<string, string | undefined>) {
  const names = Object.keys(environment).filter((name) => IDENTIFIER_PATTERN.test(name));
  const environmentStub = [
    'export const env = process.env;',
    ...names.map((name) => `export const ${name} = process.env[${JSON.stringify(name)}];`)
  ].join('\n');
  const environmentPath = join(directory, 'environment.mjs');
  const emptyPath = join(directory, 'empty.mjs');
  writeFileSync(environmentPath, `${environmentStub}\n`);
  writeFileSync(emptyPath, 'export {};\n');
  return {
    '$app/env/private': environmentPath,
    '$env/dynamic/private': environmentPath,
    '$env/static/private': environmentPath,
    'server-only': emptyPath
  };
}

export async function loadFiducy(root: string, configPath?: string): Promise<LoadedFiducy> {
  const file = findFiducyModule(root, configPath);
  loadEnvironmentFiles(root, process.env);
  const stubDirectory = mkdtempSync(join(tmpdir(), 'fiducy-cli-'));
  const previousDirectory = process.cwd();
  const { prepareStackTrace } = Error;
  process.chdir(root);
  try {
    const jiti = createJiti(import.meta.url, {
      alias: { ...readPathAliases(root), ...writeFrameworkStubs(stubDirectory, process.env) },
      moduleCache: false,
      fsCache: false,
      interopDefault: true
    });
    const loaded = (await jiti.import(file)) as Record<string, unknown>;
    for (const value of Object.values(loaded)) {
      const schema = readFiducySchema(value);
      if (schema !== undefined) return { file, schema };
    }
    throw new ConfigNotFoundError(
      `${file} does not export a createFiducy() instance. Export it, for example: export const fiducy = createFiducy({ ... })`
    );
  } finally {
    Error.prepareStackTrace = prepareStackTrace;
    process.chdir(previousDirectory);
    rmSync(stubDirectory, { recursive: true, force: true });
  }
}
