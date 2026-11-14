import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { SAMPLE_API_KEY } from '@fiducy/testing';
import { createDynamoSpendCounter } from '../src/dynamoSpendCounter';
import { createConcurrencyTracker, createMemorySpendCounter } from '../src/spendCounters';
import { startGatewayHarness } from './harness';

import type { TransactWriteItemsCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import type { AppRegistration, DynamoSender, SpendCharge, SpendCounter } from '../src/types';

const CAPPED_APP: AppRegistration = {
  appID: 'app_lintel',
  name: 'Lintel',
  appSecret: 'app_sk_lintel_6Ty3Np8Qa1Vw4Zr',
  monthlyRequestLimitPerKey: 1000,
  allowedOrigins: ['https://lintel.example'],
  spendLimits: { dailyDollarLimitPerKey: 0.02, maximumOutputTokens: 1000 }
};

const UNCAPPED_APP: AppRegistration = {
  ...CAPPED_APP,
  appID: 'app_quarry',
  name: 'Quarry',
  appSecret: 'app_sk_quarry_8Hn2Wc5Rb7Jx3Ke',
  spendLimits: {}
};

function createRecordingSpendCounter() {
  const counter = createMemorySpendCounter();
  const totals = new Map<string, number>();
  const track = (charges: SpendCharge[]) => {
    for (const charge of charges) {
      totals.set(charge.counterID, (totals.get(charge.counterID) ?? 0) + charge.amount);
    }
  };
  const recording: SpendCounter = {
    reserveSpend: async (charges) => {
      const reserved = await counter.reserveSpend(charges);
      if (reserved.ok) track(charges);
      return reserved;
    },
    adjustSpend: async (charges) => {
      track(charges);
      await counter.adjustSpend(charges);
    }
  };
  return { counter: recording, totals };
}

const spending = createRecordingSpendCounter();
let harness: Awaited<ReturnType<typeof startGatewayHarness>>;
let handle: string;
let uncappedHandle: string;

beforeAll(async () => {
  harness = await startGatewayHarness([CAPPED_APP, UNCAPPED_APP], undefined, spending.counter);
  handle = (await harness.storeKey(CAPPED_APP.appID, SAMPLE_API_KEY)).body.data.handle;
  uncappedHandle = (await harness.storeKey(UNCAPPED_APP.appID, SAMPLE_API_KEY)).body.data.handle;
});

afterAll(() => harness.stop());

function callCappedApp(path: string, body: object) {
  return fetch(`${harness.gatewayURL}/openai${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${CAPPED_APP.appSecret}`,
      'x-key-handle': handle,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}

function readKeySpend() {
  const keyCounter = [...spending.totals.keys()].find((counterID) => counterID.includes(':key:'));
  return spending.totals.get(keyCounter ?? '') ?? 0;
}

describe('an app with spend limits', () => {
  it('clamps output tokens and settles the reservation to the real cost', async () => {
    const response = await callCappedApp('/v1/chat/completions', {
      model: 'gpt-4o-mini',
      max_tokens: 90000,
      messages: [{ role: 'user', content: 'Hi' }]
    });
    expect(response.status).toBe(200);
    const forwarded = JSON.parse(harness.mockProvider.recordedRequests.at(-1)?.body ?? '{}');
    expect(forwarded.max_tokens).toBe(1000);
    await Bun.sleep(10);
    expect(readKeySpend()).toBe(Math.ceil(9 * 0.15 + 3 * 0.6));
  });

  it('settles a stream from the usage chunk it asked OpenAI to send', async () => {
    const before = readKeySpend();
    const response = await callCappedApp('/v1/chat/completions', {
      model: 'gpt-4o-mini',
      stream: true,
      messages: [{ role: 'user', content: 'Summarise this' }]
    });
    await response.text();
    await Bun.sleep(10);
    const forwarded = JSON.parse(harness.mockProvider.recordedRequests.at(-1)?.body ?? '{}');
    expect(forwarded.stream_options).toEqual({ include_usage: true });
    expect(readKeySpend() - before).toBe(Math.ceil(41 * 0.15 + 17 * 0.6));
  });

  it('treats an empty spendLimits object as off', async () => {
    const response = await fetch(`${harness.gatewayURL}/openai/v1/files`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${UNCAPPED_APP.appSecret}`,
        'x-key-handle': uncappedHandle
      },
      body: '{}'
    });
    expect(response.status).toBe(404);
  });

  it('blocks a model it has no price for, before the call', async () => {
    const callsBefore = harness.mockProvider.recordedRequests.length;
    const response = await callCappedApp('/v1/chat/completions', {
      model: 'mystery-model-9',
      messages: [{ role: 'user', content: 'Hi' }]
    });
    expect(response.status).toBe(403);
    expect(harness.mockProvider.recordedRequests.length).toBe(callsBefore);
  });

  it('refuses endpoints that bypass per-request pricing', async () => {
    const response = await callCappedApp('/v1/files', { purpose: 'batch' });
    expect(response.status).toBe(403);
  });

  it('refunds the reservation when the provider answers with an error', async () => {
    const before = readKeySpend();
    const response = await fetch(`${harness.gatewayURL}/anthropic/v1/messages/count_tokens`, {
      method: 'POST',
      headers: { 'x-api-key': CAPPED_APP.appSecret, 'x-key-handle': handle },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', messages: [] })
    });
    expect(response.status).toBe(404);
    await Bun.sleep(10);
    expect(readKeySpend()).toBe(before);
  });

  it('refuses a request once the key would pass its daily limit', async () => {
    const response = await callCappedApp('/v1/chat/completions', {
      model: 'claude-opus-4-1',
      messages: [{ role: 'user', content: 'Write a novel' }]
    });
    expect(response.status).toBe(429);
    expect(((await response.json()) as { message: string }).message).toBe(
      'This key reached its daily spend limit'
    );
  });
});

describe('counting spend and running requests', () => {
  const charge = (amount: number): SpendCharge => ({
    counterID: 'spend:key:k1:2026-11-06',
    amount,
    limit: 100,
    expiresAt: 4102444800
  });

  it('reserves up to the limit and names the counter that is full', async () => {
    const counter = createMemorySpendCounter();
    expect((await counter.reserveSpend([charge(60)])).ok).toBe(true);
    const refused = await counter.reserveSpend([{ ...charge(10), counterID: 'other' }, charge(60)]);
    expect(refused.ok ? null : refused.error).toBe(1);
    await counter.adjustSpend([charge(-60)]);
    expect((await counter.reserveSpend([charge(100)])).ok).toBe(true);
  });

  it('allows a fixed number of requests per key at once', () => {
    const tracker = createConcurrencyTracker();
    expect(tracker.acquireSlot('k1', 1)).toBe(true);
    expect(tracker.acquireSlot('k1', 1)).toBe(false);
    expect(tracker.acquireSlot('k2', 1)).toBe(true);
    tracker.releaseSlot('k1');
    expect(tracker.acquireSlot('k1', 1)).toBe(true);
  });
});

describe('counting spend in DynamoDB', () => {
  const charges: SpendCharge[] = [
    { counterID: 'spend:key:k1:2026-11-06', amount: 40, limit: 100, expiresAt: 4102444800 },
    { counterID: 'spend:app:a1:2026-11-06', amount: 40, limit: 50, expiresAt: 4102444800 }
  ];

  function createFakeDynamo(cancellationCodes: string[] | null) {
    const commands: (TransactWriteItemsCommand | UpdateItemCommand)[] = [];
    const send = async (command: TransactWriteItemsCommand | UpdateItemCommand) => {
      commands.push(command);
      if (!cancellationCodes) return {};
      throw new TransactionCanceledException({
        message: 'Transaction cancelled',
        $metadata: {},
        CancellationReasons: cancellationCodes.map((Code) => ({ Code }))
      });
    };
    return { client: { send } as unknown as DynamoSender, commands };
  }

  it('reserves every counter in one conditional transaction', async () => {
    const dynamo = createFakeDynamo(null);
    const counter = createDynamoSpendCounter({ client: dynamo.client, tableName: 'fiducy-keys' });
    expect((await counter.reserveSpend(charges)).ok).toBe(true);
    const input = (dynamo.commands[0] as TransactWriteItemsCommand).input;
    const update = input.TransactItems?.[1]?.Update;
    expect(update?.ConditionExpression).toContain('#spent <= :headroom');
    expect(update?.ExpressionAttributeValues?.[':headroom']).toEqual({ N: '10' });
  });

  it('names the counter whose condition failed', async () => {
    const dynamo = createFakeDynamo(['None', 'ConditionalCheckFailed']);
    const counter = createDynamoSpendCounter({ client: dynamo.client, tableName: 'fiducy-keys' });
    const refused = await counter.reserveSpend(charges);
    expect(refused.ok ? null : refused.error).toBe(1);
  });

  it('settles each counter with a plain atomic add', async () => {
    const dynamo = createFakeDynamo(null);
    const counter = createDynamoSpendCounter({ client: dynamo.client, tableName: 'fiducy-keys' });
    await counter.adjustSpend(charges.map((charge) => ({ ...charge, amount: -25 })));
    const input = (dynamo.commands[0] as UpdateItemCommand).input;
    expect(input.UpdateExpression).toBe('ADD #spent :amount SET #expiresAt = :expiresAt');
    expect(input.ExpressionAttributeValues?.[':amount']).toEqual({ N: '-25' });
  });
});
