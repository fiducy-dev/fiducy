import { Table, getTableName, is } from 'drizzle-orm';
import { MySqlTable } from 'drizzle-orm/mysql-core';
import { PgTable } from 'drizzle-orm/pg-core';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';

import { DEFAULT_TABLE_NAME } from '../constants.ts';

import type { SQLDialect } from '../types.ts';
import type { DrizzleDatabase, DrizzleProvider, DrizzleStorageOptions } from './types.ts';
import type { DrizzleUserKeyTable } from './types.ts';

const DEFAULT_EXPORT_NAME = 'fiducyUserKey';

const TABLE_FIELDS = [
  'userID',
  'keyID',
  'provider',
  'handle',
  'record',
  'source',
  'createdAt'
] as const;

const PROVIDER_DIALECTS: Record<DrizzleProvider, SQLDialect> = {
  pg: 'postgres',
  mysql: 'mysql',
  sqlite: 'sqlite'
};

function findSchemaTable(schema: Record<string, unknown>, tableName?: string): Table | undefined {
  const exportedTable = schema[DEFAULT_EXPORT_NAME];
  if (tableName === undefined && is(exportedTable, Table)) return exportedTable;
  const expectedName = tableName ?? DEFAULT_TABLE_NAME;
  return Object.values(schema).find(
    (value): value is Table => is(value, Table) && getTableName(value) === expectedName
  );
}

export function assertUserKeyTable(table: Table): DrizzleUserKeyTable {
  const columns = table as unknown as Record<string, unknown>;
  const missingFields = TABLE_FIELDS.filter((field) => columns[field] === undefined);
  if (missingFields.length === 0) return table as unknown as DrizzleUserKeyTable;
  throw new Error(
    `The Drizzle table "${getTableName(table)}" is missing ${missingFields.join(', ')}. Generate it with generateSchema({ adapter: 'drizzle' })`
  );
}

export function resolveDrizzleTable(db: DrizzleDatabase, options: DrizzleStorageOptions): Table {
  if (options.table !== undefined) {
    if (is(options.table, Table)) return options.table;
    throw new Error('drizzleStorage needs a Drizzle table in the table option');
  }
  const schema = options.schema ?? db._?.fullSchema ?? {};
  const table = findSchemaTable(schema, options.tableName);
  if (table) return table;
  throw new Error(
    `drizzleStorage could not find the "${options.tableName ?? DEFAULT_EXPORT_NAME}" table. Pass it as { table: fiducyUserKey }, or pass your schema to drizzle() or to drizzleStorage({ schema })`
  );
}

export function readTableDialect(table: Table | undefined, provider?: DrizzleProvider): SQLDialect {
  if (provider) return PROVIDER_DIALECTS[provider];
  if (is(table, PgTable)) return 'postgres';
  if (is(table, MySqlTable)) return 'mysql';
  if (is(table, SQLiteTable)) return 'sqlite';
  throw new Error(
    "drizzleStorage could not tell the database. Pass provider: 'pg', 'mysql' or 'sqlite'"
  );
}
