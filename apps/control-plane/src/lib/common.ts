import { RECENT_SIGN_IN_MILLISECONDS } from './constants';

export function groupBy<Item>(items: Item[], toGroupKey: (item: Item) => string) {
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    const groupKey = toGroupKey(item);
    const group = groups.get(groupKey);
    if (group) group.push(item);
    else groups.set(groupKey, [item]);
  }
  return groups;
}

export function splitIntoBatches<Item>(items: Item[], batchSize: number): Item[][] {
  const batches: Item[][] = [];
  for (let start = 0; start < items.length; start += batchSize) {
    batches.push(items.slice(start, start + batchSize));
  }
  return batches;
}

export function readBearerToken(headers: Headers): string {
  const authorization = headers.get('authorization') ?? '';
  return authorization.replace(/^Bearer\s+/i, '').trim();
}

export function isRecentSignIn(signedInAt: Date, now = Date.now()): boolean {
  return now - signedInAt.getTime() <= RECENT_SIGN_IN_MILLISECONDS;
}
