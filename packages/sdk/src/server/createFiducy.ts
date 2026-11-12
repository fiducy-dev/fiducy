import { parseHandle } from '@fiducy/core';

import { DEFAULT_BASE_PATH, MAX_IMPORT_BATCH_SIZE } from '../constants.ts';
import { createGatewayClient } from '../gatewayClient.ts';
import { assertGatewayAttested } from './attestation.ts';
import { refuseExposedSecret, resolveConnection } from './environment.ts';
import { FiducyGatewayError, FiducyInputError } from './errors.ts';
import { createProviderSettingsResolver } from './providerSettings.ts';
import { createRouter } from './routes.ts';
import { isProvider } from './validators.ts';

import type { GatewayClient } from '../types.ts';
import type { CreateFiducyOptions, Fiducy, FiducyConnection } from './types.ts';
import type { ImportKeyInput, ImportKeysResult, ImportedUserKey } from './types.ts';
import type { KeySource, SaveKeyInput, StoredUserKey, UserKeySummary } from './types.ts';

function toSummary({ keyID, provider, createdAt }: StoredUserKey): UserKeySummary {
  return { keyID, provider, createdAt };
}

function chunk<Item>(items: Item[], size: number): Item[][] {
  const chunks: Item[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
}

function createLazyConnection(options: CreateFiducyOptions) {
  let connection: FiducyConnection | null = null;
  let gateway: GatewayClient | null = null;
  const readConnection = () => {
    connection ??= resolveConnection(options);
    return connection;
  };
  const readGateway = () => {
    gateway ??= createGatewayClient({ ...readConnection(), fetch: options.fetch });
    return gateway;
  };
  return { readConnection, readGateway };
}

export function createFiducy(options: CreateFiducyOptions): Fiducy {
  refuseExposedSecret(options.env);
  const { storage, getUserID } = options;
  const basePath = (options.basePath ?? DEFAULT_BASE_PATH).replace(/\/+$/, '');
  const { readConnection, readGateway } = createLazyConnection(options);

  const revokeKey = async (userID: string, keyID: string) => {
    const stored = (await storage.listKeys(userID)).find((key) => key.keyID === keyID);
    if (!stored) return false;
    if (!stored.record) {
      const revoked = await readGateway().revokeKey(stored.handle);
      if (!revoked.ok && revoked.error.status !== 404) {
        throw new FiducyGatewayError(`The key could not be revoked: ${revoked.error.message}`);
      }
    }
    return storage.deleteKey(userID, keyID);
  };

  const saveKey = async (userID: string, input: SaveKeyInput, source: KeySource = 'widget') => {
    const parsedHandle = parseHandle(input.handle);
    if (!parsedHandle.ok) throw new FiducyInputError('The key handle is malformed');
    const { keyID } = parsedHandle.value;
    if (input.record && input.record.keyID !== keyID) {
      throw new FiducyInputError('The record does not belong to this handle');
    }
    const previous = await storage.findKey(userID, input.provider);
    const { provider, handle, record } = input;
    const createdAt = new Date().toISOString();
    const stored: StoredUserKey = { userID, provider, keyID, handle, record, source, createdAt };
    await storage.saveKey(stored);
    if (previous && previous.keyID !== keyID) {
      await revokeKey(userID, previous.keyID).catch(() => false);
    }
    return toSummary(stored);
  };

  const importBatch = async (batch: ImportKeyInput[]): Promise<ImportedUserKey[]> => {
    const sealed = await readGateway().importKeys(batch.map(({ apiKey }) => apiKey));
    if (!sealed.ok) {
      throw new FiducyGatewayError(`The keys could not be imported: ${sealed.error.message}`);
    }
    const imported: ImportedUserKey[] = [];
    for (const [index, { userID, provider }] of batch.entries()) {
      const key = sealed.value.keys[index];
      if (!key) throw new FiducyGatewayError('The gateway returned fewer keys than were sent');
      const summary = await saveKey(userID, { provider, ...key }, 'import');
      imported.push({ ...summary, userID });
    }
    return imported;
  };

  const importKeys = async (keys: ImportKeyInput[]): Promise<ImportKeysResult> => {
    const result: ImportKeysResult = { imported: [], skipped: [] };
    const pending: ImportKeyInput[] = [];
    for (const key of keys) {
      if (!isProvider(key.provider)) {
        throw new FiducyInputError(`Unknown provider: ${key.provider}`);
      }
      const alreadyConnected = await storage.findKey(key.userID, key.provider);
      const alreadyPending = pending.some(
        (other) => other.userID === key.userID && other.provider === key.provider
      );
      if (alreadyConnected || alreadyPending) {
        result.skipped.push({ userID: key.userID, provider: key.provider });
      } else {
        pending.push(key);
      }
    }
    if (pending.length > 0) await assertGatewayAttested(readConnection(), options.fetch);
    for (const batch of chunk(pending, MAX_IMPORT_BATCH_SIZE)) {
      result.imported.push(...(await importBatch(batch)));
    }
    return result;
  };

  const listKeys = async (userID: string) => (await storage.listKeys(userID)).map(toSummary);
  const widgetSaveKey = (userID: string, input: SaveKeyInput) => saveKey(userID, input);
  const actions = { listKeys, saveKey: widgetSaveKey, revokeKey };

  return {
    handler: createRouter({ basePath, getUserID, readConnection, actions }),
    providerSettings: createProviderSettingsResolver(storage, getUserID, readConnection),
    listKeys,
    saveKey: widgetSaveKey,
    revokeKey,
    importKeys,
    basePath,
    storage
  };
}
