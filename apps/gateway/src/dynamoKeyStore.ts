import { DeleteItemCommand, DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { PutItemCommand } from '@aws-sdk/client-dynamodb';
import { SEALED_RECORD_FIELDS } from '@fiducy/core';
import { FetchHttpHandler } from '@smithy/fetch-http-handler';

import { readInstanceRoleCredentials } from './instanceMetadata';

import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import type { SealedRecord } from '@fiducy/core';
import type { DynamoKeyStoreOptions, DynamoSender } from './types';
import type { KeyStore } from './types';

function toItem(record: SealedRecord): Record<string, AttributeValue> {
  return Object.fromEntries(SEALED_RECORD_FIELDS.map((field) => [field, { S: record[field] }]));
}

function fromItem(item: Record<string, AttributeValue> | undefined): SealedRecord | null {
  if (!item) return null;
  const entries = SEALED_RECORD_FIELDS.map((field) => [field, item[field]?.S]);
  if (entries.some(([, value]) => typeof value !== 'string')) return null;
  return Object.fromEntries(entries) as SealedRecord;
}

export function createDynamoClient(region: string, endpoint?: string): DynamoSender {
  return new DynamoDBClient({
    region,
    endpoint,
    credentials: readInstanceRoleCredentials,
    requestHandler: new FetchHttpHandler()
  });
}

export function createDynamoKeyStore({ client, tableName }: DynamoKeyStoreOptions): KeyStore {
  const keyOf = (keyID: string) => ({ keyID: { S: keyID } });
  return {
    saveRecord: async (record) => {
      await client.send(
        new PutItemCommand({
          TableName: tableName,
          Item: toItem(record),
          ConditionExpression: 'attribute_not_exists(keyID)'
        })
      );
    },
    findRecord: async (keyID) => {
      const output = await client.send(
        new GetItemCommand({ TableName: tableName, Key: keyOf(keyID), ConsistentRead: true })
      );
      return fromItem(output.Item);
    },
    deleteRecord: async (keyID) => {
      const output = await client.send(
        new DeleteItemCommand({ TableName: tableName, Key: keyOf(keyID), ReturnValues: 'ALL_OLD' })
      );
      return output.Attributes !== undefined;
    }
  };
}
