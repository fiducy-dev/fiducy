import { explainMissingTable } from '../errors.ts';
import { generateSchema } from '../generateSchema.ts';
import { fromUserKeyRow, toUserKeyRow } from '../rows.ts';
import { resolveTableName } from '../sqlSchema.ts';
import { connectKysely } from './connect.ts';
import { readMigrations } from './migrations.ts';

import type { FiducyStorage, StoredUserKey } from '../../server/types.ts';
import type { KyselyConnection, KyselyStorageDatabase, KyselyStorageOptions } from './types.ts';

const KYSELY_TABLE_HINT =
  'Create it with getMigrations() from @fiducy/sdk/storage/kysely, or run the SQL from generateSchema()';

function upsertKey({ db, dialect }: KyselyConnection, tableName: string, key: StoredUserKey) {
  const row = toUserKeyRow(key);
  const changes = {
    provider: row.provider,
    handle: row.handle,
    record: row.record,
    source: row.source,
    created_at: row.created_at
  };
  const insert = db.insertInto(tableName).values(row);
  if (dialect === 'mysql') return insert.onDuplicateKeyUpdate(changes).execute();
  return insert
    .onConflict((conflict) => conflict.columns(['user_id', 'key_id']).doUpdateSet(changes))
    .execute();
}

function selectUserKeys({ db }: KyselyConnection, tableName: string, userID: string) {
  return db
    .selectFrom(tableName)
    .selectAll()
    .where('user_id', '=', userID)
    .orderBy('created_at', 'desc');
}

function createUserKeyMethods(connection: KyselyConnection, tableName: string): FiducyStorage {
  const { db } = connection;
  const rethrowMissingTable = explainMissingTable(tableName, KYSELY_TABLE_HINT);
  return {
    saveKey: async (key) => {
      await upsertKey(connection, tableName, key).catch(rethrowMissingTable);
    },
    findKey: async (userID, provider) => {
      const query = selectUserKeys(connection, tableName, userID).where('provider', '=', provider);
      const row = await query.limit(1).executeTakeFirst().catch(rethrowMissingTable);
      return row ? fromUserKeyRow(row) : null;
    },
    listKeys: async (userID) => {
      const query = selectUserKeys(connection, tableName, userID);
      const rows = await query.execute().catch(rethrowMissingTable);
      return rows.map(fromUserKeyRow);
    },
    deleteKey: async (userID, keyID) => {
      const query = db.deleteFrom(tableName).where('user_id', '=', userID);
      const result = await query
        .where('key_id', '=', keyID)
        .executeTakeFirst()
        .catch(rethrowMissingTable);
      return result.numDeletedRows > 0n;
    }
  };
}

export function kyselyStorage<Database>(
  database: KyselyStorageDatabase<Database>,
  options: KyselyStorageOptions = {}
): FiducyStorage {
  const tableName = resolveTableName(options.tableName);
  const connection = connectKysely(database);
  const { dialect } = connection;
  return {
    ...createUserKeyMethods(connection, tableName),
    schema: {
      adapter: 'kysely',
      dialect,
      tableName,
      generate: () => generateSchema({ adapter: 'kysely', dialect, tableName }),
      getMigrations: () => readMigrations(connection, tableName)
    }
  };
}

export function getMigrations<Database>(
  database: KyselyStorageDatabase<Database>,
  options: KyselyStorageOptions = {}
) {
  return readMigrations(connectKysely(database), resolveTableName(options.tableName));
}
