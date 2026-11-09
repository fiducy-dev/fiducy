import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { buildFrameworkFiles } from './frameworkFiles.ts';
import { buildPlacementSection } from './placementSteps.ts';
import { buildServerModule, chooseServerModulePath, readExportName } from './serverModule.ts';

import { CHAT_FALLBACK_WARNING, CLI_VERSION } from '../constants.ts';

import type { InitPlan, ProjectInfo, ResolvedPlacement } from '../types.ts';

export function buildInitPlan(project: ProjectInfo, resolved: ResolvedPlacement): InitPlan {
  const { placement, fellBack } = resolved;
  const hasSourceFolder = existsSync(join(project.root, 'src'));
  const serverModulePath = chooseServerModulePath(project, hasSourceFolder);
  const serverModule = buildServerModule(project, serverModulePath);
  const framework = buildFrameworkFiles(project, serverModulePath);
  const exportName = readExportName(project);
  const placementSection = buildPlacementSection(project, placement, framework.widget, exportName);
  const packages = [
    ...(project.dependencies['@fiducy/sdk'] ? [] : ['@fiducy/sdk']),
    ...serverModule.packages,
    ...framework.packages,
    ...placementSection.packages
  ].map(pinFiducyPackage);
  return {
    placement,
    files: [{ path: serverModulePath, contents: serverModule.contents }, ...framework.files],
    steps: [...serverModule.steps, ...framework.snippets, ...placementSection.steps],
    packages,
    warnings: [...(fellBack ? [CHAT_FALLBACK_WARNING] : []), ...serverModule.warnings],
    commands: [
      ...serverModule.commands,
      { command: 'npx fiducy dev', purpose: 'runs a local gateway' }
    ]
  };
}

function pinFiducyPackage(name: string): string {
  return name.startsWith('@fiducy/') ? `${name}@${CLI_VERSION}` : name;
}
