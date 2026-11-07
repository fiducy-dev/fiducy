import { existsSync, readdirSync } from 'node:fs';
import { join, posix } from 'node:path';

import { readText } from '../files.ts';

import type { GeneratedSchemaFile } from '../types.ts';

const DRIZZLE_CONFIG_FILES = ['drizzle.config.ts', 'drizzle.config.js', 'drizzle.config.mjs'];
const DRIZZLE_SCHEMA_PATTERN = /schema\s*:\s*['"`]([^'"`]+)['"`]/;

export interface SchemaPlacement {
  path: string | null;
  hint: string | null;
}

function placeDrizzleSchema(root: string, file: GeneratedSchemaFile): SchemaPlacement {
  for (const name of DRIZZLE_CONFIG_FILES) {
    const schema = DRIZZLE_SCHEMA_PATTERN.exec(readText(join(root, name)) ?? '')?.[1];
    if (!schema) continue;
    const cleaned = schema.replace(/^\.\//, '');
    const isFile = /\.[cm]?[jt]s$/.test(cleaned) && !cleaned.includes('*');
    const directory = isFile ? posix.dirname(cleaned) : cleaned.replace(/\/\*.*$/, '');
    const path = posix.join(directory, 'fiducy-schema.ts');
    const hint = isFile
      ? `Your drizzle.config schema is ${schema}: add export * from './fiducy-schema' to it, then run drizzle-kit generate and drizzle-kit migrate.`
      : 'It sits in your Drizzle schema folder, so drizzle-kit generate will pick it up.';
    return { path, hint };
  }
  return { path: file.suggestedPath, hint: null };
}

function placePrismaSchema(root: string, file: GeneratedSchemaFile): SchemaPlacement {
  const folder = join(root, 'prisma/schema');
  const usesFolder =
    existsSync(folder) && readdirSync(folder).some((name) => name.endsWith('.prisma'));
  if (usesFolder) return { path: file.suggestedPath, hint: null };
  if (existsSync(join(root, 'prisma/schema.prisma'))) {
    return {
      path: null,
      hint: 'Your Prisma schema is one file (prisma/schema.prisma), and fiducy never edits existing files. Paste this model into it, then run prisma migrate dev.'
    };
  }
  return { path: file.suggestedPath, hint: null };
}

export function placeSchemaFile(
  root: string,
  adapter: string,
  file: GeneratedSchemaFile
): SchemaPlacement {
  if (adapter === 'drizzle') return placeDrizzleSchema(root, file);
  if (adapter === 'prisma') return placePrismaSchema(root, file);
  return { path: file.suggestedPath, hint: null };
}
