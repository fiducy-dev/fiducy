import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';

import { findSourceAlias } from '../config/aliases.ts';
import { LOCKFILES, SOURCE_EXTENSIONS, SOURCE_SEARCH_DEPTH } from '../constants.ts';
import { SOURCE_SEARCH_DIRECTORIES, SOURCE_SEARCH_IGNORED } from '../constants.ts';
import { readPackageJSON, readText } from '../files.ts';

import type { AuthName, FoundExport, FrameworkName, PackageManager } from '../types.ts';
import type { ProjectInfo, StorageChoice } from '../types.ts';

export class ProjectNotFoundError extends Error {}

const FRAMEWORK_PACKAGES: [string, FrameworkName][] = [
  ['next', 'next'],
  ['@tanstack/react-start', 'tanstack-start'],
  ['@tanstack/solid-start', 'tanstack-start'],
  ['@react-router/dev', 'react-router'],
  ['@sveltejs/kit', 'sveltekit'],
  ['nuxt', 'nuxt'],
  ['@farm.js/core', 'farmjs'],
  ['express', 'express'],
  ['hono', 'hono']
];

const AUTH_PACKAGES: [string, AuthName][] = [
  ['better-auth', 'better-auth'],
  ['next-auth', 'authjs'],
  ['@clerk/nextjs', 'clerk']
];

const AUTH_EXPORT_PATTERNS: Record<string, RegExp> = {
  'better-auth': /export\s+const\s+(\w+)\s*=\s*betterAuth\s*\(/,
  authjs: /export\s+const\s*\{[^}]*\bauth\b[^}]*\}\s*=\s*NextAuth\s*\(/
};

const STORAGE_EXPORT_PATTERNS: [StorageChoice['name'], string, RegExp][] = [
  ['prisma', '@prisma/client', /export\s+const\s+(\w+)\s*=[^;]*new\s+PrismaClient\s*\(/],
  ['drizzle', 'drizzle-orm', /export\s+const\s+(\w+)\s*=\s*drizzle\s*\(/],
  ['kysely', 'kysely', /export\s+const\s+(\w+)\s*=\s*new\s+Kysely\b/]
];

function findLockfileManager(root: string): PackageManager | null {
  for (let directory = root; ; directory = dirname(directory)) {
    for (const [file, manager] of LOCKFILES) {
      if (existsSync(join(directory, file))) return manager as PackageManager;
    }
    if (dirname(directory) === directory) return null;
  }
}

function detectPackageManager(root: string, userAgent: string | undefined): PackageManager {
  const fromLockfile = findLockfileManager(root);
  if (fromLockfile) return fromLockfile;
  const fromAgent = userAgent?.split('/')[0];
  if (fromAgent === 'bun' || fromAgent === 'pnpm' || fromAgent === 'yarn') return fromAgent;
  return 'npm';
}

function readMajor(version: string | undefined): number {
  const match = /(\d+)/.exec(version ?? '');
  return match ? Number(match[1]) : 0;
}

function listSourceFiles(root: string): string[] {
  const files: string[] = [];
  const visit = (directory: string, depth: number) => {
    if (depth > SOURCE_SEARCH_DEPTH || !existsSync(directory)) return;
    for (const name of readdirSync(directory)) {
      if (SOURCE_SEARCH_IGNORED.includes(name) || name.startsWith('.')) continue;
      const path = join(directory, name);
      if (statSync(path).isDirectory()) visit(path, depth + 1);
      else if (SOURCE_EXTENSIONS.includes(extname(name))) files.push(path);
    }
  };
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    if (SOURCE_EXTENSIONS.includes(extname(name)) && !name.includes('.config.')) files.push(path);
  }
  for (const directory of SOURCE_SEARCH_DIRECTORIES) visit(join(root, directory), 1);
  return files;
}

function findExport(files: string[], pattern: RegExp): FoundExport | null {
  for (const file of files) {
    const text = readText(file) ?? '';
    const match = pattern.exec(text);
    if (match) return { file, exportName: match[1] ?? 'auth' };
  }
  return null;
}

function readPrismaProvider(root: string): string {
  const candidates = [
    join(root, 'prisma/schema.prisma'),
    join(root, 'prisma/schema/schema.prisma')
  ];
  for (const path of candidates) {
    const provider = /provider\s*=\s*"(postgresql|mysql|sqlite)"/.exec(readText(path) ?? '')?.[1];
    if (provider) return provider;
  }
  return 'postgresql';
}

function readDrizzleProvider(root: string): string {
  for (const name of ['drizzle.config.ts', 'drizzle.config.js', 'drizzle.config.mjs']) {
    const dialect = /dialect\s*:\s*['"](\w+)['"]/.exec(readText(join(root, name)) ?? '')?.[1];
    if (dialect === 'postgresql') return 'pg';
    if (dialect === 'mysql' || dialect === 'sqlite') return dialect;
    if (dialect === 'turso') return 'sqlite';
  }
  return 'pg';
}

function detectStorage(
  root: string,
  files: string[],
  dependencies: Record<string, string>
): StorageChoice {
  for (const [name, packageName, pattern] of STORAGE_EXPORT_PATTERNS) {
    if (!dependencies[packageName]) continue;
    const found = findExport(files, pattern);
    if (!found) continue;
    const source = { specifier: found.file, exportName: found.exportName };
    if (name === 'prisma') return { name, source, dialect: readPrismaProvider(root) };
    if (name === 'drizzle') return { name, source, dialect: readDrizzleProvider(root) };
    return { name, source };
  }
  return { name: 'sqlite' };
}

function detectSourceDirectory(root: string, framework: FrameworkName): string {
  if (framework === 'react-router') return 'app';
  if (framework === 'nuxt') return 'server';
  if (framework === 'next') return existsSync(join(root, 'src/app')) ? 'src' : '';
  return 'src';
}

export function detectProject(root: string, userAgent?: string): ProjectInfo {
  const packageJSON = readPackageJSON(root);
  if (!packageJSON) {
    throw new ProjectNotFoundError(
      'No package.json here. Run fiducy init in the root of the app you are adding Fiducy to.'
    );
  }
  const dependencies = { ...packageJSON.devDependencies, ...packageJSON.dependencies };
  const [frameworkPackage, framework] = FRAMEWORK_PACKAGES.find(([name]) => dependencies[name]) ?? [
    '',
    'node' as FrameworkName
  ];
  const auth = AUTH_PACKAGES.find(([name]) => dependencies[name])?.[1] ?? 'none';
  const files = listSourceFiles(root);
  const authPattern = AUTH_EXPORT_PATTERNS[auth];
  const authExport = authPattern ? findExport(files, authPattern) : null;
  const sourceDirectory = detectSourceDirectory(root, framework);
  return {
    root,
    packageManager: detectPackageManager(root, userAgent),
    framework,
    frameworkMajor: readMajor(dependencies[frameworkPackage]),
    auth: authPattern && !authExport ? 'none' : auth,
    authSource: authExport
      ? { specifier: authExport.file, exportName: authExport.exportName }
      : undefined,
    storage: detectStorage(root, files, dependencies),
    sourceDirectory,
    alias: findSourceAlias(root, sourceDirectory === 'server' ? '' : sourceDirectory),
    dependencies
  };
}

export function toRelativeSpecifier(fromFile: string, toFile: string): string {
  const path = relative(join(fromFile, '..'), toFile)
    .replace(/\.(ts|tsx|mts|js|mjs)$/, '')
    .replace(/\/index$/, '');
  return path.startsWith('.') ? path : `./${path}`;
}
