import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { buildFrameworkFiles } from './frameworkFiles.ts';
import { buildServerModule, chooseServerModulePath, readExportName } from './serverModule.ts';

import { CLI_VERSION } from '../constants.ts';

import type { InitPlan, ProjectInfo } from '../types.ts';

const MODEL_CALL = `import { respondToMissingKey } from '@fiducy/sdk/server';

const settings = await fiducy.providerSettings('openai', { request });
if (!settings.ok) return respondToMissingKey(settings);
const model = createOpenAI(settings).chat('gpt-4o-mini');`;

export function buildInitPlan(project: ProjectInfo): InitPlan {
  const hasSourceFolder = existsSync(join(project.root, 'src'));
  const serverModulePath = chooseServerModulePath(project, hasSourceFolder);
  const serverModule = buildServerModule(project, serverModulePath);
  const framework = buildFrameworkFiles(project, serverModulePath);
  const exportName = readExportName(project);
  const packages = [
    ...(project.dependencies['@fiducy/sdk'] ? [] : ['@fiducy/sdk']),
    ...serverModule.packages,
    ...framework.packages
  ].map(pinFiducyPackage);
  return {
    files: [{ path: serverModulePath, contents: serverModule.contents }, ...framework.files],
    steps: [
      ...serverModule.steps,
      ...framework.snippets,
      framework.widget,
      {
        title: "call the model with the user's key",
        file: 'your AI route',
        code: MODEL_CALL.replace('fiducy.', `${exportName}.`)
      }
    ],
    packages,
    warnings: serverModule.warnings,
    commands: [
      ...serverModule.commands,
      { command: 'npx fiducy dev', purpose: 'runs a local gateway' }
    ]
  };
}

function pinFiducyPackage(name: string): string {
  return name.startsWith('@fiducy/') ? `${name}@${CLI_VERSION}` : name;
}
