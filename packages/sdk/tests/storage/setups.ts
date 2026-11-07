import { drizzleStorage } from '../../src/storage/drizzle';
import { getMigrations, kyselyStorage } from '../../src/storage/kysely';
import { prismaStorage } from '../../src/storage/prisma';
import { TEST_DATABASES } from './databases';
import { openDrizzle } from './drizzleDatabases';
import { PRISMA_DATABASES } from './prismaDatabases';

import type { OpenedStorage, StorageSetup, TestDatabase } from './types';

const DRIZZLE_SKIPPED_LABELS = ['node:sqlite', 'promise'];

function selectDatabases(skippedLabels: string[]) {
  return TEST_DATABASES.filter(
    (database) => !skippedLabels.some((label) => database.label.includes(label))
  );
}

export const DRIZZLE_DATABASES = selectDatabases(DRIZZLE_SKIPPED_LABELS);

async function openKyselyStorage(database: TestDatabase): Promise<OpenedStorage> {
  const options = { tableName: database.tableName };
  await (await getMigrations(database.connection, options)).runMigrations();
  return { storage: kyselyStorage(database.connection, options), close: database.close };
}

async function openDrizzleStorage(database: TestDatabase): Promise<OpenedStorage> {
  const drizzle = await openDrizzle(database);
  try {
    for (const statement of drizzle.statements) await database.execute(statement);
  } catch (error) {
    drizzle.cleanUp();
    throw error;
  }
  const close = async () => {
    drizzle.cleanUp();
    await database.close();
  };
  return { storage: drizzleStorage(drizzle.db, { schema: drizzle.schema }), close };
}

const KYSELY_SETUPS = TEST_DATABASES.map((database) => ({
  label: `kysely on ${database.label}`,
  isAvailable: database.isAvailable,
  open: () => openKyselyStorage(database.open())
}));

const DRIZZLE_SETUPS = DRIZZLE_DATABASES.map((database) => ({
  label: `drizzle on ${database.label}`,
  isAvailable: database.isAvailable,
  open: () => openDrizzleStorage(database.open())
}));

const PRISMA_SETUPS = PRISMA_DATABASES.map((database) => ({
  label: `prisma on ${database.label}`,
  isAvailable: database.isAvailable,
  open: async () => {
    const opened = await database.open();
    const { provider, tableName } = opened;
    return { storage: prismaStorage(opened.prisma, { provider, tableName }), close: opened.close };
  }
}));

export const STORAGE_SETUPS: StorageSetup[] = [
  ...KYSELY_SETUPS,
  ...DRIZZLE_SETUPS,
  ...PRISMA_SETUPS
];
