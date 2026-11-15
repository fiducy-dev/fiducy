import {
  GATEWAY_USAGE_PATH,
  MAXIMUM_QUEUED_USAGE_EVENTS,
  MAXIMUM_USAGE_BATCH_SIZE
} from './constants';
import { callControlPlane, normalizeError } from './controlPlane';
import { createMemoryUsageLedger } from './memoryStores';

import type { FlushableUsageLedger, RemoteUsageLedgerOptions, UsageEvent } from './types';

function toUsagePayload(event: UsageEvent) {
  return {
    appID: event.appID,
    keyID: event.keyID,
    provider: event.provider,
    inputTokens: event.usage.inputTokens,
    outputTokens: event.usage.outputTokens,
    recordedAt: event.recordedAt.toISOString()
  };
}

// Usage waits in memory until the control plane takes it. The enclave is stopped without
// warning, so whatever is queued then is lost; the cap keeps a long control plane outage from
// filling the enclave's memory, at the cost of the oldest events.
export function createRemoteUsageLedger(options: RemoteUsageLedgerOptions): FlushableUsageLedger {
  const localLedger = createMemoryUsageLedger();
  const maximumQueuedEvents = options.maximumQueuedEvents ?? MAXIMUM_QUEUED_USAGE_EVENTS;
  let queuedEvents: UsageEvent[] = [];
  let droppedEventCount = 0;

  const trimQueue = () => {
    const excess = queuedEvents.length - maximumQueuedEvents;
    if (excess <= 0) return;
    queuedEvents = queuedEvents.slice(excess);
    droppedEventCount += excess;
  };

  const reportDroppedEvents = () => {
    if (droppedEventCount === 0) return;
    console.error(`Dropped ${droppedEventCount} usage events while the control plane was away`);
    droppedEventCount = 0;
  };

  const flush = async () => {
    reportDroppedEvents();
    const batch = queuedEvents.slice(0, MAXIMUM_USAGE_BATCH_SIZE);
    if (batch.length === 0) return 0;
    queuedEvents = queuedEvents.slice(batch.length);
    try {
      await callControlPlane(options, GATEWAY_USAGE_PATH, {
        method: 'POST',
        body: JSON.stringify({ events: batch.map(toUsagePayload) })
      });
      return batch.length;
    } catch (error) {
      queuedEvents = [...batch, ...queuedEvents];
      trimQueue();
      console.error(`Could not send usage to the control plane: ${normalizeError(error)}`);
      return 0;
    }
  };

  const timer = setInterval(flush, options.flushIntervalMilliseconds);

  return {
    recordUsage: async (event) => {
      await localLedger.recordUsage(event);
      queuedEvents.push(event);
      trimQueue();
    },
    countRequestsThisMonth: localLedger.countRequestsThisMonth,
    flush,
    stop: async () => {
      clearInterval(timer);
      await flush();
    }
  };
}
