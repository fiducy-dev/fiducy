import { TransactWriteItemsCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { fail, succeed } from '@fiducy/core';

import { ADD_SPEND_EXPRESSION, SPEND_ATTRIBUTE_NAMES, SPEND_CONDITION } from './constants';

import type { DynamoKeyStoreOptions, SpendCharge, SpendCounter } from './types';

function describeUpdate(tableName: string, charge: SpendCharge) {
  return {
    TableName: tableName,
    Key: { keyID: { S: charge.counterID } },
    UpdateExpression: ADD_SPEND_EXPRESSION,
    ExpressionAttributeNames: SPEND_ATTRIBUTE_NAMES,
    ExpressionAttributeValues: {
      ':amount': { N: String(charge.amount) },
      ':expiresAt': { N: String(charge.expiresAt) }
    }
  };
}

function describeConditionalUpdate(tableName: string, charge: SpendCharge) {
  const update = describeUpdate(tableName, charge);
  return {
    ...update,
    ConditionExpression: SPEND_CONDITION,
    ExpressionAttributeValues: {
      ...update.ExpressionAttributeValues,
      ':headroom': { N: String(charge.limit - charge.amount) }
    }
  };
}

function findFullCounterIndex(error: TransactionCanceledException): number {
  const reasons = error.CancellationReasons ?? [];
  return reasons.findIndex((reason) => reason.Code === 'ConditionalCheckFailed');
}

export function createDynamoSpendCounter({
  client,
  tableName
}: DynamoKeyStoreOptions): SpendCounter {
  return {
    reserveSpend: async (charges) => {
      if (charges.length === 0) return succeed(null);
      const fullIndex = charges.findIndex((charge) => charge.amount > charge.limit);
      if (fullIndex !== -1) return fail(fullIndex);
      const items = charges.map((charge) => ({
        Update: describeConditionalUpdate(tableName, charge)
      }));
      try {
        await client.send(new TransactWriteItemsCommand({ TransactItems: items }));
        return succeed(null);
      } catch (error) {
        if (!(error instanceof TransactionCanceledException)) throw error;
        const index = findFullCounterIndex(error);
        if (index === -1) throw error;
        return fail(index);
      }
    },
    adjustSpend: async (charges) => {
      await Promise.all(
        charges.map((charge) =>
          client.send(new UpdateItemCommand(describeUpdate(tableName, charge)))
        )
      );
    }
  };
}
