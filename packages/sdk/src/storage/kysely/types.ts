import type { Dialect, Kysely, MysqlPool, PostgresPool, SqliteDatabase } from 'kysely';
import type { SQLDialect, UserKeyRow } from '../types.ts';

export type FiducyTables = Record<string, UserKeyRow>;

export interface BuiltinSqliteStatement {
  all(...parameters: unknown[]): unknown[];
  run(...parameters: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  iterate(...parameters: unknown[]): IterableIterator<unknown>;
}

export interface BunSqliteStatement extends BuiltinSqliteStatement {
  columnNames: string[];
}

export interface NodeSqliteStatement extends BuiltinSqliteStatement {
  columns(): unknown[];
}

export interface BunSqliteDatabase {
  fileControl: unknown;
  prepare(sql: string): BunSqliteStatement;
  close(): void;
}

export interface NodeSqliteDatabase {
  createSession: unknown;
  prepare(sql: string): NodeSqliteStatement;
  close(): void;
}

export interface MysqlPromisePool {
  pool: MysqlPool;
}

export interface KyselyInstanceInput<Database> {
  db: Kysely<Database>;
  type: SQLDialect;
}

export interface KyselyDialectInput {
  dialect: Dialect;
  type: SQLDialect;
}

export type KyselyStorageDatabase<Database = unknown> =
  | KyselyInstanceInput<Database>
  | KyselyDialectInput
  | Dialect
  | PostgresPool
  | MysqlPool
  | MysqlPromisePool
  | SqliteDatabase
  | BunSqliteDatabase
  | NodeSqliteDatabase;

export interface KyselyStorageOptions {
  tableName?: string;
}

export interface KyselyConnection {
  db: Kysely<FiducyTables>;
  dialect: SQLDialect;
}
