import { join, relative } from 'node:path';

import { DOCS_URL, SQLITE_FALLBACK_PATH } from '../constants.ts';
import { toRelativeSpecifier } from './detect.ts';

import type { ImportPath, ProjectInfo } from '../types.ts';

const SERVER_MODULE_PATHS: Record<string, string> = {
  'tanstack-start': 'src/lib/fiducy.ts',
  'react-router': 'app/lib/fiducy.ts',
  sveltekit: 'src/lib/server/fiducy.ts',
  nuxt: 'server/utils/fiducy.ts',
  farmjs: 'src/lib/fiducy.ts'
};

export function chooseServerModulePath(project: ProjectInfo, hasSourceFolder: boolean): string {
  if (project.framework === 'next') return join(project.sourceDirectory, 'lib/fiducy.ts');
  const path = SERVER_MODULE_PATHS[project.framework];
  if (path) return path;
  return hasSourceFolder ? 'src/fiducy.ts' : 'fiducy.ts';
}

export function readExportName(project: ProjectInfo): string {
  return project.framework === 'farmjs' ? 'fiducyServer' : 'fiducy';
}

export function toImportSpecifier(project: ProjectInfo, fromPath: string, toFile: string): string {
  const target = relative(project.root, toFile);
  const alias = project.alias;
  if (alias && project.framework !== 'nuxt') {
    const inside = alias.target === '' ? target : relative(alias.target, target);
    if (!inside.startsWith('..')) {
      return `${alias.prefix}${inside.replace(/\.(ts|tsx|mts|js|mjs)$/, '').replace(/\/index$/, '')}`;
    }
  }
  return toRelativeSpecifier(join(project.root, fromPath), join(project.root, target));
}

function importFrom(project: ProjectInfo, modulePath: string, source: ImportPath): string {
  return `import { ${source.exportName} } from '${toImportSpecifier(project, modulePath, source.specifier)}';`;
}

interface Section {
  imports: string[];
  statements: string[];
  options: string[];
  packages: string[];
  notes: string[];
}

function describeStorage(project: ProjectInfo, modulePath: string): Section {
  const { storage } = project;
  const source = storage.source;
  if (storage.name === 'prisma' && source) {
    return {
      imports: [
        "import { prismaStorage } from '@fiducy/sdk/storage/prisma';",
        importFrom(project, modulePath, source)
      ],
      statements: [],
      options: [`storage: prismaStorage(${source.exportName}, { provider: '${storage.dialect}' })`],
      packages: [],
      notes: ['Next: npx fiducy generate adds the Prisma model, then run prisma migrate dev.']
    };
  }
  if (storage.name === 'drizzle' && source) {
    return {
      imports: [
        "import { drizzleStorage } from '@fiducy/sdk/storage/drizzle';",
        importFrom(project, modulePath, source)
      ],
      statements: [],
      options: [
        `storage: drizzleStorage(${source.exportName}, { provider: '${storage.dialect}' })`
      ],
      packages: [],
      notes: ['Next: npx fiducy generate writes the Drizzle table, then run drizzle-kit migrate.']
    };
  }
  if (storage.name === 'kysely' && source) {
    return {
      imports: [
        "import { kyselyStorage } from '@fiducy/sdk/storage/kysely';",
        importFrom(project, modulePath, source)
      ],
      statements: [],
      options: [`storage: kyselyStorage(${source.exportName})`],
      packages: [],
      notes: ['Next: npx fiducy migrate creates the table.']
    };
  }
  return {
    imports: [
      "import { mkdirSync } from 'node:fs';",
      "import { DatabaseSync } from 'node:sqlite';",
      "import { kyselyStorage } from '@fiducy/sdk/storage/kysely';"
    ],
    statements: ["mkdirSync('.fiducy', { recursive: true });"],
    options: [`storage: kyselyStorage(new DatabaseSync('${SQLITE_FALLBACK_PATH}'))`],
    packages: project.dependencies.kysely ? [] : ['kysely'],
    notes: [
      `No Prisma, Drizzle or Kysely database export was found, so handles go in a local SQLite file (${SQLITE_FALLBACK_PATH}). Swap in your real database before you deploy: ${DOCS_URL}/storage`,
      'Next: npx fiducy migrate creates the table.'
    ]
  };
}

function describeAuth(project: ProjectInfo, modulePath: string): Section {
  const empty = { statements: [], packages: [], notes: [] };
  if (project.auth === 'better-auth' && project.authSource) {
    const name = project.authSource.exportName;
    return {
      ...empty,
      imports: [importFrom(project, modulePath, project.authSource)],
      options: [
        `getUserID: async (request) => {\n    const session = await ${name}.api.getSession({ headers: request.headers });\n    return session?.user.id ?? null;\n  }`
      ]
    };
  }
  if (project.auth === 'authjs' && project.authSource) {
    return {
      ...empty,
      imports: [importFrom(project, modulePath, project.authSource)],
      options: ['getUserID: async () => (await auth())?.user?.id ?? null'],
      notes: [
        'Auth.js leaves user.id out of JWT sessions unless your session callback copies token.sub into it. Check that session.user.id is set.'
      ]
    };
  }
  if (project.auth === 'clerk') {
    return {
      ...empty,
      imports: ["import { auth } from '@clerk/nextjs/server';"],
      options: ['getUserID: async () => (await auth()).userId']
    };
  }
  return {
    ...empty,
    imports: [],
    statements: [
      `async function readSignedInUserID(_request: Request): Promise<string | null> {\n  throw new Error(\n    'Return the signed-in user ID from readSignedInUserID in ${modulePath}, or null when nobody is signed in. See ${DOCS_URL}/server'\n  );\n}`
    ],
    options: ['getUserID: readSignedInUserID'],
    notes: [
      `No Better Auth, Auth.js or Clerk setup was found. Fill in readSignedInUserID in ${modulePath} with your auth's user ID.`
    ]
  };
}

function describeEnvironment(project: ProjectInfo): Section {
  const empty = { statements: [], packages: [], notes: [] };
  if (project.framework !== 'sveltekit') return { ...empty, imports: [], options: [] };
  if (project.frameworkMajor >= 3) {
    return { ...empty, imports: ["import * as env from '$app/env/private';"], options: ['env'] };
  }
  return {
    ...empty,
    imports: ["import { env } from '$env/dynamic/private';"],
    options: ['env']
  };
}

export function buildServerModule(project: ProjectInfo, modulePath: string) {
  const sections = [
    describeEnvironment(project),
    describeStorage(project, modulePath),
    describeAuth(project, modulePath)
  ];
  const all = (key: keyof Section) => sections.flatMap((section) => section[key]);
  const nodeImports = all('imports').filter((line) => line.includes("'node:"));
  const packageImports = all('imports').filter(
    (line) => !line.includes("'node:") && !/from '(\.|@\/|~\/|#|\$lib)/.test(line)
  );
  const localImports = all('imports').filter(
    (line) => !nodeImports.includes(line) && !packageImports.includes(line)
  );
  const head = [
    nodeImports.join('\n'),
    ["import { createFiducy } from '@fiducy/sdk/server';", ...packageImports].sort().join('\n'),
    localImports.join('\n')
  ].filter(Boolean);
  const body = all('statements');
  const exportName = readExportName(project);
  const contents = [
    head.join('\n\n'),
    ...body,
    `export const ${exportName} = createFiducy({\n  ${all('options').join(',\n  ')}\n});`
  ].join('\n\n');
  return {
    contents: `${contents}\n`,
    packages: all('packages') as string[],
    notes: all('notes') as string[]
  };
}
