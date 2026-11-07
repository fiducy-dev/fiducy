import type { SQLDialect } from './types.ts';

const TABLE_BUILDERS: Record<SQLDialect, { module: string; table: string }> = {
  postgres: { module: 'drizzle-orm/pg-core', table: 'pgTable' },
  sqlite: { module: 'drizzle-orm/sqlite-core', table: 'sqliteTable' },
  mysql: { module: 'drizzle-orm/mysql-core', table: 'mysqlTable' }
};

const MYSQL_LENGTHS: Record<string, number> = {
  user_id: 255,
  key_id: 64,
  provider: 32,
  handle: 255,
  created_at: 32
};

const COLUMNS = [
  { field: 'userID', column: 'user_id' },
  { field: 'keyID', column: 'key_id' },
  { field: 'provider', column: 'provider' },
  { field: 'handle', column: 'handle' },
  { field: 'record', column: 'record' },
  { field: 'source', column: 'source' },
  { field: 'createdAt', column: 'created_at' }
];

function describeColumn(dialect: SQLDialect, field: string, column: string): string {
  if (column === 'record') return `  ${field}: text('${column}')`;
  if (column === 'source' && dialect === 'mysql') {
    return `  ${field}: varchar('${column}', { length: 16 })`;
  }
  if (column === 'source') return `  ${field}: text('${column}')`;
  if (dialect !== 'mysql') return `  ${field}: text('${column}').notNull()`;
  return `  ${field}: varchar('${column}', { length: ${MYSQL_LENGTHS[column]} }).notNull()`;
}

export function createDrizzleSchema(dialect: SQLDialect, tableName: string): string {
  const builder = TABLE_BUILDERS[dialect];
  const extraImports = dialect === 'mysql' ? ['varchar'] : [];
  const imports = ['index', builder.table, 'primaryKey', 'text', ...extraImports].sort();
  const columns = COLUMNS.map(({ field, column }) => describeColumn(dialect, field, column));
  return `import { ${imports.join(', ')} } from '${builder.module}';

export const fiducyUserKey = ${builder.table}(
  '${tableName}',
  {
${columns.map((column) => `  ${column}`).join(',\n')}
  },
  (table) => [
    primaryKey({ columns: [table.userID, table.keyID] }),
    index('${tableName}_user_provider_idx').on(table.userID, table.provider)
  ]
);
`;
}
