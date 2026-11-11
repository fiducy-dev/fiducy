import { existsSync, readdirSync } from 'node:fs';
import { join, posix } from 'node:path';

import { readText } from '../files.ts';
import { isSingleSchemaFile, readDrizzleSetup } from '../project/drizzleSetup.ts';

import type { GeneratedSchemaFile } from '../types.ts';

export interface SchemaPlacement {
  path: string | null;
  hint: string | null;
}

function placeDrizzleSchema(root: string, file: GeneratedSchemaFile): SchemaPlacement {
  const { schema, usesMigrations } = readDrizzleSetup(root);
  if (!schema) return { path: file.suggestedPath, hint: null };
  const cleaned = schema.replace(/^\.\//, '');
  const isFile = isSingleSchemaFile(cleaned);
  const directory = isFile ? posix.dirname(cleaned) : cleaned.replace(/\/\*.*$/, '');
  const path = posix.join(directory, 'fiducy-schema.ts');
  const apply = usesMigrations
    ? 'drizzle-kit generate and drizzle-kit migrate'
    : 'drizzle-kit push';
  const exported = isFile && (readText(join(root, cleaned)) ?? '').includes("'./fiducy-schema'");
  const hint = exported
    ? `${schema} already exports it, so run ${apply}.`
    : isFile
      ? `Your drizzle.config schema is ${schema}: add export * from './fiducy-schema' to it, then run ${apply}.`
      : `It sits in your Drizzle schema folder, so ${apply} will pick it up.`;
  return { path, hint };
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
