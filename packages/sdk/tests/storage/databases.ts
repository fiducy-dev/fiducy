import { Database } from 'bun:sqlite';
import { DatabaseSync } from 'node:sqlite';
import { createPool as createCallbackPool } from 'mysql2';
import { createPool as createPromisePool } from 'mysql2/promise';
import { Pool } from 'pg';

import type { TestDatabase } from './types';

export const POSTGRES_URL = process.env.FIDUCY_TEST_POSTGRES_URL;
export const MYSQL_URL = process.env.FIDUCY_TEST_MYSQL_URL;

export function createUniqueTableName(label: string) {
  return `fiducy_test_${label}_${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`;
}

function openBunSqlite(): TestDatabase {
  const database = new Database(':memory:');
  return {
    connection: database,
    dialect: 'sqlite',
    tableName: createUniqueTableName('bun'),
    execute: async (statement) => {
      database.run(statement);
    },
    close: async () => database.close()
  };
}

function openNodeSqlite(): TestDatabase {
  const database = new DatabaseSync(':memory:');
  return {
    connection: database,
    dialect: 'sqlite',
    tableName: createUniqueTableName('node'),
    execute: async (statement) => {
      database.exec(statement);
    },
    close: async () => database.close()
  };
}

function openPostgres(url: string): TestDatabase {
  const pool = new Pool({ connectionString: url });
  const tableName = createUniqueTableName('pg');
  return {
    connection: pool,
    dialect: 'postgres',
    tableName,
    execute: async (statement) => {
      await pool.query(statement);
    },
    close: async () => {
      await pool.query(`drop table if exists "${tableName}"`);
      await pool.end();
    }
  };
}

function openMysql(url: string, shouldUsePromisePool: boolean): TestDatabase {
  const promisePool = createPromisePool(url);
  const tableName = createUniqueTableName(shouldUsePromisePool ? 'mysqlp' : 'mysql');
  return {
    connection: shouldUsePromisePool ? promisePool : createCallbackPool(url),
    dialect: 'mysql',
    tableName,
    execute: async (statement) => {
      await promisePool.query(statement);
    },
    close: async () => {
      await promisePool.query(`drop table if exists \`${tableName}\``);
      await promisePool.end();
    }
  };
}

export const TEST_DATABASES = [
  { label: 'bun:sqlite', open: openBunSqlite, isAvailable: true },
  { label: 'node:sqlite', open: openNodeSqlite, isAvailable: true },
  {
    label: 'Postgres (pg Pool)',
    open: () => openPostgres(POSTGRES_URL ?? ''),
    isAvailable: Boolean(POSTGRES_URL)
  },
  {
    label: 'MySQL (mysql2 pool)',
    open: () => openMysql(MYSQL_URL ?? '', false),
    isAvailable: Boolean(MYSQL_URL)
  },
  {
    label: 'MySQL (mysql2/promise pool)',
    open: () => openMysql(MYSQL_URL ?? '', true),
    isAvailable: Boolean(MYSQL_URL)
  }
];

export const REQUIRES_REAL_DATABASES = process.env.CI === 'true';
