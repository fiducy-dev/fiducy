import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { buildFrameworkFiles } from './frameworkFiles.ts';
import { buildServerModule, chooseServerModulePath, readExportName } from './serverModule.ts';

import type { InitPlan, ProjectInfo } from '../types.ts';

const MODEL_CALL = `const settings = await fiducy.providerSettings('openai', { request });
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
  ];
  return {
    files: [{ path: serverModulePath, contents: serverModule.contents }, ...framework.files],
    snippets: [
      ...framework.snippets,
      framework.widget,
      {
        title: "use the user's key (respondToMissingKey comes from @fiducy/sdk/server)",
        file: 'your AI route',
        code: MODEL_CALL.replace('fiducy.', `${exportName}.`)
      }
    ],
    packages,
    notes: [...serverModule.notes, 'Then run npx fiducy dev for a local gateway.']
  };
}
