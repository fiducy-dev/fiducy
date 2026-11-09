import { afterAll, describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CLI_VERSION } from '../src/constants.ts';
import { createProject, packageWith, removeProjects, run } from './fixtures.ts';

afterAll(removeProjects);

const NEXT_TSCONFIG = JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } });

function read(root: string, path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('fiducy init', () => {
  it('adds a server module and catch-all route to a Next.js app with Better Auth', async () => {
    const root = createProject({
      'package.json': packageWith({ next: '16.4.4', 'better-auth': '1.7.7' }),
      'tsconfig.json': `// comments are allowed\n${NEXT_TSCONFIG}`,
      'src/app/page.tsx': 'export default function Page() { return null; }',
      'src/lib/auth.ts': 'export const auth = betterAuth({ database: pool });\n'
    });
    const result = await run(root, ['init', '--skip-install']);
    expect(result.code).toBe(0);
    const serverModule = read(root, 'src/lib/fiducy.ts');
    expect(serverModule).toContain("import { auth } from '@/lib/auth';");
    expect(serverModule).toContain('auth.api.getSession({ headers: request.headers })');
    const route = read(root, 'src/app/api/fiducy/[...path]/route.ts');
    expect(route).toContain("import { fiducy } from '@/lib/fiducy';");
    expect(route).toContain('export const { GET, POST, DELETE } = toNextJsHandler(fiducy);');
    expect(result.text).toContain(`Install with: bun add @fiducy/sdk@${CLI_VERSION} kysely`);
  });

  it('never overwrites an existing file', async () => {
    const root = createProject({
      'package.json': packageWith({ next: '16.4.4' }),
      'lib/fiducy.ts': 'export const mine = true;\n'
    });
    const result = await run(root, ['init', '--skip-install']);
    expect(read(root, 'lib/fiducy.ts')).toBe('export const mine = true;\n');
    expect(result.text).toContain('Kept lib/fiducy.ts (already there)');
    expect(existsSync(join(root, 'app/api/fiducy/[...path]/route.ts'))).toBe(true);
  });

  it('writes nothing on a dry run', async () => {
    const root = createProject({ 'package.json': packageWith({ nuxt: '4.2.0' }) });
    const result = await run(root, ['init', '--dry-run']);
    expect(result.text).toContain('Would create server/utils/fiducy.ts');
    expect(existsSync(join(root, 'server'))).toBe(false);
  });

  it('uses a Prisma client export with the provider from schema.prisma', async () => {
    const root = createProject({
      'package.json': packageWith({
        '@tanstack/react-start': '1.140.0',
        '@prisma/client': '7.10.1'
      }),
      'prisma/schema.prisma': 'datasource db {\n  provider = "postgresql"\n}\n',
      'src/db.ts': 'export const prisma = new PrismaClient({ adapter });\n'
    });
    await run(root, ['init', '--skip-install']);
    const serverModule = read(root, 'src/lib/fiducy.ts');
    expect(serverModule).toContain("import { prisma } from '../db';");
    expect(serverModule).toContain("storage: prismaStorage(prisma, { provider: 'postgresql' })");
    expect(read(root, 'src/routes/api/fiducy/$.ts')).toContain('toTanStackHandlers(fiducy)');
  });

  it('uses a Drizzle db export with the dialect from drizzle.config', async () => {
    const root = createProject({
      'package.json': packageWith({ '@sveltejs/kit': '3.1.1', 'drizzle-orm': '0.45.4' }),
      'drizzle.config.ts':
        "export default defineConfig({ dialect: 'sqlite', schema: './src/lib/server/db/schema.ts' });",
      'src/lib/server/db/index.ts': 'export const db = drizzle(client, { schema });\n'
    });
    const result = await run(root, ['init', '--skip-install']);
    const serverModule = read(root, 'src/lib/server/fiducy.ts');
    expect(serverModule).toContain("import * as env from '$app/env/private';");
    expect(serverModule).toContain("import { db } from './db';");
    expect(serverModule).toContain("storage: drizzleStorage(db, { provider: 'sqlite' })");
    expect(read(root, 'src/hooks.server.ts')).toContain(
      'svelteKitHandler({ event, resolve, fiducy })'
    );
    expect(read(root, 'src/env.ts')).toContain('FIDUCY_APP_SECRET: {}');
    expect(result.text).not.toContain('kysely');
  });

  it('prints the SvelteKit 2 env import and a hooks snippet when hooks exist', async () => {
    const root = createProject({
      'package.json': packageWith({ '@sveltejs/kit': '2.20.0' }),
      'src/hooks.server.ts': 'export const handle = ({ event, resolve }) => resolve(event);\n'
    });
    const result = await run(root, ['init', '--skip-install', '--show-code']);
    expect(read(root, 'src/lib/server/fiducy.ts')).toContain(
      "import { env } from '$env/dynamic/private';"
    );
    expect(read(root, 'src/hooks.server.ts')).not.toContain('fiducy');
    expect(result.text).toContain("import { sequence } from '@sveltejs/kit/hooks';");
    expect(existsSync(join(root, 'src/env.ts'))).toBe(false);
  });

  it('writes a clear placeholder when no auth is found', async () => {
    const root = createProject({
      'package.json': packageWith({ express: '5.1.0' }),
      'src/server.ts': ''
    });
    const result = await run(root, ['init', '--skip-install', '--show-code']);
    const serverModule = read(root, 'src/fiducy.ts');
    expect(serverModule).toContain('async function readSignedInUserID');
    expect(serverModule).toContain('getUserID: readSignedInUserID');
    expect(result.text).toContain("app.all('/api/fiducy/{*path}', toNodeHandler(fiducy));");
  });

  it('uses Clerk and Auth.js session helpers', async () => {
    const clerk = createProject({
      'package.json': packageWith({ next: '16.4.4', '@clerk/nextjs': '6.0.0' })
    });
    await run(clerk, ['init', '--skip-install']);
    expect(read(clerk, 'lib/fiducy.ts')).toContain('getUserID: async () => (await auth()).userId');

    const authjs = createProject({
      'package.json': packageWith({ next: '16.4.4', 'next-auth': '5.0.0' }),
      'auth.ts': 'export const { handlers, auth, signIn } = NextAuth({ providers: [] });\n'
    });
    const result = await run(authjs, ['init', '--skip-install']);
    expect(read(authjs, 'lib/fiducy.ts')).toContain("import { auth } from '../auth';");
    expect(result.text).toContain('token.sub');
  });

  it('registers React Router routes by snippet unless the app uses flat routes', async () => {
    const config = createProject({
      'package.json': packageWith({ '@react-router/dev': '7.9.0' }),
      'app/routes.ts': "export default [index('routes/home.tsx')];\n"
    });
    const configResult = await run(config, ['init', '--skip-install', '--show-code']);
    expect(existsSync(join(config, 'app/routes/fiducy.ts'))).toBe(true);
    expect(configResult.text).toContain("route('api/fiducy/*', 'routes/fiducy.ts'),");

    const flat = createProject({
      'package.json': packageWith({ '@react-router/dev': '7.9.0' }),
      'app/routes.ts': 'export default flatRoutes();\n'
    });
    await run(flat, ['init', '--skip-install']);
    expect(existsSync(join(flat, 'app/routes/api.fiducy.$.ts'))).toBe(true);
  });

  it('prints the Farm integration and installs @fiducy/farm', async () => {
    const root = createProject({ 'package.json': packageWith({ '@farm.js/core': '0.1.49' }) });
    const result = await run(root, ['init', '--skip-install', '--show-code']);
    expect(read(root, 'src/lib/fiducy.ts')).toContain('export const fiducyServer = createFiducy');
    expect(result.text).toContain('byok: fiducy({ instance: fiducyServer })');
    expect(result.text).toContain('@fiducy/farm');
  });

  it('accepts overrides and rejects unknown values', async () => {
    const root = createProject({ 'package.json': packageWith({}) });
    const result = await run(root, ['init', '--dry-run', '--framework', 'hono']);
    expect(result.text).toContain('fiducy.handler(context.req.raw)');
    const bad = await run(root, ['init', '--framework', 'rails']);
    expect(bad.code).toBe(1);
    expect(bad.text).toContain('--framework rails is not supported (yet)');
  });

  it('lists the steps left without code, then the next commands', async () => {
    const root = createProject({
      'package.json': packageWith({ express: '5.1.0' }),
      'src/server.ts': ''
    });
    const result = await run(root, ['init', '--skip-install']);
    expect(result.text).toContain('4 things left');
    expect(result.text).toContain('1.  Fill in readSignedInUserID');
    expect(result.text).toContain('in src/fiducy.ts');
    expect(result.text).toContain(`bun x fiducy@${CLI_VERSION} init --show-code`);
    expect(result.text).toContain('https://fiducy.dev/docs/frameworks/express');
    expect(result.text).toContain(`bun x fiducy@${CLI_VERSION} migrate  creates the table`);
    expect(result.text).toContain(`Run bun x fiducy@${CLI_VERSION} prompt`);
    expect(result.text).not.toContain('toNodeHandler(fiducy)');
  });
});

describe('fiducy prompt', () => {
  it('prints the steps with code and the markdown guide, and writes nothing', async () => {
    const root = createProject({ 'package.json': packageWith({ next: '16.4.4' }) });
    const result = await run(root, ['prompt']);
    expect(result.code).toBe(0);
    expect(result.text).toContain(`Run \`bun x fiducy@${CLI_VERSION} init\` first`);
    expect(result.text).toContain("import { FiducyKey } from '@fiducy/sdk/react';");
    expect(result.text).toContain('Guide: https://fiducy.dev/docs/frameworks/next.md');
    expect(existsSync(join(root, 'lib'))).toBe(false);
    await run(root, ['init', '--skip-install']);
    const after = await run(root, ['prompt']);
    expect(after.text).toContain(
      'already created: lib/fiducy.ts, app/api/fiducy/[...path]/route.ts'
    );
  });
});
