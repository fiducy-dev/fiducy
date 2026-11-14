import { fail, succeed } from '@fiducy/core';

import { SPEND_COUNTER_SWEEP_INTERVAL_MILLISECONDS } from './constants';

import type { ConcurrencyTracker, SpendCharge, SpendCounter, SpendTotal } from './types';

export function createMemorySpendCounter(readCurrentTime = Date.now): SpendCounter {
  const counters = new Map<string, SpendTotal>();
  let nextSweepAt = 0;

  const sweepExpiredCounters = () => {
    const nowSeconds = readCurrentTime() / 1000;
    if (readCurrentTime() < nextSweepAt) return;
    nextSweepAt = readCurrentTime() + SPEND_COUNTER_SWEEP_INTERVAL_MILLISECONDS;
    for (const [counterID, counter] of counters) {
      if (counter.expiresAt < nowSeconds) counters.delete(counterID);
    }
  };

  const addSpend = (charge: SpendCharge) => {
    const spent = counters.get(charge.counterID)?.spent ?? 0;
    counters.set(charge.counterID, { spent: spent + charge.amount, expiresAt: charge.expiresAt });
  };

  return {
    reserveSpend: async (charges) => {
      sweepExpiredCounters();
      const fullIndex = charges.findIndex(
        (charge) => (counters.get(charge.counterID)?.spent ?? 0) + charge.amount > charge.limit
      );
      if (fullIndex !== -1) return fail(fullIndex);
      charges.forEach(addSpend);
      return succeed(null);
    },
    adjustSpend: async (charges) => {
      charges.forEach(addSpend);
    }
  };
}

export function createConcurrencyTracker(): ConcurrencyTracker {
  const runningRequests = new Map<string, number>();
  return {
    acquireSlot: (keyID, limit) => {
      const running = runningRequests.get(keyID) ?? 0;
      if (running >= limit) return false;
      runningRequests.set(keyID, running + 1);
      return true;
    },
    releaseSlot: (keyID) => {
      const running = (runningRequests.get(keyID) ?? 1) - 1;
      if (running <= 0) runningRequests.delete(keyID);
      else runningRequests.set(keyID, running);
    }
  };
}
