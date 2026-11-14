import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { PackageManifest } from '@/types';

const SITE_DIR = join(import.meta.dir, '..');
const ROOT_DIR = join(SITE_DIR, '..', '..');
const FARMJS_PACKAGE = '@farming-labs/farmjs';

function readManifest(path: string): PackageManifest {
  return JSON.parse(readFileSync(path, 'utf8'));
}

describe('docs head patch', () => {
  test('targets the installed farmjs version', () => {
    const site = readManifest(join(SITE_DIR, 'package.json'));
    const root = readManifest(join(ROOT_DIR, 'package.json'));
    const version = site.dependencies?.[FARMJS_PACKAGE];
    expect(Object.keys(root.patchedDependencies ?? {})).toContain(`${FARMJS_PACKAGE}@${version}`);
  });

  test('renders the canonical link', () => {
    const server = readFileSync(
      join(ROOT_DIR, 'node_modules', FARMJS_PACKAGE, 'dist', 'server.js'),
      'utf8'
    );
    expect(server).toContain('rel="canonical"');
  });
});
