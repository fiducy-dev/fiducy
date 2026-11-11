import { describe, expect, test } from 'bun:test';
import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { DOCS_NAV } from '@/lib/docsNav';

import type { DocsNavItem } from '@/types';

const DOCS_DIR = join(import.meta.dir, '..', 'docs');

function pageSlugs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pageSlugs(path);
    if (entry.name !== 'page.mdx') return [];
    return [relative(DOCS_DIR, dir).split(sep).join('/')];
  });
}

function flatten(items: DocsNavItem[]): DocsNavItem[] {
  return items.flatMap((item) => [item, ...flatten(item.children ?? [])]);
}

describe('docs sidebar', () => {
  const items = flatten(DOCS_NAV);
  const linked = items.flatMap((item) => (item.slug === undefined ? [] : [item.slug]));

  test('links every docs page exactly once', () => {
    expect([...linked].sort()).toEqual(pageSlugs(DOCS_DIR).sort());
  });
});
