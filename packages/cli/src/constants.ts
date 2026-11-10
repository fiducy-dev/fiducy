import packageJSON from '../package.json' with { type: 'json' };

export const CLI_NAME = 'fiducy';
export const CLI_VERSION = packageJSON.version;
export const STATE_DIRECTORY = '.fiducy';
export const DEV_STATE_FILE = 'dev.json';
export const DEV_RECORDS_FILE = 'dev-records.json';
export const DEFAULT_DEV_PORT = 3438;
export const DEV_HOST = '127.0.0.1';
export const DEV_APP_NAME = 'Your app';
export const DEV_MONTHLY_REQUEST_LIMIT = 1000000;
export const MOCK_PROVIDER_PATH_PREFIX = '/v1/';
export const PRIVATE_FILE_MODE = 0o600;
export const PRIVATE_DIRECTORY_MODE = 0o700;
export const DOCS_URL = 'https://fiducy.dev/docs';
export const PLACEMENT_ROUTE_PATTERN = /^\/[\w\-./[\]$:]*$/;
export const MAX_ROUTE_ATTEMPTS = 3;
export const DEV_VALUE_PATTERNS: Record<string, RegExp> = {
  FIDUCY_GATEWAY_URL: /^http:\/\/(localhost|127\.0\.0\.1):\d+$/,
  FIDUCY_APP_ID: /^app_dev_/,
  FIDUCY_APP_SECRET: /^fsk_dev_/
};
export const MODEL_CALL_DETAIL =
  "Keep the app's model, request variable and API style; only build the provider from createOpenAI(settings). Use .responses(...), not .chat(...): on Chat Completions, current OpenAI reasoning models (GPT-5.4 and later, all GPT-6) refuse tool calls unless reasoning is off, and some refuse tools entirely. Responses works for every OpenAI model.";
export const DEV_GATEWAY_NOTE =
  'keep it running in the background. With no Fiducy env vars yet it writes them to .env; otherwise it prints the lines to add. Restart the dev server after env changes';
export const CHAT_FALLBACK_WARNING =
  'No chat UI found (assistant-ui or AI SDK useChat), so the key box goes on the settings page.';
export const REACT_FRAMEWORKS = ['next', 'tanstack-start', 'react-router', 'farmjs'];

export const DEV_ORIGIN_HOSTS = ['localhost', '127.0.0.1'];
export const DEV_ORIGIN_PORTS = [
  3000, 3001, 3002, 3003, 4173, 4200, 4321, 5000, 5173, 5174, 5175, 8000, 8080, 8081, 8888, 9000
];

export const ENVIRONMENT_FILES = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.development.local'
];

export const PUBLIC_ENVIRONMENT_PREFIXES = [
  'NEXT_PUBLIC_',
  'VITE_',
  'PUBLIC_',
  'NUXT_PUBLIC_',
  'EXPO_PUBLIC_',
  'REACT_APP_'
];

export const CONFIG_FILE_NAMES = ['fiducy.ts', 'fiducy.js', 'fiducy.mts', 'fiducy.mjs'];
export const CONFIG_DIRECTORIES = [
  '',
  'lib',
  'utils',
  'server',
  'src',
  'src/lib',
  'src/utils',
  'src/server',
  'src/lib/server',
  'app/lib',
  'app/utils',
  'server/utils',
  'server/lib'
];

export const SOURCE_SEARCH_DIRECTORIES = ['src', 'lib', 'app', 'server', 'db', 'utils', 'prisma'];
export const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs', '.mts', '.jsx'];
export const SOURCE_SEARCH_DEPTH = 4;
export const SOURCE_SEARCH_IGNORED = ['node_modules', '.next', '.nuxt', '.output', '.svelte-kit'];
export const SQLITE_FALLBACK_PATH = '.fiducy/keys.sqlite';

export const LOCKFILES: [string, string][] = [
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['package-lock.json', 'npm']
];
export const COMMAND_PATTERN =
  /(?:npx|bun x|pnpm dlx|yarn dlx) fiducy(?:@[\w.-]+)? \w+(?: --[\w-]+(?: <[^>]+>)?)*|prisma migrate dev|drizzle-kit (?:migrate|generate|push)|https:\/\/\S+[^\s.,]/g;
export const DRIZZLE_CONFIG_FILES = [
  'drizzle.config.ts',
  'drizzle.config.js',
  'drizzle.config.mjs'
];
export const DRIZZLE_DEFAULT_OUT = 'drizzle';
