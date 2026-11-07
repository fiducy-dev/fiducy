import type { FiducyStorage } from '../../src/server';
import type { SQLDialect } from '../../src/storage';
import type { KyselyStorageDatabase } from '../../src/storage/kysely';
import type { PrismaProvider } from '../../src/storage/prisma';

export interface TestDatabase {
  connection: KyselyStorageDatabase;
  dialect: SQLDialect;
  tableName: string;
  execute: (statement: string) => Promise<void>;
  close: () => Promise<void>;
}

export interface OpenedStorage {
  storage: FiducyStorage;
  close: () => Promise<void>;
}

export interface StorageSetup {
  label: string;
  isAvailable: boolean;
  open: () => Promise<OpenedStorage>;
}

export interface PrismaTestDatabase {
  prisma: object;
  provider: PrismaProvider;
  tableName: string;
  execute: (statement: string) => Promise<unknown>;
  close: () => Promise<void>;
}
