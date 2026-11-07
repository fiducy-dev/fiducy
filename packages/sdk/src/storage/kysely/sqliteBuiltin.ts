import type { SqliteDatabase } from 'kysely';
import type { BunSqliteDatabase, NodeSqliteDatabase } from './types.ts';

export function wrapBunSqlite(database: BunSqliteDatabase): SqliteDatabase {
  return {
    close: () => database.close(),
    prepare: (sql) => {
      const statement = database.prepare(sql);
      return {
        reader: statement.columnNames.length > 0,
        all: (parameters) => statement.all(...parameters),
        run: (parameters) => statement.run(...parameters),
        iterate: (parameters) => statement.iterate(...parameters)
      };
    }
  };
}

export function wrapNodeSqlite(database: NodeSqliteDatabase): SqliteDatabase {
  return {
    close: () => database.close(),
    prepare: (sql) => {
      const statement = database.prepare(sql);
      return {
        reader: statement.columns().length > 0,
        all: (parameters) => statement.all(...parameters),
        run: (parameters) => statement.run(...parameters),
        iterate: (parameters) => statement.iterate(...parameters)
      };
    }
  };
}
