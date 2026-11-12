import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

import { SAMPLE_API_KEY } from '@fiducy/testing';
import { ask, waitForKeyState } from './flow';
import { buildPackages, chooseExamplePort } from './stack';

import type { Browser } from 'playwright';

const ROOT = resolve(import.meta.dir, '../..');
const CLI_PATH = join(ROOT, 'packages/cli/dist/index.js');
const APP_DIRECTORY = join(ROOT, 'examples/.cli-init-next');
const NEXT_EXAMPLE = join(ROOT, 'examples/next');

const AUTH_MODULE = `import { mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import { betterAuth } from 'better-auth';

mkdirSync('.fiducy', { recursive: true });

export const auth = betterAuth({
  database: new DatabaseSync('.fiducy/auth.sqlite'),
  emailAndPassword: { enabled: true }
});
`;

const AUTH_ROUTE = `import { toNextJsHandler } from 'better-auth/next-js';

import { auth } from '@/lib/auth';

export const { GET, POST } = toNextJsHandler(auth);
`;

const AUTH_MIGRATION = `import { getMigrations } from 'better-auth/db/migration';

import { auth } from './lib/auth.ts';

const { runMigrations } = await getMigrations(auth.options);
await runMigrations();
`;

let browser: Browser;

function runCli(argv: string[]) {
  const result = Bun.spawnSync(['node', CLI_PATH, ...argv], { cwd: APP_DIRECTORY });
  return { code: result.exitCode, output: `${result.stdout}${result.stderr}` };
}

function createExistingApp(appPort: number) {
  rmSync(APP_DIRECTORY, { recursive: true, force: true });
  mkdirSync(APP_DIRECTORY);
  for (const path of [
    'app/layout.tsx',
    'app/page.tsx',
    'app/api/ask',
    'components',
    'lib/example-kit'
  ]) {
    cpSync(join(NEXT_EXAMPLE, path), join(APP_DIRECTORY, path), { recursive: true });
  }
  for (const file of ['next.config.ts', 'tsconfig.json']) {
    cpSync(join(NEXT_EXAMPLE, file), join(APP_DIRECTORY, file));
  }
  const packageJSON = JSON.parse(readFileSync(join(NEXT_EXAMPLE, 'package.json'), 'utf8'));
  packageJSON.name = 'existing-next-app';
  packageJSON.dependencies['better-auth'] = '1.7.7';
  writeFileSync(join(APP_DIRECTORY, 'package.json'), JSON.stringify(packageJSON, null, 2));
  writeFileSync(join(APP_DIRECTORY, '.gitignore'), '.env*\n');
  writeFileSync(join(APP_DIRECTORY, 'lib/auth.ts'), AUTH_MODULE);
  mkdirSync(join(APP_DIRECTORY, 'app/api/auth/[...all]'), { recursive: true });
  writeFileSync(join(APP_DIRECTORY, 'app/api/auth/[...all]/route.ts'), AUTH_ROUTE);
  writeFileSync(join(APP_DIRECTORY, 'migrateAuth.mts'), AUTH_MIGRATION);
  writeFileSync(
    join(APP_DIRECTORY, '.env.local'),
    `BETTER_AUTH_SECRET=${crypto.randomUUID()}${crypto.randomUUID()}\nBETTER_AUTH_URL=http://localhost:${appPort}\n`
  );
}

async function waitFor(url: string, process: Bun.Subprocess) {
  const deadline = Date.now() + 240000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error(`${url} exited with ${process.exitCode}`);
    const response = await fetch(url).catch(() => null);
    if (response?.ok) return;
    await Bun.sleep(500);
  }
  throw new Error(`${url} did not start`);
}

beforeAll(async () => {
  buildPackages();
  const build = Bun.spawnSync(['bun', 'run', 'build'], { cwd: join(ROOT, 'packages/cli') });
  if (build.exitCode !== 0) throw new Error(`CLI build failed: ${build.stderr.toString()}`);
  browser = await chromium.launch();
}, 120000);

afterAll(async () => {
  await browser.close();
  rmSync(APP_DIRECTORY, { recursive: true, force: true });
});

describe('npx fiducy init in an existing Next.js + Better Auth app', () => {
  it('adds Fiducy with new files only, migrates, and works in the browser', async () => {
    const appPort = chooseExamplePort();
    const appURL = `http://localhost:${appPort}`;
    createExistingApp(appPort);
    const authBefore = readFileSync(join(APP_DIRECTORY, 'lib/auth.ts'), 'utf8');

    const init = runCli(['init', '--skip-install']);
    expect(init.code).toBe(0);
    expect(init.output).toContain('Found Next.js + bun · Better Auth');
    const serverModule = readFileSync(join(APP_DIRECTORY, 'lib/fiducy.ts'), 'utf8');
    expect(serverModule).toContain("import { auth } from '@/lib/auth';");
    expect(serverModule).toContain('auth.api.getSession({ headers: request.headers })');
    expect(serverModule).toContain("kyselyStorage(new DatabaseSync('.fiducy/keys.sqlite'))");
    expect(existsSync(join(APP_DIRECTORY, 'app/api/fiducy/[...path]/route.ts'))).toBe(true);
    expect(readFileSync(join(APP_DIRECTORY, 'lib/auth.ts'), 'utf8')).toBe(authBefore);

    const rerun = runCli(['init', '--skip-install']);
    expect(rerun.output).toContain('Kept lib/fiducy.ts (already there)');

    const generate = runCli(['generate']);
    expect(generate.code).toBe(0);
    expect(generate.output).toContain('fiducy_migrations/create_fiducy_user_key.sql');
    const migrate = runCli(['migrate']);
    expect(migrate.output).toContain('Pass --yes');
    expect(runCli(['migrate', '--yes']).output).toContain('Created fiducy_user_key');
    expect(runCli(['migrate', '--yes']).output).toContain('already exists');

    const authMigration = Bun.spawnSync(['node', 'migrateAuth.mts'], { cwd: APP_DIRECTORY });
    expect(authMigration.exitCode).toBe(0);

    const gatewayPort = 8950 + Math.floor(Math.random() * 40);
    const gateway = Bun.spawn(
      ['node', CLI_PATH, 'dev', '--mock', '--port', String(gatewayPort), '--origin', appURL],
      { cwd: APP_DIRECTORY, stdout: 'ignore', stderr: 'ignore' }
    );
    await waitFor(`http://localhost:${gatewayPort}/health`, gateway);
    const app = Bun.spawn(['bunx', 'next', 'dev', '--port', String(appPort)], {
      cwd: APP_DIRECTORY,
      env: { PATH: Bun.env.PATH ?? '', HOME: Bun.env.HOME ?? '' },
      stdout: Bun.env.EXAMPLES_VERBOSE ? 'inherit' : 'ignore',
      stderr: Bun.env.EXAMPLES_VERBOSE ? 'inherit' : 'ignore'
    });
    const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
    const page = await context.newPage();
    try {
      await waitFor(appURL, app);
      await page.goto(appURL);
      await waitForKeyState(page, 'signed-out');
      await ask(page, 'Sign in to use your OpenAI key');

      const signUp = await page.request.post(`${appURL}/api/auth/sign-up/email`, {
        data: { email: 'init-test@example.com', password: 'a-long-password-123', name: 'Init' },
        headers: { origin: appURL }
      });
      expect(signUp.status()).toBe(200);
      await page.reload();
      await waitForKeyState(page, 'connect');
      await ask(page, 'Connect your OpenAI key to keep going');

      const widget = page.frameLocator('fiducy-key iframe');
      await widget.getByLabel('Your API key').fill(SAMPLE_API_KEY);
      await widget.getByRole('button', { name: 'Save key' }).click();
      await waitForKeyState(page, 'connected');
      await ask(page, 'Hello');
      await page.screenshot({
        path: `${Bun.env.EXAMPLES_SCREENSHOTS ?? '/tmp'}/cli-init-next.png`
      });
    } finally {
      await context.close();
      app.kill();
      gateway.kill();
    }
  }, 600000);
});
