export const DATA_KEY_LENGTH = 32;
export const IV_LENGTH = 12;
export const KEY_ID_LENGTH = 16;
export const MASTER_KEY_LENGTH = 32;
export const HANDLE_PREFIX = 'kh_';
export const HANDLE_PATTERN = /^kh_([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/;
export const WRAPPER_SALT = 'fiducy-local-wrapper-v1';
export const SEALED_RECORD_FIELDS = [
  'keyID',
  'appID',
  'ciphertext',
  'iv',
  'wrappedShareB'
] as const;
export const GATEWAY_ERROR_HEADER = 'x-fiducy-error';
export const KEY_UNAVAILABLE_ERROR = 'key-unavailable';
export const GATEWAY_FAILURE_ERROR = 'gateway-failure';
