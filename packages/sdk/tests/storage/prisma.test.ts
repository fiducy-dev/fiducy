import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import { generateSchema } from '../../src/storage';
import { prismaStorage } from '../../src/storage/prisma';
import { itBehavesLikeFiducyStorage } from './contract';
import { PRISMA_DATABASES } from './prismaDatabases';

import type { FiducyStorage } from '../../src/server';
import type { PrismaTestDatabase } from './types';

for (const testDatabase of PRISMA_DATABASES) {
  describe.skipIf(!testDatabase.isAvailable)(`prismaStorage on ${testDatabase.label}`, () => {
    let database: PrismaTestDatabase;
    let storage: FiducyStorage;

    beforeAll(async () => {
      database = await testDatabase.open();
      storage = prismaStorage(database.prisma, {
        provider: database.provider,
        tableName: database.tableName
      });
    }, 60000);

    afterAll(() => database.close());

    it('describes its schema for the CLI', () => {
      expect(storage.schema?.adapter).toBe('prisma');
      expect(storage.schema?.generate().language).toBe('prisma');
      expect(storage.schema?.generate().suggestedPath).toBe('prisma/schema/fiducy.prisma');
    });

    itBehavesLikeFiducyStorage(() => storage);

    it('explains a missing model and a missing table', async () => {
      const unmodeled = prismaStorage(database.prisma, { provider: database.provider });
      expect(unmodeled.schema?.tableName).toBe('fiducy_user_key');
      await expect(unmodeled.listKeys('user_ada')).rejects.toThrow(/no FiducyUserKey model/);
      await database.execute(`drop table ${database.tableName}`);
      await expect(storage.listKeys('user_ada')).rejects.toThrow(/does not exist yet/);
    });
  });
}

describe('the generated Prisma model', () => {
  it('names the model after the table and keeps MySQL records in a text column', () => {
    const mysql = generateSchema({
      adapter: 'prisma',
      dialect: 'mysql',
      tableName: 'ai_key_handles'
    });
    expect(mysql.contents).toContain('model AiKeyHandles {');
    expect(mysql.contents).toContain('@db.Text');
    expect(mysql.contents).toContain('@@map("ai_key_handles")');
  });
});
