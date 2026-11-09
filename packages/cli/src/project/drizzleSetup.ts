import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { DRIZZLE_CONFIG_FILES, DRIZZLE_DEFAULT_OUT } from '../constants.ts';
import { readText } from '../files.ts';

import type { DrizzleSetup } from '../types.ts';

const SCHEMA_PATTERN = /schema\s*:\s*['"`]([^'"`]+)['"`]/;
const OUT_PATTERN = /out\s*:\s*['"`]([^'"`]+)['"`]/;

export function readDrizzleSetup(root: string): DrizzleSetup {
  for (const name of DRIZZLE_CONFIG_FILES) {
    const config = readText(join(root, name));
    if (config === null) continue;
    const schema = SCHEMA_PATTERN.exec(config)?.[1] ?? null;
    const out = OUT_PATTERN.exec(config)?.[1] ?? DRIZZLE_DEFAULT_OUT;
    return { schema, usesMigrations: existsSync(join(root, out, 'meta/_journal.json')) };
  }
  return { schema: null, usesMigrations: false };
}

export function isSingleSchemaFile(schema: string): boolean {
  return /\.[cm]?[jt]s$/.test(schema) && !schema.includes('*');
}
