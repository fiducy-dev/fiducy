import type { SealedRecord } from '@fiducy/core';
import type { StorageSchema } from '../storage/types.ts';
import type { FetchGateway, GatewayProvider, ProviderSettings } from '../types.ts';

export type KeySource = 'widget' | 'import';

export interface StoredUserKey {
  userID: string;
  provider: GatewayProvider;
  keyID: string;
  handle: string;
  record?: SealedRecord;
  source?: KeySource;
  createdAt: string;
}

export interface UserKeySummary {
  keyID: string;
  provider: GatewayProvider;
  createdAt: string;
}

export interface ImportKeyInput {
  userID: string;
  provider: GatewayProvider;
  apiKey: string;
}

export interface ImportedUserKey extends UserKeySummary {
  userID: string;
}

export interface ImportKeysResult {
  imported: ImportedUserKey[];
  skipped: Array<{ userID: string; provider: GatewayProvider }>;
}

export interface FiducyStorage {
  saveKey: (key: StoredUserKey) => Promise<void>;
  findKey: (userID: string, provider: GatewayProvider) => Promise<StoredUserKey | null>;
  listKeys: (userID: string) => Promise<StoredUserKey[]>;
  deleteKey: (userID: string, keyID: string) => Promise<boolean>;
  schema?: StorageSchema;
}

export interface KeyValueDriver {
  getItem: (key: string) => Promise<unknown>;
  setItem: (key: string, value: StoredUserKey) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  getKeys: (base?: string) => Promise<string[]>;
}

export type GetUserID = (request: Request) => Promise<string | null> | string | null;

export interface CreateFiducyOptions {
  storage: FiducyStorage;
  getUserID: GetUserID;
  gatewayURL?: string;
  appID?: string;
  appSecret?: string;
  basePath?: string;
  fetch?: FetchGateway;
  env?: EnvironmentVariables;
}

export type EnvironmentVariables = Record<string, string | undefined>;

export interface FiducyConnection {
  gatewayURL: string;
  appID: string | null;
  appSecret: string;
}

export interface PublicFiducyConfig {
  gatewayURL: string;
  appID: string;
  basePath: string;
}

export interface SaveKeyInput {
  provider: GatewayProvider;
  handle: string;
  record?: SealedRecord;
}

export type UserLookup = { userID: string } | { request: Request } | { headers: Headers };

export type MissingKeyReason = 'signed-out' | 'no-key';

export interface MissingKey {
  ok: false;
  reason: MissingKeyReason;
  provider: GatewayProvider;
  message: string;
}

export type ProviderFetch = typeof globalThis.fetch;

export interface ConnectedKeySettings extends ProviderSettings {
  ok: true;
  fetch: ProviderFetch;
}

export type ProviderSettingsResult = ConnectedKeySettings | MissingKey;

export interface Fiducy {
  handler: (request: Request) => Promise<Response>;
  providerSettings: (
    provider: GatewayProvider,
    user: UserLookup
  ) => Promise<ProviderSettingsResult>;
  listKeys: (userID: string) => Promise<UserKeySummary[]>;
  saveKey: (userID: string, input: SaveKeyInput) => Promise<UserKeySummary>;
  revokeKey: (userID: string, keyID: string) => Promise<boolean>;
  importKeys: (keys: ImportKeyInput[]) => Promise<ImportKeysResult>;
  basePath: string;
  storage: FiducyStorage;
}

export interface EnvironmentHolder {
  process?: { env?: Record<string, string | undefined> };
}

export interface GatewayErrorBody {
  message?: string;
}

export interface KeyActions {
  listKeys: (userID: string) => Promise<UserKeySummary[]>;
  saveKey: (userID: string, input: SaveKeyInput) => Promise<UserKeySummary>;
  revokeKey: (userID: string, keyID: string) => Promise<boolean>;
}

export interface RouterInput {
  basePath: string;
  getUserID: GetUserID;
  readConnection: () => FiducyConnection;
  actions: KeyActions;
}
