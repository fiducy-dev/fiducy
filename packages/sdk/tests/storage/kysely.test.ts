import { Database } from 'bun:sqlite';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { Kysely, PostgresDialect, SqliteDialect } from 'kysely';
import { Pool } from 'pg';

import { generateSchema } from '../../src/storage';
import { getMigrations, kyselyStorage } from '../../src/storage/kysely';
import { createStoredKey, itBehavesLikeFiducyStorage } from './contract';
import { REQUIRES_REAL_DATABASES, TEST_DATABASES } from './databases';

import type { FiducyStorage } from '../../src/server';
import type { KyselyStorageDatabase } from '../../src/storage/kysely';
import type { TestDatabase } from './types';

describe('real database coverage', () => {
  it('runs against Postgres and MySQL in CI', () => {
    if (!REQUIRES_REAL_DATABASES) return;
    expect(TEST_DATABASES.every((database) => database.isAvailable)).toBe(true);
  });
});

for (const testDatabase of TEST_DATABASES) {
  describe.skipIf(!testDatabase.isAvailable)(`kyselyStorage on ${testDatabase.label}`, () => {
    let database: TestDatabase;
    let storage: FiducyStorage;

    beforeAll(async () => {
      database = testDatabase.open();
      const { connection } = database;
      const migrations = await getMigrations(connection, { tableName: database.tableName });
      expect(migrations.toBeCreated).toEqual([database.tableName]);
      await migrations.runMigrations();
      storage = kyselyStorage(connection, { tableName: database.tableName });
    });

    afterAll(() => database.close());

    it('detects the dialect from the connection', () => {
      expect(storage.schema?.dialect).toBe(database.dialect);
      expect(storage.schema?.adapter).toBe('kysely');
    });

    it('has nothing left to migrate once the table exists', async () => {
      const migrations = await storage.schema?.getMigrations?.();
      expect(migrations?.toBeCreated).toEqual([]);
      expect(await migrations?.compileMigrations()).toBe('');
      await migrations?.runMigrations();
    });

    itBehavesLikeFiducyStorage(() => storage);

    it('refuses to adopt a table that is missing Fiducy columns', async () => {
      const tableName = `${database.tableName}_bad`;
      await database.execute(`create table ${tableName} (user_id varchar(64) not null)`);
      const { connection } = database;
      await expect(getMigrations(connection, { tableName })).rejects.toThrow(/missing key_id/);
      await database.execute(`drop table ${tableName}`);
    });

    it('says how to create the table when it is missing', async () => {
      const unmigrated = kyselyStorage(database.connection, {
        tableName: `${database.tableName}_new`
      });
      await expect(unmigrated.listKeys('user_ada')).rejects.toThrow(/does not exist yet/);
      await expect(unmigrated.saveKey(createStoredKey())).rejects.toThrow(/getMigrations/);
    });

    it('generates the same SQL it runs', async () => {
      const generated = storage.schema?.generate();
      expect(generated?.language).toBe('sql');
      expect(generated?.suggestedPath).toBe(`fiducy_migrations/create_${database.tableName}.sql`);
      expect(generated?.contents).toContain('create table if not exists');
      await database.execute(`drop table ${database.tableName}`);
      for (const statement of (generated?.contents ?? '')
        .split(';')
        .filter((part) => part.trim())) {
        await database.execute(statement);
      }
      const key = createStoredKey({ userID: 'user_generated' });
      await storage.saveKey(key);
      expect(await storage.listKeys('user_generated')).toEqual([key]);
    });
  });
}

describe('kyselyStorage inputs', () => {
  it('accepts a Kysely instance, a dialect, or a dialect with its type', () => {
    const kysely = new Kysely<unknown>({ dialect: new PostgresDialect({ pool: new Pool() }) });
    expect(kyselyStorage({ db: kysely, type: 'postgres' }).schema?.dialect).toBe('postgres');
    expect(kyselyStorage(new PostgresDialect({ pool: new Pool() })).schema?.dialect).toBe(
      'postgres'
    );
    const dialect = new SqliteDialect({ database: async () => new Database(':memory:') as never });
    expect(kyselyStorage({ dialect, type: 'sqlite' }).schema?.dialect).toBe('sqlite');
  });

  it('rejects connections it cannot recognise', () => {
    expect(() => kyselyStorage({} as KyselyStorageDatabase)).toThrow(
      /could not tell which database/
    );
    const kysely = new Kysely<unknown>({ dialect: new PostgresDialect({ pool: new Pool() }) });
    const input = { db: kysely, type: 'mssql' } as unknown as KyselyStorageDatabase;
    expect(() => kyselyStorage(input)).toThrow(/supports type/);
  });

  it('rejects table names that are not plain identifiers', () => {
    const sqlite = new Database(':memory:');
    expect(() => kyselyStorage(sqlite, { tableName: 'keys; drop table user' })).toThrow(
      /letters, digits/
    );
    expect(() =>
      generateSchema({ adapter: 'kysely', dialect: 'postgres', tableName: 'a"b' })
    ).toThrow(/letters, digits/);
  });
});
