import { createLocalKeyWrapper } from '@fiducy/core';
import { createProviderRegistry } from '@fiducy/providers';
import { answerMockProviderRequest } from '@fiducy/testing';

import { createEnclaverAttestation } from './attestation';
import { createCachingKeyWrapper } from './cachingKeyWrapper';
import { GATEWAY_TOKEN_PURPOSE, MOCK_PROVIDER_PATH_PREFIX } from './constants';
import { SHARE_CACHE_MAXIMUM_ENTRIES, SHARE_CACHE_TIME_TO_LIVE_MILLISECONDS } from './constants';
import { KEY_UPLOAD_BUCKET_CAPACITY, KEY_UPLOAD_MAXIMUM_TRACKED_CLIENTS } from './constants';
import { KEY_UPLOAD_REFILL_PER_SECOND } from './constants';
import { createDynamoBlobStore } from './dynamoBlobStore';
import { createDynamoClient, createDynamoKeyStore } from './dynamoKeyStore';
import { createKmsClient, createKmsKeyWrapper, decryptBootSecret } from './kmsKeyWrapper';
import { readMasterKey } from './masterKey';
import { createMemoryAppDirectory, createMemoryBlobStore } from './memoryStores';
import { createMemoryKeyStore, createMemoryUsageLedger } from './memoryStores';
import { createPostgresKeyStore } from './postgresKeyStore';
import { createRemoteAppDirectory } from './remoteAppDirectory';
import { createRemoteKeyEvents } from './remoteKeyEvents';
import { createRemoteUsageLedger } from './remoteUsageLedger';
import { createGateway } from './router';
import { startTlsFront } from './tlsFront';
import { createTokenBucketRateLimiter } from './tokenBucketRateLimiter';

import type { KeyWrapper } from '@fiducy/core';
import type { AppRegistration, ControlPlaneConnection, GatewayRuntime } from './types';
import type { BlobStore, KeyStore, KmsSettings } from './types';
import type { RequestHandler } from './types';

function readKmsSettings(): KmsSettings | null {
  const keyID = process.env.FIDUCY_KMS_KEY_ID;
  if (!keyID) return null;
  const endpoint = process.env.AWS_KMS_ENDPOINT ?? 'http://127.0.0.1:9999';
  const region = process.env.AWS_REGION ?? 'us-east-1';
  return { client: createKmsClient(endpoint, region), keyID };
}

function readAppRegistrations(): AppRegistration[] {
  return JSON.parse(process.env.FIDUCY_APPS_JSON ?? '[]');
}

async function readGatewayToken(kms: KmsSettings | null): Promise<string | undefined> {
  const ciphertext = process.env.FIDUCY_GATEWAY_TOKEN_CIPHERTEXT;
  if (!ciphertext) return process.env.FIDUCY_GATEWAY_TOKEN;
  if (!kms) throw new Error('FIDUCY_GATEWAY_TOKEN_CIPHERTEXT needs FIDUCY_KMS_KEY_ID');
  return decryptBootSecret(kms.client, kms.keyID, ciphertext, GATEWAY_TOKEN_PURPOSE);
}

async function readControlPlaneConnection(
  kms: KmsSettings | null
): Promise<ControlPlaneConnection | null> {
  const controlPlaneURL = process.env.FIDUCY_CONTROL_PLANE_URL;
  if (!controlPlaneURL) return null;
  const gatewayToken = await readGatewayToken(kms);
  if (!gatewayToken) throw new Error('Set FIDUCY_GATEWAY_TOKEN to match the control plane');
  return { controlPlaneURL, gatewayToken };
}

function selectKeyStore(): KeyStore {
  const tableName = process.env.FIDUCY_KEYS_TABLE;
  const databaseURL = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (tableName) {
    const client = createDynamoClient(process.env.AWS_REGION ?? 'us-east-1');
    return createDynamoKeyStore({ client, tableName });
  }
  if (databaseURL) return createPostgresKeyStore({ databaseURL });
  return createMemoryKeyStore();
}

function selectBlobStore(): BlobStore {
  const tableName = process.env.FIDUCY_KEYS_TABLE;
  if (!tableName) return createMemoryBlobStore();
  const client = createDynamoClient(process.env.AWS_REGION ?? 'us-east-1');
  return createDynamoBlobStore({ client, tableName });
}

function selectKeyWrapper(kms: KmsSettings | null): KeyWrapper {
  if (!kms) return createLocalKeyWrapper(readMasterKey());
  return createCachingKeyWrapper({
    keyWrapper: createKmsKeyWrapper(kms),
    timeToLiveMilliseconds: SHARE_CACHE_TIME_TO_LIVE_MILLISECONDS,
    maximumEntries: SHARE_CACHE_MAXIMUM_ENTRIES
  });
}

function readMockProviderURL(): string | null {
  const publicURL = process.env.FIDUCY_GATEWAY_PUBLIC_URL;
  if (process.env.FIDUCY_MOCK_PROVIDERS !== 'true') return null;
  if (!publicURL) throw new Error('FIDUCY_MOCK_PROVIDERS needs FIDUCY_GATEWAY_PUBLIC_URL');
  return publicURL;
}

function withMockProvider(gateway: RequestHandler, mockProviderURL: string | null): RequestHandler {
  if (!mockProviderURL) return gateway;
  return async (request) => {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith(MOCK_PROVIDER_PATH_PREFIX)) return gateway(request);
    return answerMockProviderRequest(pathname, await request.text());
  };
}

export async function createGatewayFromEnvironment(): Promise<GatewayRuntime> {
  const kms = readKmsSettings();
  const connection = await readControlPlaneConnection(kms);
  const enclaveAPIURL = process.env.FIDUCY_ENCLAVE_API_URL;
  const mockProviderURL = readMockProviderURL();
  const usageLedger = connection
    ? createRemoteUsageLedger({ ...connection, flushIntervalMilliseconds: 5000 })
    : null;
  const keyWrapper = selectKeyWrapper(kms);
  const gateway = createGateway({
    keyWrapper,
    keyStore: selectKeyStore(),
    keyEvents: connection ? createRemoteKeyEvents(connection) : undefined,
    appDirectory: connection
      ? createRemoteAppDirectory({ ...connection, refreshIntervalMilliseconds: 30000 })
      : await createMemoryAppDirectory(readAppRegistrations()),
    usageLedger: usageLedger ?? createMemoryUsageLedger(),
    providerRegistry: createProviderRegistry(
      mockProviderURL ? { openai: mockProviderURL, anthropic: mockProviderURL } : undefined
    ),
    attest: enclaveAPIURL ? createEnclaverAttestation(enclaveAPIURL) : undefined,
    mockProviders: mockProviderURL !== null,
    controlPlaneToken: connection?.gatewayToken,
    rateLimiter: createTokenBucketRateLimiter({
      capacity: KEY_UPLOAD_BUCKET_CAPACITY,
      refillPerSecond: KEY_UPLOAD_REFILL_PER_SECOND,
      maximumTrackedClients: KEY_UPLOAD_MAXIMUM_TRACKED_CLIENTS
    })
  });
  return {
    handleRequest: withMockProvider(gateway, mockProviderURL),
    usageLedger,
    keyWrapper,
    keyWrapperName: kms ? 'KMS' : 'a local master key'
  };
}

export async function startTlsFrontFromEnvironment(keyWrapper: KeyWrapper): Promise<void> {
  const directory = process.env.FIDUCY_TLS_STATE_DIR;
  const caddyConfigPath = process.env.FIDUCY_CADDY_CONFIG;
  if (!directory || !caddyConfigPath) return;
  await startTlsFront({ directory, caddyConfigPath, blobStore: selectBlobStore(), keyWrapper });
}
