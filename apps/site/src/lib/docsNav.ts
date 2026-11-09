import type { DocsIcon, DocsNavItem } from '@/types';

const page = (label: string, icon: DocsIcon, slug: string): DocsNavItem => ({ label, icon, slug });
const group = (label: string, icon: DocsIcon, children: DocsNavItem[]): DocsNavItem => ({
  label,
  icon,
  children
});

export const DOCS_NAV: DocsNavItem[] = [
  group('Start', 'start', [
    page('Introduction', 'intro', ''),
    page('Quickstart', 'quickstart', 'quickstart'),
    page('How it works', 'flow', 'how-it-works')
  ]),
  group('Core', 'core', [
    page('Server SDK', 'server', 'server'),
    group('Key widget', 'widget', [
      page('Overview', 'overview', 'widget'),
      page('React', 'react', 'widget/react'),
      page('Vue', 'vue', 'widget/vue'),
      page('Svelte', 'svelte', 'widget/svelte'),
      page('Solid', 'solid', 'widget/solid')
    ]),
    group('Storage', 'storage', [
      page('Overview', 'overview', 'storage'),
      page('SQL databases', 'sql', 'storage/sql'),
      page('Drizzle', 'drizzle', 'storage/drizzle'),
      page('Prisma', 'prisma', 'storage/prisma')
    ]),
    page('Migrate existing keys', 'migrate', 'migrate')
  ]),
  group('Integrations', 'integrations', [
    group('Frameworks', 'frameworks', [
      page('Overview', 'overview', 'frameworks'),
      page('Next.js', 'next', 'frameworks/next'),
      page('TanStack Start', 'tanstack', 'frameworks/tanstack-start'),
      page('React Router', 'router', 'frameworks/react-router'),
      page('SvelteKit', 'svelte', 'frameworks/sveltekit'),
      page('Nuxt', 'nuxt', 'frameworks/nuxt'),
      page('Express and Node', 'node', 'frameworks/express'),
      page('Farm.js', 'farm', 'frameworks/farm')
    ]),
    page('assistant-ui', 'assistant', 'assistant-ui')
  ]),
  group('Operate', 'operate', [
    page('Self-hosting', 'selfhost', 'self-hosting'),
    page('Security', 'security', 'security'),
    page('Gotchas', 'gotchas', 'gotchas')
  ]),
  group('Reference', 'reference', [
    page('Gateway API', 'api', 'gateway-api'),
    page('CLI', 'terminal', 'cli')
  ])
];
