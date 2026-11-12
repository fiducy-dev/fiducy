import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { readText } from '../files.ts';
import { readPrimaryProvider, withProvider } from './providers.ts';
import { readExportName, toImportSpecifier } from './serverModule.ts';

import type { PlannedFile, ProjectInfo, Snippet } from '../types.ts';

interface FrameworkFiles {
  files: PlannedFile[];
  snippets: Snippet[];
  packages: string[];
  widget: Snippet;
}

const REACT_WIDGET = `import { FiducyKey } from '@fiducy/sdk/react';

export const KeySettings = () => <FiducyKey provider="openai" />;`;

const ELEMENT_WIDGET = `<script type="module">
  import '@fiducy/sdk/element';
</script>
<fiducy-key provider="openai"></fiducy-key>`;

function importServer(project: ProjectInfo, from: string, serverModulePath: string): string {
  const specifier = toImportSpecifier(project, from, join(project.root, serverModulePath));
  return `import { ${readExportName(project)} } from '${specifier}';`;
}

function nextFiles(project: ProjectInfo, serverModulePath: string): FrameworkFiles {
  const path = join(project.sourceDirectory, 'app/api/fiducy/[...path]/route.ts');
  return {
    files: [
      {
        path,
        contents: `import { toNextJsHandler } from '@fiducy/sdk/next';\n\n${importServer(project, path, serverModulePath)}\n\nexport const { GET, POST, DELETE } = toNextJsHandler(fiducy);\n`
      }
    ],
    snippets: [],
    packages: [],
    widget: {
      title: 'show the key widget',
      file: 'a client component',
      code: `'use client';\n\n${REACT_WIDGET}`
    }
  };
}

function tanstackFiles(project: ProjectInfo, serverModulePath: string): FrameworkFiles {
  const path = 'src/routes/api/fiducy/$.ts';
  return {
    files: [
      {
        path,
        contents: `import { toTanStackHandlers } from '@fiducy/sdk/tanstack';\nimport { createFileRoute } from '@tanstack/react-router';\n\n${importServer(project, path, serverModulePath)}\n\nexport const Route = createFileRoute('/api/fiducy/$')({\n  server: { handlers: toTanStackHandlers(fiducy) }\n});\n`
      }
    ],
    snippets: [],
    packages: [],
    widget: { title: 'show the key widget', file: 'any component', code: REACT_WIDGET }
  };
}

function reactRouterFiles(project: ProjectInfo, serverModulePath: string): FrameworkFiles {
  const usesFileRoutes = /flatRoutes\s*\(/.test(
    readText(join(project.root, 'app/routes.ts')) ?? ''
  );
  const path = usesFileRoutes ? 'app/routes/api.fiducy.$.ts' : 'app/routes/fiducy.ts';
  const routeFile = {
    path,
    contents: `import { toReactRouterHandlers } from '@fiducy/sdk/react-router';\n\n${importServer(project, path, serverModulePath)}\n\nconst handlers = toReactRouterHandlers(fiducy);\n\nexport const loader = handlers.loader;\nexport const action = handlers.action;\n`
  };
  const snippets = usesFileRoutes
    ? []
    : [
        {
          title: 'register the key route',
          file: 'app/routes.ts',
          code: "route('api/fiducy/*', 'routes/fiducy.ts'),"
        }
      ];
  return {
    files: [routeFile],
    snippets,
    packages: [],
    widget: { title: 'show the key widget', file: 'any route component', code: REACT_WIDGET }
  };
}

function svelteKitFiles(project: ProjectInfo, serverModulePath: string): FrameworkFiles {
  const files: PlannedFile[] = [];
  const snippets: Snippet[] = [];
  const hooksPath = 'src/hooks.server.ts';
  const handleLine =
    'export const handle: Handle = ({ event, resolve }) => svelteKitHandler({ event, resolve, fiducy });';
  const hooksImports = `import { svelteKitHandler } from '@fiducy/sdk/sveltekit';\n\n${importServer(project, hooksPath, serverModulePath)}\n\nimport type { Handle } from '@sveltejs/kit';`;
  if (existsSync(join(project.root, hooksPath))) {
    snippets.push({
      title: 'add the Fiducy handle next to yours',
      file: hooksPath,
      code: `import { sequence } from '@sveltejs/kit/hooks';\n${hooksImports}\n\nconst fiducyHandle: Handle = ({ event, resolve }) => svelteKitHandler({ event, resolve, fiducy });\n\nexport const handle = sequence(fiducyHandle, yourHandle);`
    });
  } else files.push({ path: hooksPath, contents: `${hooksImports}\n\n${handleLine}\n` });
  if (project.frameworkMajor >= 3) {
    const variables = '  FIDUCY_GATEWAY_URL: {},\n  FIDUCY_APP_ID: {},\n  FIDUCY_APP_SECRET: {}';
    const envPath = 'src/env.ts';
    if (existsSync(join(project.root, envPath))) {
      snippets.push({
        title: 'declare the Fiducy env variables',
        file: envPath,
        code: variables
      });
    } else {
      files.push({
        path: envPath,
        contents: `import { defineEnvVars } from '@sveltejs/kit/env';\n\nexport const variables = defineEnvVars({\n${variables}\n});\n`
      });
    }
  }
  return {
    files,
    snippets,
    packages: [],
    widget: {
      title: 'show the key widget',
      file: 'any +page.svelte',
      code: `<script>\n  import { fiducyKey } from '@fiducy/sdk/svelte';\n</script>\n\n<div use:fiducyKey={{ provider: 'openai' }}></div>`
    }
  };
}

function nuxtFiles(project: ProjectInfo, serverModulePath: string): FrameworkFiles {
  const path = 'server/api/fiducy/[...path].ts';
  return {
    files: [
      {
        path,
        contents: `import { toNuxtHandler } from '@fiducy/sdk/nuxt';\n\n${importServer(project, path, serverModulePath)}\n\nexport default defineEventHandler(toNuxtHandler(fiducy));\n`
      }
    ],
    snippets: [],
    packages: [],
    widget: {
      title: 'show the key widget',
      file: 'any component',
      code: `<script setup lang="ts">\nimport { FiducyKey } from '@fiducy/sdk/vue';\n</script>\n\n<template>\n  <FiducyKey provider="openai" />\n</template>`
    }
  };
}

function farmFiles(project: ProjectInfo, serverModulePath: string): FrameworkFiles {
  return {
    files: [],
    snippets: [
      {
        title: 'add the Fiducy integration',
        file: 'farm.config.ts',
        code: `import { fiducy } from '@fiducy/farm';\n\n${importServer(project, 'farm.config.ts', serverModulePath)}\n\nexport default defineConfig({\n  integrations: {\n    byok: fiducy({ instance: fiducyServer })\n  }\n});`
      }
    ],
    packages: project.dependencies['@fiducy/farm'] ? [] : ['@fiducy/farm'],
    widget: { title: 'show the key widget', file: 'any component', code: REACT_WIDGET }
  };
}

function nodeServerFiles(project: ProjectInfo, serverModulePath: string): FrameworkFiles {
  const server = importServer(project, 'src/server.ts', serverModulePath);
  const codes: Record<string, string> = {
    express: `import { toNodeHandler } from '@fiducy/sdk/node';\n\n${server}\n\napp.all('${project.frameworkMajor >= 5 ? '/api/fiducy/{*path}' : '/api/fiducy/*'}', toNodeHandler(fiducy));`,
    hono: `${server}\n\napp.on(['GET', 'POST', 'DELETE'], '/api/fiducy/*', (context) => fiducy.handler(context.req.raw));`,
    node: `import { toNodeHandler } from '@fiducy/sdk/node';\n\n${server}\n\nconst handleFiducy = toNodeHandler(fiducy);`
  };
  const titles: Record<string, string> = {
    express: 'mount /api/fiducy/*',
    hono: 'mount /api/fiducy/*',
    node: 'send /api/fiducy/* to handleFiducy'
  };
  return {
    files: [],
    snippets: [
      {
        title: titles[project.framework] ?? titles.node ?? '',
        file: 'your server entry',
        code: codes[project.framework] ?? codes.node ?? '',
        detail: codes[project.framework]
          ? undefined
          : 'Or pass a Web Request straight to fiducy.handler.'
      }
    ],
    packages: [],
    widget: { title: 'show the key widget', file: 'any HTML page', code: ELEMENT_WIDGET }
  };
}

const BUILDERS: Record<string, (project: ProjectInfo, path: string) => FrameworkFiles> = {
  next: nextFiles,
  'tanstack-start': tanstackFiles,
  'react-router': reactRouterFiles,
  sveltekit: svelteKitFiles,
  nuxt: nuxtFiles,
  farmjs: farmFiles
};

export function buildFrameworkFiles(project: ProjectInfo, serverModulePath: string) {
  const builder = BUILDERS[project.framework] ?? nodeServerFiles;
  const built = builder(project, serverModulePath);
  const provider = readPrimaryProvider(project);
  const adapt = (snippet: Snippet) => ({ ...snippet, code: withProvider(snippet.code, provider) });
  return { ...built, snippets: built.snippets.map(adapt), widget: adapt(built.widget) };
}
