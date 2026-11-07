export const DEFAULT_TABLE_NAME = 'fiducy_user_key';

export const USER_KEY_COLUMNS = [
  'user_id',
  'key_id',
  'provider',
  'handle',
  'record',
  'source',
  'created_at'
] as const;

export const TABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]{0,47}$/;
