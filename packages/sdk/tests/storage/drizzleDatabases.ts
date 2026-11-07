import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { drizzle as drizzleBunSqlite } from 'drizzle-orm/bun-sqlite';
import { drizzle as drizzleMysql } from 'drizzle-orm/mysql2';
import { drizzle as drizzlePostgres } from 'drizzle-orm/node-postgres';

import { generateSchema } from '../../src/storage';

import type { SQLDialect } from '../../src/storage';
import type { TestDatabase } from './types';

const DRIZZLE_KIT_DIALECTS: Record<SQLDialect, string> = {
  postgres: 'postgresql',
  mysql: 'mysql',
  sqlite: 'sqlite'
};

function generateMigration(dialect: SQLDialect, schemaPath: string, outputDirectory: string) {
  const kit = Bun.spawnSync(
    ['bunx', 'drizzle-kit', 'generate', '--dialect', DRIZZLE_KIT_DIALECTS[dialect]].concat([
      '--schema',
      schemaPath,
      '--out',
      outputDirectory
    ]),
    { cwd: import.meta.dir }
  );
  if (kit.exitCode !== 0) throw new Error(kit.stderr.toString());
  const files = readdirSync(outputDirectory, { recursive: true, encoding: 'utf8' });
  const [migrationFile] = files.filter((file) => file.endsWith('.sql'));
  const migration = readFileSync(join(outputDirectory, migrationFile ?? ''), 'utf8');
  return migration.split('--> statement-breakpoint').map((statement) => statement.trim());
}

function connectDrizzle(database: TestDatabase) {
  const client = database.connection as never;
  if (database.dialect === 'postgres') return drizzlePostgres({ client });
  if (database.dialect === 'mysql') return drizzleMysql({ client });
  return drizzleBunSqlite({ client });
}

export async function openDrizzle(database: TestDatabase) {
  const { contents } = generateSchema({
    adapter: 'drizzle',
    dialect: database.dialect,
    tableName: database.tableName
  });
  const workDirectory = join(import.meta.dir, `.${database.tableName}`);
  const cleanUp = () => rmSync(workDirectory, { recursive: true, force: true });
  mkdirSync(workDirectory, { recursive: true });
  const schemaPath = join(workDirectory, 'fiducy-schema.ts');
  writeFileSync(schemaPath, contents);
  try {
    const statements = generateMigration(
      database.dialect,
      schemaPath,
      join(workDirectory, 'drizzle')
    );
    const schema = (await import(schemaPath)) as Record<string, unknown>;
    return { db: connectDrizzle(database), schema, statements, cleanUp };
  } catch (error) {
    cleanUp();
    throw error;
  }
}
