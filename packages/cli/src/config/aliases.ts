import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { readText, stripJSONComments } from '../files.ts';

import type { AliasInfo } from '../types.ts';

interface TSConfig {
  extends?: string | string[];
  compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> };
}

function readTSConfig(path: string): TSConfig | null {
  const text = readText(path);
  if (text === null) return null;
  try {
    return JSON.parse(stripJSONComments(text)) as TSConfig;
  } catch {
    return null;
  }
}

function collectPaths(path: string, depth: number): Record<string, string> {
  const config = readTSConfig(path);
  if (!config || depth > 3) return {};
  const directory = dirname(path);
  const parents = [config.extends ?? []].flat().filter((parent) => parent.startsWith('.'));
  const inherited = Object.assign(
    {},
    ...parents.map((parent) => collectPaths(resolve(directory, parent), depth + 1))
  );
  const base = resolve(directory, config.compilerOptions?.baseUrl ?? '.');
  const own: Record<string, string> = {};
  for (const [pattern, targets] of Object.entries(config.compilerOptions?.paths ?? {})) {
    const target = targets[0];
    if (!target || !pattern.endsWith('/*') || !target.endsWith('/*')) continue;
    own[pattern.slice(0, -1)] = `${resolve(base, target.slice(0, -2))}/`;
  }
  return { ...inherited, ...own };
}

export function readPathAliases(root: string): Record<string, string> {
  const aliases = collectPaths(join(root, 'tsconfig.json'), 0);
  const svelteLibrary = join(root, 'src/lib');
  if (existsSync(join(root, 'svelte.config.js')) || existsSync(svelteLibrary)) {
    aliases['$lib/'] ??= `${svelteLibrary}/`;
  }
  return aliases;
}

export function findSourceAlias(root: string, sourceDirectory: string): AliasInfo | null {
  const wanted = resolve(root, sourceDirectory);
  for (const [prefix, target] of Object.entries(collectPaths(join(root, 'tsconfig.json'), 0))) {
    if (resolve(target) === wanted) return { prefix, target: sourceDirectory };
  }
  return null;
}
