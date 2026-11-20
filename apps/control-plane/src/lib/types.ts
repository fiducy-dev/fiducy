import type { Group, OrthographicCamera, PerspectiveCamera, Scene } from 'three';
import type { Vector2, WebGLRenderTarget } from 'three';

export type RecordStorage = 'fiducy' | 'app';

export type KeySource = 'widget' | 'import';

export interface AppSettings {
  name: string;
  monthlyRequestLimitPerKey: number;
  allowedOrigins: string[];
  recordStorage?: RecordStorage;
  allowKeyImport?: boolean;
  spendLimits?: SpendLimits;
}

export interface SpendLimits {
  dailyDollarLimitPerKey?: number;
  dailyDollarLimitPerApp?: number;
  minuteDollarLimitPerApp?: number;
  concurrentRequestLimitPerKey?: number;
  maximumOutputTokens?: number;
}

export type SpendLimitName = keyof SpendLimits;

export interface StoredApp extends AppSettings {
  appID: string;
  ownerID: string;
  appSecretHash: string;
  appSecretPreview: string;
  createdAt: string;
  isFrozen?: boolean;
  frozenAt?: string | null;
}

export type AppView = Omit<StoredApp, 'appSecretHash' | 'ownerID'>;

export interface GatewayApp
  extends Omit<StoredApp, 'ownerID' | 'appSecretPreview' | 'createdAt' | 'frozenAt'> {
  revokedKeyIDs: string[];
}

export interface CreatedApp {
  app: AppView;
  appSecret: string;
}

export interface UsageEvent {
  appID: string;
  keyID: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  recordedAt: string;
}

export interface UsageSummary {
  month: string;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  requestsByKey: Record<string, number>;
}

export type StoredValue =
  | StoredApp
  | UsageSummary
  | StoredKeyEntry
  | DailyUsage
  | GatewayHeartbeat
  | StoredTwoFactor
  | string[]
  | true;

export interface KeyValueStore {
  getItem: (key: string) => Promise<unknown>;
  setItem: (key: string, value: StoredValue) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  getKeys: (base?: string) => Promise<string[]>;
}

export interface ControlStore {
  saveApp: (app: StoredApp) => Promise<void>;
  findApp: (appID: string) => Promise<StoredApp | null>;
  deleteApp: (app: StoredApp) => Promise<void>;
  listAppsByOwner: (ownerID: string) => Promise<StoredApp[]>;
  listAllApps: () => Promise<StoredApp[]>;
  readUsage: (appID: string, month: string) => Promise<UsageSummary>;
  saveUsage: (appID: string, summary: UsageSummary) => Promise<void>;
  saveKeyEntry: (entry: StoredKeyEntry) => Promise<void>;
  findKeyEntry: (appID: string, keyID: string) => Promise<StoredKeyEntry | null>;
  listKeyEntries: (appID: string) => Promise<StoredKeyEntry[]>;
  listRevokedKeyIDs: (appID: string) => Promise<string[]>;
  addRevokedKeyID: (appID: string, keyID: string) => Promise<void>;
  readDailyUsage: (appID: string, date: string) => Promise<DailyUsage>;
  saveDailyUsage: (appID: string, usage: DailyUsage) => Promise<void>;
  readGatewayHeartbeat: () => Promise<GatewayHeartbeat | null>;
  saveGatewayHeartbeat: (heartbeat: GatewayHeartbeat) => Promise<void>;
  findTwoFactor: (ownerID: string) => Promise<StoredTwoFactor | null>;
  saveTwoFactor: (record: StoredTwoFactor) => Promise<void>;
}

export interface ControlFailure {
  status: number;
  message: string;
}

export type Result<Value, Failure> = { ok: true; value: Value } | { ok: false; error: Failure };

export type ControlResult<Value> = Result<Value, ControlFailure>;

export type KeyStatus = 'active' | 'revoked';

export interface AppKeyView {
  keyID: string;
  provider: string;
  createdAt: string;
  lastUsedAt: string | null;
  requestCount: number;
  status: KeyStatus;
  source?: KeySource;
}

export interface UsageDay {
  date: string;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
}

export interface ProviderUsage {
  provider: string;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
}

export interface UsageSeries {
  days: UsageDay[];
  byProvider: ProviderUsage[];
}

export interface GatewayStatus {
  reachable: boolean;
  lastSeenAt: string | null;
  pcr0: string | null;
  attestedAt: string | null;
  region: string | null;
}

export interface StoredKeyEntry {
  keyID: string;
  appID: string;
  provider: string;
  createdAt: string;
  lastUsedAt: string | null;
  status: KeyStatus;
  source?: KeySource;
}

export interface TokenTotals {
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
}

export interface DailyUsage extends TokenTotals {
  date: string;
  byProvider: Record<string, TokenTotals>;
}

export interface GatewayHeartbeat {
  lastSeenAt: string;
}

export interface StoredTwoFactor {
  ownerID: string;
  secret: string;
  confirmedAt: string | null;
  lastUsedStep: number | null;
  failedAttempts: number;
  lockedUntil: string | null;
}

export interface TwoFactorEnrollment {
  secret: string;
  otpauthURL: string;
}

export interface TwoFactorStatus {
  isEnabled: boolean;
}

export interface GatewayConnection {
  gatewayURL: string;
  gatewayToken: string | null;
}

export interface GatewayClient {
  deleteRecord: (appID: string, keyID: string) => Promise<ControlResult<null>>;
  refreshApps: () => Promise<boolean>;
}

export interface RevokedKeys {
  revokedCount: number;
  failedCount: number;
}

export type KeyEventType = 'saved' | 'revoked';

export interface KeyEvent {
  type: KeyEventType;
  appID: string;
  keyID: string;
  source?: KeySource;
}

export interface DitherKeyParts {
  scene: Scene;
  camera: PerspectiveCamera;
  turntable: Group;
  handleHalf: Group;
  storedHalf: Group;
  target: WebGLRenderTarget;
  cells: Vector2;
  quad: Scene;
  quadCamera: OrthographicCamera;
}
