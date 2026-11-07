import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import { drizzleStorage } from '../../src/storage/drizzle';
import { createStoredKey, itBehavesLikeFiducyStorage } from './contract';
import { openDrizzle } from './drizzleDatabases';
import { DRIZZLE_DATABASES } from './setups';

import type { FiducyStorage } from '../../src/server';
import type { TestDatabase } from './types';

for (const testDatabase of DRIZZLE_DATABASES) {
  describe.skipIf(!testDatabase.isAvailable)(`drizzleStorage on ${testDatabase.label}`, () => {
    let database: TestDatabase;
    let drizzle: Awaited<ReturnType<typeof openDrizzle>>;
    let storage: FiducyStorage;

    beforeAll(async () => {
      database = testDatabase.open();
      drizzle = await openDrizzle(database);
      expect(drizzle.statements.length).toBeGreaterThan(0);
      for (const statement of drizzle.statements) await database.execute(statement);
      storage = drizzleStorage(drizzle.db, { schema: drizzle.schema });
    });

    afterAll(async () => {
      drizzle.cleanUp();
      await database.close();
    });

    it('finds the generated table in the schema and detects the dialect', () => {
      expect(storage.schema?.adapter).toBe('drizzle');
      expect(storage.schema?.dialect).toBe(database.dialect);
      expect(storage.schema?.generate().language).toBe('typescript');
    });

    it('creates the table through a drizzle-kit migration', async () => {
      const columns = drizzle.statements.join('\n');
      for (const column of ['user_id', 'key_id', 'provider', 'handle', 'record', 'created_at']) {
        expect(columns).toContain(column);
      }
      expect(columns).toContain(`${database.tableName}_user_provider_idx`);
    });

    itBehavesLikeFiducyStorage(() => storage);

    it('accepts the table directly', async () => {
      const table = drizzle.schema.fiducyUserKey as object;
      const direct = drizzleStorage(drizzle.db, { table });
      const key = createStoredKey({ userID: 'user_direct' });
      await direct.saveKey(key);
      expect(await storage.listKeys('user_direct')).toEqual([key]);
    });

    it('explains a missing table and a missing schema', async () => {
      const unmigrated = drizzleStorage(drizzle.db, {
        table: drizzle.schema.fiducyUserKey as object
      });
      await database.execute(`drop table ${database.tableName}`);
      await expect(unmigrated.listKeys('user_ada')).rejects.toThrow(/does not exist yet/);
      expect(() =>
        drizzleStorage(drizzle.db, { schema: drizzle.schema, tableName: 'not_there' })
      ).toThrow(/could not find the "not_there" table/);
      const beforeGenerate = drizzleStorage({}, { provider: 'pg' });
      expect(beforeGenerate.schema?.generate().contents).toContain('pgTable');
      await expect(beforeGenerate.listKeys('user_ada')).rejects.toThrow(/could not find/);
    });
  });
}
