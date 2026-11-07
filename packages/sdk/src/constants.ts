export const KEY_HANDLE_HEADER = 'x-key-handle';
export const KEY_RECORD_HEADER = 'x-key-record';
export const DEFAULT_BASE_PATH = '/api/fiducy';
export const MAX_REQUEST_BODY_BYTES = 16384;
export const KEY_ID_PATH_PATTERN = /^\/keys\/([A-Za-z0-9_-]{22})$/;

export const PROVIDER_BASE_PATHS = {
  openai: '/openai/v1',
  anthropic: '/anthropic/v1',
  gemini: '/gemini/v1beta',
  openrouter: '/openrouter/api/v1'
} as const;

export const PROVIDER_LABELS = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  openrouter: 'OpenRouter'
} as const;

export const PUBLIC_ENVIRONMENT_PREFIXES = [
  'NEXT_PUBLIC_',
  'VITE_',
  'PUBLIC_',
  'NUXT_PUBLIC_',
  'EXPO_PUBLIC_',
  'REACT_APP_'
];

export const MAX_IMPORT_BATCH_SIZE = 100;
