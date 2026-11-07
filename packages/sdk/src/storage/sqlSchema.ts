import { DEFAULT_TABLE_NAME, TABLE_NAME_PATTERN } from './constants.ts';

import type { SQLDialect } from './types.ts';

const COLUMN_TYPES: Record<SQLDialect, Record<string, string>> = {
  sqlite: {
    user_id: 'text',
    key_id: 'text',
    provider: 'text',
    handle: 'text',
    record: 'text',
    source: 'text',
    created_at: 'text'
  },
  postgres: {
    user_id: 'text',
    key_id: 'text',
    provider: 'text',
    handle: 'text',
    record: 'text',
    source: 'text',
    created_at: 'text'
  },
  mysql: {
    user_id: 'varchar(255)',
    key_id: 'varchar(64)',
    provider: 'varchar(32)',
    handle: 'varchar(255)',
    record: 'text',
    source: 'varchar(16)',
    created_at: 'varchar(32)'
  }
};

const NULLABLE_COLUMNS = ['record', 'source'];

function quoteIdentifier(dialect: SQLDialect, identifier: string): string {
  return dialect === 'mysql' ? `\`${identifier}\`` : `"${identifier}"`;
}

export function resolveTableName(tableName?: string): string {
  const name = tableName ?? DEFAULT_TABLE_NAME;
  if (!TABLE_NAME_PATTERN.test(name)) {
    throw new Error(
      `Fiducy table names use letters, digits and underscores, up to 48 characters. Got "${name}"`
    );
  }
  return name;
}

function describeColumns(dialect: SQLDialect): string[] {
  const types = COLUMN_TYPES[dialect];
  return Object.entries(types).map(([column, type]) => {
    const nullability = NULLABLE_COLUMNS.includes(column) ? '' : ' not null';
    return `  ${quoteIdentifier(dialect, column)} ${type}${nullability}`;
  });
}

export function createTableStatements(dialect: SQLDialect, tableName: string): string[] {
  const quote = (identifier: string) => quoteIdentifier(dialect, identifier);
  const indexName = quote(`${tableName}_user_provider_idx`);
  const keyColumns = `(${quote('user_id')}, ${quote('key_id')})`;
  const indexColumns = `(${quote('user_id')}, ${quote('provider')})`;
  const definitions = [...describeColumns(dialect), `  primary key ${keyColumns}`];
  if (dialect === 'mysql') definitions.push(`  index ${indexName} ${indexColumns}`);
  const createTable = `create table if not exists ${quote(tableName)} (\n${definitions.join(',\n')}\n)`;
  if (dialect === 'mysql') return [createTable];
  return [
    createTable,
    `create index if not exists ${indexName} on ${quote(tableName)} ${indexColumns}`
  ];
}
