export const APP_ID_PREFIX = 'app_';
export const APP_SECRET_PREFIX = 'fsk_';
export const APP_ID_BYTES = 12;
export const APP_SECRET_BYTES = 32;
export const APP_SECRET_PREVIEW_LENGTH = 4;
export const DEFAULT_MONTHLY_REQUEST_LIMIT = 10000;
export const MAXIMUM_MONTHLY_REQUEST_LIMIT = 10000000;
export const MAXIMUM_ALLOWED_ORIGINS = 20;
export const MAXIMUM_USAGE_BATCH_SIZE = 1000;
export const APP_NAMESPACE = 'apps';
export const OWNER_NAMESPACE = 'owners';
export const USAGE_NAMESPACE = 'usage';
export const CONTROL_STORAGE_MOUNT = 'control';
export const KEY_ENTRY_NAMESPACE = 'key-entries';
export const REVOKED_KEYS_NAMESPACE = 'revoked-keys';
export const DAILY_USAGE_NAMESPACE = 'usage-days';
export const GATEWAY_HEARTBEAT_KEY = 'gateway:heartbeat';
export const DEFAULT_GATEWAY_URL = 'http://localhost:8787';
export const GATEWAY_RECORD_GONE_STATUSES = [200, 404, 409];
export const GATEWAY_REACHABLE_WITHIN_MILLISECONDS = 2 * 60 * 1000;
export const DEFAULT_USAGE_SERIES_DAYS = 30;
export const MAXIMUM_USAGE_SERIES_DAYS = 90;
export const UNKNOWN_PROVIDER = 'unknown';
export const MAXIMUM_DOLLAR_LIMIT = 1000000;
export const MAXIMUM_CONCURRENT_REQUEST_LIMIT = 1000;
export const MAXIMUM_OUTPUT_TOKEN_LIMIT = 1000000;
export const DEFAULT_SPEND_LIMITS = {
  dailyDollarLimitPerKey: 5,
  dailyDollarLimitPerApp: 200,
  minuteDollarLimitPerApp: 20,
  concurrentRequestLimitPerKey: 4,
  maximumOutputTokens: 32768
};
export const SPEND_LIMIT_NAMES = [
  'dailyDollarLimitPerKey',
  'dailyDollarLimitPerApp',
  'minuteDollarLimitPerApp',
  'concurrentRequestLimitPerKey',
  'maximumOutputTokens'
] as const;
