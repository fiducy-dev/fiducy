import type { Result, SealedRecord } from '@fiducy/core';
import type { WidgetSealedRecord } from '@fiducy/widget';
import type { PROVIDER_BASE_PATHS } from './constants.ts';

export type GatewayProvider = keyof typeof PROVIDER_BASE_PATHS;

export type FetchGateway = (url: string, init: RequestInit) => Promise<Response>;

export interface GatewayClientOptions {
  gatewayURL: string;
  appSecret: string;
  fetch?: FetchGateway;
}

export interface ProviderSettings {
  baseURL: string;
  apiKey: string;
  headers: Record<string, string>;
}

export interface GatewayError {
  status: number;
  message: string;
}

export type GatewayResult<T> = Result<T, GatewayError>;

export interface RevokedKey {
  keyID: string;
}

export interface ImportedKey {
  handle: string;
  record?: SealedRecord;
}

export interface ImportedKeys {
  keys: ImportedKey[];
}

export interface GatewayClient {
  providerSettings: (provider: GatewayProvider, handle: string) => ProviderSettings;
  revokeKey: (handle: string) => Promise<GatewayResult<RevokedKey>>;
  importKeys: (apiKeys: string[]) => Promise<GatewayResult<ImportedKeys>>;
}

export interface GatewayResponseBody<T> {
  data: T | null;
  message: string;
}

export interface KeyWidgetProps {
  gatewayURL: string;
  appID: string;
  onHandle: (handle: string, record?: WidgetSealedRecord) => void;
  onError?: (message: string) => void;
  className?: string;
}

export interface UserKeySummaryView {
  keyID: string;
  provider: GatewayProvider;
  createdAt: string;
}

export interface ConnectKeyWidgetProps {
  gatewayURL: string;
  appID: string;
  provider: GatewayProvider;
  basePath?: string;
  onConnected?: (key: UserKeySummaryView) => void;
  onError?: (message: string) => void;
  className?: string;
}

export interface FiducyKeysState {
  keys: UserKeySummaryView[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  revoke: (keyID: string) => Promise<void>;
}

export type FiducyKeyState = 'loading' | 'signed-out' | 'connect' | 'connected' | 'error';

export interface FiducyBrowserConfig {
  gatewayURL: string;
  appID: string;
}

export interface FiducyKeyOptions {
  provider: GatewayProvider;
  basePath?: string;
  gatewayURL?: string;
  appID?: string;
}

export interface FiducyKeyHandlers {
  onConnected?: (key: UserKeySummaryView) => void;
  onRemoved?: (keyID: string) => void;
  onError?: (message: string) => void;
}

export interface FiducyKeyProps extends FiducyKeyOptions, FiducyKeyHandlers {
  className?: string;
}

export interface FiducyRemovedDetail {
  keyID: string;
}

export interface FiducyErrorDetail {
  message: string;
}

export interface KeyRouteLookup {
  state: 'signed-out' | 'connect' | 'connected';
  key: UserKeySummaryView | null;
}

export interface KeysChangedDetail {
  basePath: string;
  source: EventTarget | null;
}

export type FiducyKeyActionOptions = FiducyKeyOptions & FiducyKeyHandlers;
