import type { DeleteItemCommand, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import type { DeleteItemCommandOutput, GetItemCommandOutput } from '@aws-sdk/client-dynamodb';
import type { PutItemCommandOutput } from '@aws-sdk/client-dynamodb';
import type { DecryptCommand, EncryptCommand } from '@aws-sdk/client-kms';
import type { Bytes, KeyWrapper, Result, SealedRecord } from '@fiducy/core';
import type { ProviderName, ProviderRegistry, TokenUsage } from '@fiducy/providers';

export type RecordStorage = 'fiducy' | 'app';

export type KeySource = 'widget' | 'import';

export interface RegisteredApp {
  appID: string;
  name: string;
  monthlyRequestLimitPerKey: number;
  allowedOrigins: string[];
  recordStorage?: RecordStorage;
  allowKeyImport?: boolean;
  revokedKeyIDs?: string[];
}

export interface AppRegistration extends RegisteredApp {
  appSecret: string;
}

export interface KeyStore {
  saveRecord: (record: SealedRecord) => Promise<void>;
  findRecord: (keyID: string) => Promise<SealedRecord | null>;
  deleteRecord: (keyID: string) => Promise<boolean>;
}

export interface AppDirectory {
  findApp: (appID: string) => Promise<RegisteredApp | null>;
  findAppBySecret: (appSecret: string) => Promise<RegisteredApp | null>;
}

export interface UsageEvent {
  appID: string;
  keyID: string;
  provider: ProviderName;
  usage: TokenUsage;
  recordedAt: Date;
}

export interface UsageLedger {
  recordUsage: (event: UsageEvent) => Promise<void>;
  countRequestsThisMonth: (keyID: string) => Promise<number>;
}

export type AttestationSource = (nonce: Uint8Array | null) => Promise<Uint8Array | null>;

export interface GatewayDependencies {
  keyWrapper: KeyWrapper;
  keyStore: KeyStore;
  appDirectory: AppDirectory;
  usageLedger: UsageLedger;
  providerRegistry: ProviderRegistry;
  attest?: AttestationSource;
  mockProviders?: boolean;
  keyEvents?: KeyEventReporter;
  controlPlaneToken?: string;
  rateLimiter?: RateLimiter;
}

export interface StoreKeyBody {
  appID: string;
  apiKey: string;
}

export interface ImportKeysBody {
  apiKeys: string[];
}

export interface SealedKey {
  handle: string;
  record?: SealedRecord;
}

export interface GatewayFailure {
  status: number;
  message: string;
  code?: string;
}

export interface ResolvedKey {
  apiKey: string;
  record: SealedRecord;
}

export type GatewayResult<Value> = Result<Value, GatewayFailure>;

export type WidgetProtection = 'enclave' | 'test' | 'unattested';

export interface WidgetPageInput {
  appID: string;
  appName: string;
  parentOrigin: string;
  nonce: string;
  protection: WidgetProtection;
}

export type RequestHandler = (request: Request) => Promise<Response>;

export interface ControlPlaneConnection {
  controlPlaneURL: string;
  gatewayToken: string;
}

export interface RemoteAppDirectoryOptions extends ControlPlaneConnection {
  refreshIntervalMilliseconds: number;
}

export interface RemoteUsageLedgerOptions extends ControlPlaneConnection {
  flushIntervalMilliseconds: number;
}

export interface RemoteAppConfig extends RegisteredApp {
  appSecretHash: string;
}

export interface FlushableUsageLedger extends UsageLedger {
  flush: () => Promise<number>;
  stop: () => Promise<void>;
}

export interface KmsOutput {
  CiphertextBlob?: Uint8Array;
  Plaintext?: Uint8Array;
}

export interface KmsSender {
  send: (command: EncryptCommand | DecryptCommand) => Promise<KmsOutput>;
}

export interface KmsKeyWrapperOptions {
  client: KmsSender;
  keyID: string;
}

export interface DynamoSender {
  send(command: GetItemCommand): Promise<GetItemCommandOutput>;
  send(command: PutItemCommand): Promise<PutItemCommandOutput>;
  send(command: DeleteItemCommand): Promise<DeleteItemCommandOutput>;
}

export interface KmsSettings {
  client: KmsSender;
  keyID: string;
}

export interface GatewayRuntime {
  handleRequest: RequestHandler;
  usageLedger: FlushableUsageLedger | null;
  keyWrapper: KeyWrapper;
  keyWrapperName: string;
}

export interface VercelRequestContext {
  waitUntil?: (promise: Promise<unknown>) => void;
}

export interface PostgresKeyStoreOptions {
  databaseURL: string;
}

export interface SealedRecordRow {
  key_id: string;
  app_id: string;
  ciphertext: string;
  iv: string;
  wrapped_share_b: string;
}

export interface DynamoKeyStoreOptions {
  client: DynamoSender;
  tableName: string;
}

export interface BlobStore {
  readBlob: (name: string) => Promise<Bytes | null>;
  writeBlob: (name: string, bytes: Bytes) => Promise<void>;
}

export type DirectorySnapshot = Record<string, string>;

export interface TlsStateOptions {
  directory: string;
  blobStore: BlobStore;
  keyWrapper: KeyWrapper;
}

export interface TlsStateKeeper {
  restore: () => Promise<boolean>;
  persist: () => Promise<boolean>;
  start: (intervalMilliseconds: number) => () => void;
}

export interface TlsFrontOptions extends TlsStateOptions {
  caddyConfigPath: string;
}

export interface InstanceRoleCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: Date;
}

export interface KeyEvent {
  type: 'saved' | 'revoked';
  appID: string;
  keyID: string;
  source?: KeySource;
}

export interface RevokeCaller {
  appID: string;
  isControlPlane: boolean;
}

export interface KeyEventReporter {
  report: (event: KeyEvent) => Promise<void>;
}

export interface RateLimitDecision {
  isAllowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  consumeToken: (clientID: string) => RateLimitDecision;
}

export interface TokenBucketOptions {
  capacity: number;
  refillPerSecond: number;
  maximumTrackedClients: number;
  readCurrentTime?: () => number;
}

export interface TokenBucket {
  tokens: number;
  refilledAt: number;
}

export interface CachingKeyWrapperOptions {
  keyWrapper: KeyWrapper;
  timeToLiveMilliseconds: number;
  maximumEntries: number;
  readCurrentTime?: () => number;
}

export interface CachedShare {
  share: Bytes;
  expiresAt: number;
}
