import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { readText, writeNewFile } from '../files.ts';
import { parseFlags, readString } from '../flags.ts';
import { placeSchemaFile } from './schemaPlacement.ts';
import { describeSchema, loadStorageSchema } from './storageSchema.ts';

import type { CommandContext, GeneratedSchemaFile, StorageSchema } from '../types.ts';

export const GENERATE_HELP = `Usage: fiducy generate [--config path/to/fiducy.ts] [--output path]

Writes the table your Fiducy storage needs, in your ORM's own format:
SQL for kyselyStorage, a Drizzle table for drizzleStorage, a Prisma model for
prismaStorage. It only creates new files and never edits existing ones.`;

const NEXT_STEPS: Record<string, string> = {
  kysely: 'Apply it with npx fiducy migrate, or with your own migration tool.',
  drizzle:
    'Export the table from your Drizzle schema, then run drizzle-kit generate and drizzle-kit migrate (or drizzle-kit push).',
  prisma: 'Prisma reads every .prisma file in prisma/schema/, so run prisma migrate dev next.'
};

async function buildFile(schema: StorageSchema): Promise<GeneratedSchemaFile | null> {
  const file = schema.generate();
  if (!schema.getMigrations) return file;
  const migrations = await schema.getMigrations();
  if (migrations.toBeCreated.length === 0) return null;
  return { ...file, contents: await migrations.compileMigrations() };
}

export async function runGenerate(argv: string[], { cwd, output }: CommandContext) {
  const flags = parseFlags(argv, { config: { type: 'string' }, output: { type: 'string' } });
  const schema = await loadStorageSchema(cwd, readString(flags, 'config'), output);
  if (!schema) return 1;
  output.info(`Found ${output.style.heading(describeSchema(schema))}`);
  const file = await buildFile(schema);
  if (!file) {
    output.info(`The ${schema.tableName} table already exists. Nothing to generate.`);
    return 0;
  }
  const placement = placeSchemaFile(cwd, schema.adapter, file);
  const outputPath = readString(flags, 'output') ?? placement.path;
  if (outputPath === null) {
    output.info(output.style.code(file.contents));
    output.info(output.style.prose(placement.hint ?? ''));
    return 0;
  }
  const target = resolve(cwd, outputPath);
  if (readText(target) !== null) {
    if (readFileSync(target, 'utf8') === file.contents) {
      output.info(`${output.style.path(target)} ${output.style.success('is already up to date.')}`);
      return 0;
    }
    output.error(
      `${target} already exists and fiducy never overwrites files. Here is the new content:`
    );
    output.info(output.style.code(file.contents));
    output.error('Pass --output to write it somewhere else.');
    return 1;
  }
  writeNewFile(target, file.contents);
  output.info(`${output.style.success('Wrote')} ${output.style.path(target)}`);
  output.info(output.style.prose(placement.hint ?? NEXT_STEPS[schema.adapter] ?? ''));
  return 0;
}
