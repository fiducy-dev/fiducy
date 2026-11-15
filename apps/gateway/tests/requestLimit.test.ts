import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import { SAMPLE_API_KEY } from '@fiducy/testing';
import { createDynamoSpendCounter } from '../src/dynamoSpendCounter';
import { reserveRequest } from '../src/requestLimit';
import { createMemorySpendCounter } from '../src/spendCounters';
import { CHAT_APP, startGatewayHarness } from './harness';

import type { TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import type { AppRegistration, DynamoSender } from '../src/types';

const PAIR_APP: AppRegistration = {
  ...CHAT_APP,
  appID: 'app_pairwise',
  appSecret: 'app_sk_pairwise_5Rt8Kq2Vn6Wb3Lm',
  monthlyRequestLimitPerKey: 2
};
const NOVEMBER = new Date('2026-11-15T12:00:00Z');

describe('reserving a request against the monthly limit', () => {
  it('allows the limit, refuses the next, and frees a slot on refund', async () => {
    const counter = createMemorySpendCounter(() => NOVEMBER.getTime());
    const reserve = () => reserveRequest(PAIR_APP, 'key_one', counter, NOVEMBER);
    const first = await reserve();
    expect((await reserve()).ok).toBe(true);
    const refused = await reserve();
    expect(refused.ok ? null : refused.error.message).toBe(
      'This key reached its monthly request limit'
    );
    if (first.ok) {
      first.value.refund();
      first.value.refund();
    }
    await Bun.sleep(1);
    expect((await reserve()).ok).toBe(true);
    expect((await reserve()).ok).toBe(false);
  });

  it('starts every key at zero each month', async () => {
    const counter = createMemorySpendCounter(() => NOVEMBER.getTime());
    await reserveRequest(PAIR_APP, 'key_one', counter, NOVEMBER);
    await reserveRequest(PAIR_APP, 'key_one', counter, NOVEMBER);
    const december = new Date('2026-12-01T00:00:00Z');
    expect((await reserveRequest(PAIR_APP, 'key_one', counter, december)).ok).toBe(true);
  });

  it('keeps the count in DynamoDB with a condition and an expiry after the month', async () => {
    const commands: TransactWriteItemsCommand[] = [];
    const send = async (command: TransactWriteItemsCommand) => {
      commands.push(command);
      return {};
    };
    const client = { send } as unknown as DynamoSender;
    const counter = createDynamoSpendCounter({ client, tableName: 'fiducy-keys' });
    await reserveRequest(PAIR_APP, 'key_one', counter, NOVEMBER);
    const update = commands[0]?.input.TransactItems?.[0]?.Update;
    expect(update?.Key).toEqual({ keyID: { S: 'requests:key:key_one:2026-11' } });
    expect(update?.ExpressionAttributeValues?.[':headroom']).toEqual({ N: '1' });
    const firstOfDecember = Date.UTC(2026, 11, 1) / 1000;
    expect(update?.ExpressionAttributeValues?.[':expiresAt']).toEqual({
      N: String(firstOfDecember + 24 * 60 * 60)
    });
  });
});

describe('the monthly limit on proxied requests', () => {
  let harness: Awaited<ReturnType<typeof startGatewayHarness>>;

  beforeAll(async () => {
    harness = await startGatewayHarness([PAIR_APP]);
  });

  afterAll(() => harness.stop());

  const storeHandle = async () =>
    (await harness.storeKey(PAIR_APP.appID, SAMPLE_API_KEY)).body.data.handle;

  const callProvider = (handle: string, path: string) =>
    fetch(`${harness.gatewayURL}${path}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${PAIR_APP.appSecret}`, 'x-key-handle': handle },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [] })
    });

  it('lets only the limit through when requests arrive at once', async () => {
    const handle = await storeHandle();
    const responses = await Promise.all(
      [1, 2, 3, 4].map(() => callProvider(handle, '/openai/v1/chat/completions'))
    );
    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([200, 200, 429, 429]);
  });

  it('does not count a request the provider answered with an error', async () => {
    const handle = await storeHandle();
    for (const _attempt of [1, 2, 3]) {
      const failed = await callProvider(handle, '/anthropic/v1/messages/count_tokens');
      expect(failed.status).toBe(404);
    }
    await Bun.sleep(10);
    expect((await callProvider(handle, '/openai/v1/chat/completions')).status).toBe(200);
  });
});
