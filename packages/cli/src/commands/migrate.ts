import { createInterface } from 'node:readline/promises';

import { parseFlags, readBoolean, readString } from '../flags.ts';
import { describeSchema, loadStorageSchema } from './storageSchema.ts';

import type { CommandContext } from '../types.ts';

export const MIGRATE_HELP = `Usage: fiducy migrate [--config path/to/fiducy.ts] [--yes]

Creates the Fiducy table in your database when it is missing. Works with
kyselyStorage (Postgres, MySQL, SQLite). It only creates the table and its index;
it never alters or drops anything. With Drizzle or Prisma, run fiducy generate and
then your ORM's migrate command instead.

  --yes   Apply without asking (needed when not running in a terminal)`;

const ORM_MIGRATE_HINTS: Record<string, string> = {
  drizzle: 'Drizzle owns your migrations: run npx fiducy generate, then drizzle-kit migrate.',
  prisma: 'Prisma owns your migrations: run npx fiducy generate, then prisma migrate dev.'
};

async function confirm(question: string): Promise<boolean> {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await readline.question(`${question} (y/N) `);
    return answer.trim().toLowerCase() === 'y';
  } finally {
    readline.close();
  }
}

export async function runMigrate(argv: string[], { cwd, output }: CommandContext) {
  const flags = parseFlags(argv, { config: { type: 'string' }, yes: { type: 'boolean' } });
  const schema = await loadStorageSchema(cwd, readString(flags, 'config'), output);
  if (!schema) return 1;
  output.info(`Found ${describeSchema(schema)}`);
  if (!schema.getMigrations) {
    output.error(ORM_MIGRATE_HINTS[schema.adapter] ?? 'This storage has no migrations to run.');
    return 1;
  }
  const migrations = await schema.getMigrations();
  if (migrations.toBeCreated.length === 0) {
    output.info(`The ${schema.tableName} table already exists. Nothing to migrate.`);
    return 0;
  }
  output.info(await migrations.compileMigrations());
  if (!readBoolean(flags, 'yes')) {
    if (!process.stdin.isTTY) {
      output.error('Pass --yes to apply this outside a terminal.');
      return 1;
    }
    if (!(await confirm('Apply this to your database?'))) return 1;
  }
  await migrations.runMigrations();
  output.info(`Created ${migrations.toBeCreated.join(', ')}`);
  return 0;
}
