import { afterAll, describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createProject, packageWith, removeProjects, run } from './fixtures.ts';

afterAll(removeProjects);

const SQLITE_MODULE = `import { mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import { createFiducy } from '@fiducy/sdk/server';
import { kyselyStorage } from '@fiducy/sdk/storage/kysely';

import { readUser } from '@/lib/session';

mkdirSync('.fiducy', { recursive: true });

export const fiducy = createFiducy({
  storage: kyselyStorage(new DatabaseSync('.fiducy/keys.sqlite')),
  getUserID: readUser
});
`;

const DRIZZLE_MODULE = `import { createFiducy } from '@fiducy/sdk/server';
import { drizzleStorage } from '@fiducy/sdk/storage/drizzle';

export const fiducy = createFiducy({
  storage: drizzleStorage({}, { provider: 'pg' }),
  getUserID: async () => null
});
`;

const PRISMA_MODULE = `import { createFiducy } from '@fiducy/sdk/server';
import { prismaStorage } from '@fiducy/sdk/storage/prisma';

export const fiducy = createFiducy({
  storage: prismaStorage({}, { provider: 'postgresql' }),
  getUserID: async () => null
});
`;

function sqliteProject() {
  return createProject({
    'package.json': packageWith({}),
    'tsconfig.json': JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
    'src/lib/session.ts': 'export const readUser = async () => null;\n',
    'src/lib/fiducy.ts': SQLITE_MODULE
  });
}

describe('fiducy generate and migrate', () => {
  it('generates SQL for missing tables, migrates once, and resolves path aliases', async () => {
    const root = sqliteProject();
    const generate = await run(root, ['generate']);
    expect(generate.code).toBe(0);
    expect(generate.text).toContain('Loaded src/lib/fiducy.ts');
    const sql = readFileSync(join(root, 'fiducy_migrations/create_fiducy_user_key.sql'), 'utf8');
    expect(sql).toContain('create table');
    expect((await run(root, ['generate'])).text).toContain('already up to date');

    expect((await run(root, ['migrate'])).text).toContain('Pass --yes');
    const migrate = await run(root, ['migrate', '--yes']);
    expect(migrate.code).toBe(0);
    expect(migrate.text).toContain('Created fiducy_user_key');
    expect((await run(root, ['migrate', '--yes'])).text).toContain('already exists');
    expect((await run(root, ['generate'])).text).toContain('Nothing to generate');
  });

  it('never overwrites a schema file that differs', async () => {
    const root = createProject({
      'package.json': packageWith({}),
      'fiducy.ts': DRIZZLE_MODULE,
      'fiducy-schema.ts': 'export const mine = true;\n'
    });
    const result = await run(root, ['generate']);
    expect(result.code).toBe(1);
    expect(result.text).toContain('fiducy never overwrites files');
    expect(readFileSync(join(root, 'fiducy-schema.ts'), 'utf8')).toBe(
      'export const mine = true;\n'
    );
  });

  it('puts the Drizzle table next to the schema named in drizzle.config', async () => {
    const root = createProject({
      'package.json': packageWith({}),
      'lib/fiducy.ts': DRIZZLE_MODULE,
      'drizzle.config.ts': "export default { dialect: 'postgresql', schema: './src/db/schema.ts' };"
    });
    const result = await run(root, ['generate']);
    expect(result.code).toBe(0);
    expect(readFileSync(join(root, 'src/db/fiducy-schema.ts'), 'utf8')).toContain('pgTable');
    expect(result.text).toContain("export * from './fiducy-schema'");
    expect((await run(root, ['migrate'])).text).toContain('drizzle-kit migrate');
  });

  it('prints the Prisma model when the schema is a single file it must not edit', async () => {
    const root = createProject({
      'package.json': packageWith({}),
      'server/utils/fiducy.ts': PRISMA_MODULE,
      'prisma/schema.prisma': 'datasource db {\n  provider = "postgresql"\n}\n'
    });
    const result = await run(root, ['generate']);
    expect(result.code).toBe(0);
    expect(result.text).toContain('model FiducyUserKey');
    expect(result.text).toContain('Paste this model into it');
    expect(readFileSync(join(root, 'prisma/schema.prisma'), 'utf8')).not.toContain('Fiducy');
    expect(existsSync(join(root, 'prisma/schema'))).toBe(false);
  });

  it('explains when the storage has no table, the module is missing, or nothing is exported', async () => {
    const keyValue = createProject({
      'package.json': packageWith({}),
      'lib/fiducy.ts':
        'export const fiducy = { handler: () => null, storage: { saveKey: () => null } };\n'
    });
    expect((await run(keyValue, ['generate'])).text).toContain('has no table to generate');

    const empty = createProject({ 'package.json': packageWith({}) });
    const missing = await run(empty, ['migrate']);
    expect(missing.code).toBe(1);
    expect(missing.text).toContain('Pass its path with --config');

    const noExport = createProject({
      'package.json': packageWith({}),
      'fiducy.ts': 'export const x = 1;\n'
    });
    expect((await run(noExport, ['generate'])).text).toContain('does not export a createFiducy()');
    expect((await run(noExport, ['generate', '--config', 'nope.ts'])).text).toContain(
      'No file at nope.ts'
    );
  });
});
