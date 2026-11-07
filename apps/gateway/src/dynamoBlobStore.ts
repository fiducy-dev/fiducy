import { GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

import { BLOB_ATTRIBUTE, BLOB_KEY_PREFIX } from './constants';

import type { Bytes } from '@fiducy/core';
import type { BlobStore, DynamoKeyStoreOptions } from './types';

export function createDynamoBlobStore({ client, tableName }: DynamoKeyStoreOptions): BlobStore {
  const keyOf = (name: string) => ({ keyID: { S: `${BLOB_KEY_PREFIX}${name}` } });
  return {
    readBlob: async (name) => {
      const output = await client.send(
        new GetItemCommand({ TableName: tableName, Key: keyOf(name), ConsistentRead: true })
      );
      const stored = output.Item?.[BLOB_ATTRIBUTE]?.B;
      return stored ? (new Uint8Array(stored) as Bytes) : null;
    },
    writeBlob: async (name, bytes) => {
      await client.send(
        new PutItemCommand({
          TableName: tableName,
          Item: { ...keyOf(name), [BLOB_ATTRIBUTE]: { B: bytes } }
        })
      );
    }
  };
}
