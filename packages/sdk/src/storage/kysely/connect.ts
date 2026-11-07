import { Kysely, MysqlDialect, PostgresDialect, SqliteDialect } from 'kysely';

import { isSQLDialect } from '../validators.ts';
import { wrapBunSqlite, wrapNodeSqlite } from './sqliteBuiltin.ts';

import type { Dialect, MysqlPool, PostgresPool, SqliteDatabase } from 'kysely';
import type { SQLDialect } from '../types.ts';
import type { BunSqliteDatabase, FiducyTables, KyselyConnection } from './types.ts';
import type { KyselyStorageDatabase, MysqlPromisePool, NodeSqliteDatabase } from './types.ts';

const UNSUPPORTED_DATABASE_MESSAGE =
  'Fiducy could not tell which database this is. Pass a pg Pool, a mysql2 pool, a SQLite database (better-sqlite3, bun:sqlite or node:sqlite), or { db: kysely, type } / { dialect, type } with type "postgres", "mysql" or "sqlite"';

function hasMember(value: object, name: string): boolean {
  return name in value;
}

function hasPromisePool(database: object): boolean {
  const { pool } = database as Partial<MysqlPromisePool>;
  return typeof pool === 'object' && pool !== null && hasMember(pool, 'getConnection');
}

function detectDialectType(dialect: Dialect): SQLDialect {
  if (dialect instanceof PostgresDialect) return 'postgres';
  if (dialect instanceof MysqlDialect) return 'mysql';
  if (dialect instanceof SqliteDialect) return 'sqlite';
  throw new Error(UNSUPPORTED_DATABASE_MESSAGE);
}

function connectWithDialect(dialect: Dialect, type: SQLDialect): KyselyConnection {
  return { db: new Kysely<FiducyTables>({ dialect }), dialect: readDialectType(type) };
}

function readDialectType(type: unknown): SQLDialect {
  if (isSQLDialect(type)) return type;
  throw new Error(
    `Fiducy storage supports type "postgres", "mysql" or "sqlite". Got "${String(type)}"`
  );
}

function connectSqlite(database: SqliteDatabase): KyselyConnection {
  return connectWithDialect(new SqliteDialect({ database }), 'sqlite');
}

function connectRawDatabase(database: object): KyselyConnection {
  if (hasMember(database, 'createDriver')) {
    const dialect = database as Dialect;
    return connectWithDialect(dialect, detectDialectType(dialect));
  }
  if (hasMember(database, 'fileControl'))
    return connectSqlite(wrapBunSqlite(database as BunSqliteDatabase));
  if (hasMember(database, 'createSession')) {
    return connectSqlite(wrapNodeSqlite(database as NodeSqliteDatabase));
  }
  if (hasMember(database, 'aggregate')) return connectSqlite(database as SqliteDatabase);
  if (hasMember(database, 'getConnection')) {
    if (hasPromisePool(database)) {
      return connectWithDialect(
        new MysqlDialect({ pool: (database as MysqlPromisePool).pool }),
        'mysql'
      );
    }
    return connectWithDialect(new MysqlDialect({ pool: database as MysqlPool }), 'mysql');
  }
  if (hasMember(database, 'connect') && hasMember(database, 'totalCount')) {
    return connectWithDialect(new PostgresDialect({ pool: database as PostgresPool }), 'postgres');
  }
  throw new Error(UNSUPPORTED_DATABASE_MESSAGE);
}

export function connectKysely<Database>(
  database: KyselyStorageDatabase<Database>
): KyselyConnection {
  if (typeof database !== 'object' || database === null)
    throw new Error(UNSUPPORTED_DATABASE_MESSAGE);
  if (hasMember(database, 'db') && hasMember(database, 'type')) {
    const { db, type } = database as { db: Kysely<Database>; type: SQLDialect };
    return { db: db as unknown as Kysely<FiducyTables>, dialect: readDialectType(type) };
  }
  if (hasMember(database, 'dialect') && hasMember(database, 'type')) {
    const { dialect, type } = database as { dialect: Dialect; type: SQLDialect };
    return connectWithDialect(dialect, type);
  }
  return connectRawDatabase(database);
}
