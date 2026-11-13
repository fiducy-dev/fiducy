export const FIDUCY_KEY_ATTRIBUTES = [
  'provider',
  'base-path',
  'gateway-url',
  'app-id',
  'enclave-pcr0',
  'enclave-pcr16',
  'skip-attestation'
];

export const FIDUCY_KEY_TAG = 'fiducy-key';

export const FIDUCY_KEY_EVENTS = {
  connected: 'fiducy:connected',
  removed: 'fiducy:removed',
  error: 'fiducy:error'
} as const;
