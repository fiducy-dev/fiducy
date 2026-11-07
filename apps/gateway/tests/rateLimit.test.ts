import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import { SAMPLE_API_KEY } from '@fiducy/testing';
import { createTokenBucketRateLimiter, identifyClient } from '../src/tokenBucketRateLimiter';
import { CHAT_APP, startGatewayHarness } from './harness';

function createLimiterWithClock(maximumTrackedClients = 100) {
  const clock = { currentTime: 1_000_000 };
  const rateLimiter = createTokenBucketRateLimiter({
    capacity: 3,
    refillPerSecond: 1 / 10,
    maximumTrackedClients,
    readCurrentTime: () => clock.currentTime
  });
  const consumeTokens = (clientID: string, count: number) =>
    Array.from({ length: count }, () => rateLimiter.consumeToken(clientID).isAllowed);
  return { clock, rateLimiter, consumeTokens };
}

describe('the token bucket', () => {
  it('allows a burst up to capacity and then refuses with a retry delay', () => {
    const { rateLimiter, consumeTokens } = createLimiterWithClock();
    expect(consumeTokens('ip:203.0.113.7', 3)).toEqual([true, true, true]);
    expect(rateLimiter.consumeToken('ip:203.0.113.7')).toEqual({
      isAllowed: false,
      retryAfterSeconds: 10
    });
  });

  it('refills one token every ten seconds', () => {
    const { clock, consumeTokens } = createLimiterWithClock();
    consumeTokens('ip:203.0.113.7', 3);
    clock.currentTime += 9999;
    expect(consumeTokens('ip:203.0.113.7', 1)).toEqual([false]);
    clock.currentTime += 1;
    expect(consumeTokens('ip:203.0.113.7', 2)).toEqual([true, false]);
  });

  it('gives every client its own bucket', () => {
    const { consumeTokens } = createLimiterWithClock();
    consumeTokens('ip:203.0.113.7', 3);
    expect(consumeTokens('ip:198.51.100.23', 1)).toEqual([true]);
  });

  it('forgets the least recently seen client when it tracks too many', () => {
    const { consumeTokens } = createLimiterWithClock(2);
    consumeTokens('ip:203.0.113.7', 3);
    consumeTokens('ip:198.51.100.23', 1);
    consumeTokens('ip:192.0.2.44', 1);
    expect(consumeTokens('ip:203.0.113.7', 1)).toEqual([true]);
  });
});

describe('identifying the client', () => {
  const buildRequest = (headers: Record<string, string>) =>
    new Request('https://gateway.fiducy.example/keys', { method: 'POST', headers });

  it('uses the address added by the nearest proxy', () => {
    const request = buildRequest({ 'x-forwarded-for': '10.0.0.1, 203.0.113.7' });
    expect(identifyClient(request)).toBe('ip:203.0.113.7');
  });

  it('falls back to the origin when there is no forwarded address', () => {
    const request = buildRequest({ origin: 'https://chatforge.example' });
    expect(identifyClient(request)).toBe('origin:https://chatforge.example');
  });
});

describe('rate limiting POST /keys', () => {
  let harness: Awaited<ReturnType<typeof startGatewayHarness>>;

  beforeAll(async () => {
    const rateLimiter = createTokenBucketRateLimiter({
      capacity: 2,
      refillPerSecond: 1 / 60,
      maximumTrackedClients: 100
    });
    harness = await startGatewayHarness([], rateLimiter);
  });

  afterAll(() => harness.stop());

  it('returns 429 with retry-after once a client adds too many keys', async () => {
    const attacker = { 'x-forwarded-for': '203.0.113.7' };
    expect((await harness.storeKey(CHAT_APP.appID, SAMPLE_API_KEY, attacker)).status).toBe(201);
    expect((await harness.storeKey(CHAT_APP.appID, SAMPLE_API_KEY, attacker)).status).toBe(201);
    const refused = await harness.storeKey(CHAT_APP.appID, SAMPLE_API_KEY, attacker);
    expect(refused.status).toBe(429);
    expect(refused.retryAfter).toBe('60');
    expect(refused.body.data).toBeNull();
    expect(refused.body.message).toBe('Too many keys added. Try again shortly');
  });

  it('keeps accepting keys from other clients', async () => {
    const neighbor = { 'x-forwarded-for': '198.51.100.23' };
    expect((await harness.storeKey(CHAT_APP.appID, SAMPLE_API_KEY, neighbor)).status).toBe(201);
  });
});
