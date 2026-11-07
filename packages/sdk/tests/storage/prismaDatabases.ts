import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaPg } from '@prisma/adapter-pg';

import { generateSchema } from '../../src/storage';
import { MYSQL_URL, POSTGRES_URL, createUniqueTableName } from './databases';

import type { PrismaProvider } from '../../src/storage/prisma';
import type { PrismaTestDatabase } from './types';

const PROVIDER_DIALECTS = { postgresql: 'postgres', mysql: 'mysql', sqlite: 'sqlite' } as const;

function runPrisma(workDirectory: string, command: string[]) {
  const prisma = Bun.spawnSync(['bunx', 'prisma', ...command], { cwd: workDirectory });
  if (prisma.exitCode !== 0) throw new Error(prisma.stderr.toString());
  return prisma.stdout.toString();
}

function writeProject(
  workDirectory: string,
  provider: PrismaProvider,
  url: string,
  tableName: string
) {
  const dialect = PROVIDER_DIALECTS[provider];
  const { contents } = generateSchema({ adapter: 'prisma', dialect, tableName });
  const header = `generator client {\n  provider = "prisma-client"\n  output   = "./client"\n}\n\ndatasource db {\n  provider = "${provider}"\n}\n\n`;
  writeFileSync(join(workDirectory, 'schema.prisma'), `${header}${contents}`);
  writeFileSync(
    join(workDirectory, 'prisma.config.ts'),
    `import { defineConfig } from 'prisma/config';\n\nexport default defineConfig({ schema: 'schema.prisma', datasource: { url: '${url}' } });\n`
  );
}

function splitStatements(script: string) {
  return script
    .split(';')
    .map((statement) => statement.replace(/^--.*$/gm, '').trim())
    .filter((statement) => statement.length > 0);
}

function createAdapter(provider: PrismaProvider, url: string) {
  if (provider === 'postgresql') return new PrismaPg({ connectionString: url });
  if (provider === 'mysql') return new PrismaMariaDb(url.replace(/^mysql:/, 'mariadb:'));
  return new PrismaLibSql({ url });
}

async function openPrisma(provider: PrismaProvider, url: string): Promise<PrismaTestDatabase> {
  const tableName = createUniqueTableName(`prisma_${provider}`);
  const workDirectory = join(import.meta.dir, `.${tableName}`);
  const cleanUp = () => rmSync(workDirectory, { recursive: true, force: true });
  mkdirSync(workDirectory, { recursive: true });
  const databaseURL = provider === 'sqlite' ? `file:${join(workDirectory, 'test.db')}` : url;
  try {
    writeProject(workDirectory, provider, databaseURL, tableName);
    runPrisma(workDirectory, ['generate']);
    const script = runPrisma(workDirectory, [
      'migrate',
      'diff',
      '--from-empty',
      '--to-schema',
      'schema.prisma',
      '--script'
    ]);
    const { PrismaClient } = await import(join(workDirectory, 'client', 'client.ts'));
    const prisma = new PrismaClient({ adapter: createAdapter(provider, databaseURL) });
    const execute = (statement: string) => prisma.$executeRawUnsafe(statement);
    for (const statement of splitStatements(script)) await execute(statement);
    const close = async () => {
      await execute(`drop table ${tableName}`).catch(() => undefined);
      await prisma.$disconnect();
      cleanUp();
    };
    return { prisma, provider, tableName, execute, close };
  } catch (error) {
    cleanUp();
    throw error;
  }
}

export const PRISMA_DATABASES = [
  { label: 'SQLite (libSQL)', open: () => openPrisma('sqlite', ''), isAvailable: true },
  {
    label: 'Postgres',
    open: () => openPrisma('postgresql', POSTGRES_URL ?? ''),
    isAvailable: Boolean(POSTGRES_URL)
  },
  {
    label: 'MySQL',
    open: () => openPrisma('mysql', MYSQL_URL ?? ''),
    isAvailable: Boolean(MYSQL_URL)
  }
];
