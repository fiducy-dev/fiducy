import { sql } from 'kysely';

import { USER_KEY_COLUMNS } from '../constants.ts';
import { createTableStatements } from '../sqlSchema.ts';

import type { Migrations } from '../types.ts';
import type { KyselyConnection } from './types.ts';

async function findTableColumns(connection: KyselyConnection, tableName: string) {
  const tables = await connection.db.introspection.getTables();
  const table = tables.find(
    (candidate) => candidate.name.toLowerCase() === tableName.toLowerCase()
  );
  return table?.columns.map((column) => column.name.toLowerCase()) ?? null;
}

function assertColumnsMatch(tableName: string, columns: string[]) {
  const missingColumns = USER_KEY_COLUMNS.filter((column) => !columns.includes(column));
  if (missingColumns.length === 0) return;
  throw new Error(
    `The table "${tableName}" exists but is missing ${missingColumns.join(', ')}. Fiducy never alters existing tables: add the columns yourself or pass another tableName`
  );
}

export async function readMigrations(
  connection: KyselyConnection,
  tableName: string
): Promise<Migrations> {
  const columns = await findTableColumns(connection, tableName);
  if (columns) assertColumnsMatch(tableName, columns);
  const statements = columns ? [] : createTableStatements(connection.dialect, tableName);
  return {
    toBeCreated: columns ? [] : [tableName],
    compileMigrations: async () => statements.map((statement) => `${statement};`).join('\n\n'),
    runMigrations: async () => {
      for (const statement of statements) await sql.raw(statement).execute(connection.db);
    }
  };
}
