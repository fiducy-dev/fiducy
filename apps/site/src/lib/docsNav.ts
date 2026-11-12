import type { DocsNavItem } from '@/types';

const page = (label: string, slug: string): DocsNavItem => ({ label, slug });
const group = (label: string, children: DocsNavItem[]): DocsNavItem => ({ label, children });

export const DOCS_NAV: DocsNavItem[] = [
  group('Start', [
    page('Introduction', ''),
    page('Quickstart', 'quickstart'),
    page('How it works', 'how-it-works')
  ]),
  group('Connect your app', [
    page('Server SDK', 'server'),
    group('Frameworks', [
      page('Overview', 'frameworks'),
      page('Next.js', 'frameworks/next'),
      page('TanStack Start', 'frameworks/tanstack-start'),
      page('React Router', 'frameworks/react-router'),
      page('SvelteKit', 'frameworks/sveltekit'),
      page('Nuxt', 'frameworks/nuxt'),
      page('Express and Node', 'frameworks/express'),
      page('Farm.js', 'frameworks/farm')
    ]),
    page('assistant-ui', 'assistant-ui'),
    page('CLI', 'cli')
  ]),
  group('Key widget', [
    page('Overview', 'widget'),
    page('React', 'widget/react'),
    page('Vue', 'widget/vue'),
    page('Svelte', 'widget/svelte'),
    page('Solid', 'widget/solid')
  ]),
  group('Storage', [
    page('Overview', 'storage'),
    page('SQL databases', 'storage/sql'),
    page('Drizzle', 'storage/drizzle'),
    page('Prisma', 'storage/prisma'),
    page('Migrate existing keys', 'migrate')
  ]),
  group('Gateway and self-hosting', [
    page('Self-hosting', 'self-hosting'),
    page('Gateway API', 'gateway-api')
  ]),
  group('Security', [page('Security model', 'security'), page('Gotchas', 'gotchas')])
];
