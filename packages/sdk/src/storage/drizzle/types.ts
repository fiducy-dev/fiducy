import type { Column, SQL } from 'drizzle-orm';
import type { UserKeyModel } from '../types.ts';

export type DrizzleProvider = 'pg' | 'mysql' | 'sqlite';

export interface DrizzleStorageOptions {
  provider?: DrizzleProvider;
  table?: object;
  schema?: Record<string, unknown>;
  tableName?: string;
}

export type DrizzleUserKeyTable = Record<keyof UserKeyModel, Column>;

export interface DrizzleSelectQuery extends PromiseLike<UserKeyModel[]> {
  where: (condition: SQL | undefined) => DrizzleSelectQuery;
  orderBy: (...columns: SQL[]) => DrizzleSelectQuery;
  limit: (count: number) => DrizzleSelectQuery;
}

export interface DrizzleUpsertConfig {
  target: Column[];
  set: Partial<UserKeyModel>;
}

export interface DrizzleInsertQuery {
  onConflictDoUpdate: (config: DrizzleUpsertConfig) => PromiseLike<unknown>;
  onDuplicateKeyUpdate: (config: { set: Partial<UserKeyModel> }) => PromiseLike<unknown>;
}

export interface DrizzleDatabase {
  select: () => { from: (table: DrizzleUserKeyTable) => DrizzleSelectQuery };
  insert: (table: DrizzleUserKeyTable) => {
    values: (row: UserKeyModel) => DrizzleInsertQuery;
  };
  delete: (table: DrizzleUserKeyTable) => {
    where: (condition: SQL | undefined) => PromiseLike<unknown>;
  };
  _?: { fullSchema?: Record<string, unknown> };
}

export interface DrizzleConnection {
  db: DrizzleDatabase;
  table: DrizzleUserKeyTable;
}
