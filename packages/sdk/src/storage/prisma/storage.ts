import { explainMissingTable } from '../errors.ts';
import { generateSchema } from '../generateSchema.ts';
import { readPrismaModelName } from '../prismaSchema.ts';
import { fromUserKeyModel, toUserKeyModel } from '../rows.ts';
import { resolveTableName } from '../sqlSchema.ts';

import type { FiducyStorage } from '../../server/types.ts';
import type { SQLDialect } from '../types.ts';
import type { PrismaProvider, PrismaStorageOptions, PrismaUserKeyDelegate } from './types.ts';

const PRISMA_TABLE_HINT =
  "Add the model from generateSchema({ adapter: 'prisma' }) to your Prisma schema and run prisma migrate dev";

const PROVIDER_DIALECTS: Record<PrismaProvider, SQLDialect> = {
  postgresql: 'postgres',
  mysql: 'mysql',
  sqlite: 'sqlite'
};

function readDelegate(prisma: object, modelName: string): PrismaUserKeyDelegate {
  const delegateName = `${modelName[0]?.toLowerCase()}${modelName.slice(1)}`;
  const delegate = (prisma as Record<string, unknown>)[delegateName];
  if (typeof delegate === 'object' && delegate !== null) return delegate as PrismaUserKeyDelegate;
  throw new Error(
    `The Prisma client has no ${modelName} model. Add it from generateSchema({ adapter: 'prisma' }) and run prisma generate`
  );
}

function createLazyDelegate(prisma: object, modelName: string): PrismaUserKeyDelegate {
  return {
    upsert: (query) => readDelegate(prisma, modelName).upsert(query),
    findFirst: (query) => readDelegate(prisma, modelName).findFirst(query),
    findMany: (query) => readDelegate(prisma, modelName).findMany(query),
    deleteMany: (query) => readDelegate(prisma, modelName).deleteMany(query)
  };
}

function createUserKeyMethods(delegate: PrismaUserKeyDelegate, tableName: string): FiducyStorage {
  const rethrowMissingTable = explainMissingTable(tableName, PRISMA_TABLE_HINT);
  const newestFirst = { createdAt: 'desc' } as const;
  return {
    saveKey: async (key) => {
      const { userID, keyID, ...changes } = toUserKeyModel(key);
      const where = { userID_keyID: { userID, keyID } };
      const create = { userID, keyID, ...changes };
      await delegate.upsert({ where, create, update: changes }).catch(rethrowMissingTable);
    },
    findKey: async (userID, provider) => {
      const query = delegate.findFirst({ where: { userID, provider }, orderBy: newestFirst });
      const model = await query.catch(rethrowMissingTable);
      return model ? fromUserKeyModel(model) : null;
    },
    listKeys: async (userID) => {
      const query = delegate.findMany({ where: { userID }, orderBy: newestFirst });
      return (await query.catch(rethrowMissingTable)).map(fromUserKeyModel);
    },
    deleteKey: async (userID, keyID) => {
      const query = delegate.deleteMany({ where: { userID, keyID } });
      return (await query.catch(rethrowMissingTable)).count > 0;
    }
  };
}

export function prismaStorage(prisma: object, options: PrismaStorageOptions): FiducyStorage {
  const tableName = resolveTableName(options.tableName);
  const modelName = options.model ?? readPrismaModelName(tableName);
  const dialect = PROVIDER_DIALECTS[options.provider];
  if (!dialect) throw new Error("prismaStorage needs provider: 'postgresql', 'mysql' or 'sqlite'");
  return {
    ...createUserKeyMethods(createLazyDelegate(prisma, modelName), tableName),
    schema: {
      adapter: 'prisma',
      dialect,
      tableName,
      generate: () => generateSchema({ adapter: 'prisma', dialect, tableName })
    }
  };
}
