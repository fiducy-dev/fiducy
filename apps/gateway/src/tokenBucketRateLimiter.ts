import type { RateLimiter, TokenBucket, TokenBucketOptions } from './types';

export function identifyClient(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const nearestForwardedAddress = forwardedFor?.split(',').at(-1)?.trim();
  if (nearestForwardedAddress) return `ip:${nearestForwardedAddress}`;
  return `origin:${request.headers.get('origin') ?? 'unknown'}`;
}

export function createTokenBucketRateLimiter({
  capacity,
  refillPerSecond,
  maximumTrackedClients,
  readCurrentTime = Date.now
}: TokenBucketOptions): RateLimiter {
  const buckets = new Map<string, TokenBucket>();

  const refillBucket = (clientID: string, currentTime: number): TokenBucket => {
    const bucket = buckets.get(clientID) ?? { tokens: capacity, refilledAt: currentTime };
    const elapsedSeconds = (currentTime - bucket.refilledAt) / 1000;
    buckets.delete(clientID);
    return {
      tokens: Math.min(capacity, bucket.tokens + elapsedSeconds * refillPerSecond),
      refilledAt: currentTime
    };
  };

  const saveBucket = (clientID: string, bucket: TokenBucket) => {
    const oldestClientID = buckets.keys().next().value;
    if (buckets.size >= maximumTrackedClients && oldestClientID !== undefined) {
      buckets.delete(oldestClientID);
    }
    buckets.set(clientID, bucket);
  };

  const consumeToken = (clientID: string) => {
    const bucket = refillBucket(clientID, readCurrentTime());
    const isAllowed = bucket.tokens >= 1;
    if (isAllowed) bucket.tokens -= 1;
    saveBucket(clientID, bucket);
    const retryAfterSeconds = isAllowed ? 0 : Math.ceil((1 - bucket.tokens) / refillPerSecond);
    return { isAllowed, retryAfterSeconds };
  };

  return { consumeToken };
}
