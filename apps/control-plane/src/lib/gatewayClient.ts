import { fail, succeed } from './result';

import { DEFAULT_GATEWAY_URL, GATEWAY_RECORD_GONE_STATUSES } from './constants';
import { GATEWAY_APP_REFRESH_PATH } from './constants';
import { GATEWAY_UNAVAILABLE } from './failures';

import type { GatewayClient, GatewayConnection } from './types';

export function readGatewayConnection(): GatewayConnection {
  return {
    gatewayURL: process.env.FIDUCY_GATEWAY_URL ?? DEFAULT_GATEWAY_URL,
    gatewayToken: process.env.FIDUCY_GATEWAY_TOKEN ?? null
  };
}

async function requestRecordDeletion(
  { gatewayURL, gatewayToken }: GatewayConnection,
  appID: string,
  keyID: string
): Promise<number | null> {
  const url = new URL(`/keys/${keyID}`, gatewayURL);
  url.searchParams.set('appID', appID);
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${gatewayToken ?? ''}` }
    });
    return response.status;
  } catch (error) {
    console.error(`Gateway unreachable: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function requestAppsRefresh({ gatewayURL, gatewayToken }: GatewayConnection) {
  try {
    const response = await fetch(new URL(GATEWAY_APP_REFRESH_PATH, gatewayURL), {
      method: 'POST',
      headers: { authorization: `Bearer ${gatewayToken ?? ''}` }
    });
    return response.ok;
  } catch (error) {
    console.error(`Gateway unreachable: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

export function createGatewayClient(connection: GatewayConnection): GatewayClient {
  return {
    refreshApps: () => requestAppsRefresh(connection),
    deleteRecord: async (appID, keyID) => {
      const status = await requestRecordDeletion(connection, appID, keyID);
      if (status === null || !GATEWAY_RECORD_GONE_STATUSES.includes(status)) {
        return fail(GATEWAY_UNAVAILABLE);
      }
      return succeed(null);
    }
  };
}

export function getGatewayClient(): GatewayClient {
  return createGatewayClient(readGatewayConnection());
}
