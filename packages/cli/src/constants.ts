export const CLI_NAME = 'fiducy';
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
