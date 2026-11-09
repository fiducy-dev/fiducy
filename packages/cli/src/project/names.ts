import { DOCS_URL } from '../constants.ts';

import type { AuthName, FrameworkName, StorageName } from '../types.ts';

const FRAMEWORK_NAMES: Record<FrameworkName, string> = {
  next: 'Next.js',
  'tanstack-start': 'TanStack Start',
  'react-router': 'React Router',
  sveltekit: 'SvelteKit',
  nuxt: 'Nuxt',
  farmjs: 'Farm.js',
  express: 'Express',
  hono: 'Hono',
  node: 'Node'
};

const DOCS_PAGES: Record<FrameworkName, string> = {
  next: 'frameworks/next',
  'tanstack-start': 'frameworks/tanstack-start',
  'react-router': 'frameworks/react-router',
  sveltekit: 'frameworks/sveltekit',
  nuxt: 'frameworks/nuxt',
  farmjs: 'frameworks/farm',
  express: 'frameworks/express',
  hono: 'frameworks',
  node: 'frameworks/express'
};

const AUTH_NAMES: Record<AuthName, string> = {
  'better-auth': 'Better Auth',
  authjs: 'Auth.js',
  clerk: 'Clerk',
  none: 'no auth'
};

const STORAGE_NAMES: Record<StorageName, string> = {
  prisma: 'Prisma',
  drizzle: 'Drizzle',
  kysely: 'Kysely',
  sqlite: 'SQLite'
};

export function nameFramework(framework: FrameworkName): string {
  return FRAMEWORK_NAMES[framework];
}

export function nameAuth(auth: AuthName): string {
  return AUTH_NAMES[auth];
}

export function nameStorage(storage: StorageName): string {
  return STORAGE_NAMES[storage];
}

export function findGuideURL(framework: FrameworkName): string {
  return `${DOCS_URL}/${DOCS_PAGES[framework]}`;
}
