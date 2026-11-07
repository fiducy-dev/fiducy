import { createControlStore, createMemoryKeyValueStore } from '../src/lib/controlStore';

import { fail, succeed } from '../src/lib/result';

import { GATEWAY_UNAVAILABLE } from '../src/lib/failures';

import type { AppSettings, GatewayClient, UsageEvent } from '../src/lib/types';

export const OWNER_ID = 'user_ben';
export const OTHER_OWNER_ID = 'user_mallory';

export const CHAT_SETTINGS: AppSettings = {
  name: 'Chatforge',
  monthlyRequestLimitPerKey: 100,
  allowedOrigins: ['https://chatforge.example']
};

export function createTestStore() {
  return createControlStore(createMemoryKeyValueStore());
}

export function createUsageEvent(appID: string, keyID: string, recordedAt: string): UsageEvent {
  return { appID, keyID, provider: 'openai', inputTokens: 10, outputTokens: 25, recordedAt };
}

export function createFakeGateway(isReachable = true) {
  const deletedRecords: Array<{ appID: string; keyID: string }> = [];
  const client: GatewayClient = {
    deleteRecord: async (appID, keyID) => {
      if (!isReachable) return fail(GATEWAY_UNAVAILABLE);
      deletedRecords.push({ appID, keyID });
      return succeed(null);
    }
  };
  return { client, deletedRecords };
}
