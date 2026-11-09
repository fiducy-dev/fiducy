import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { findGuideURL, nameFramework } from './names.ts';
import { describePlacement } from './placement.ts';

import type { InitPlan, ProjectInfo, Snippet } from '../types.ts';

function describeStep(step: Snippet, index: number): string {
  const lines = [`${index + 1}. In ${step.file}: ${step.title}.`];
  if (step.detail) lines.push(`   ${step.detail}`);
  if (step.code) lines.push('```', step.code, '```');
  return lines.join('\n');
}

function describeFiles(project: ProjectInfo, plan: InitPlan): string[] {
  const present = plan.files.filter((file) => existsSync(join(project.root, file.path)));
  if (present.length === 0) return ['Run `npx fiducy init` first. It creates the Fiducy files.'];
  return [`\`npx fiducy init\` already created: ${present.map((file) => file.path).join(', ')}.`];
}

export function buildAgentPrompt(project: ProjectInfo, plan: InitPlan): string {
  const guide = findGuideURL(project.framework, plan.placement);
  return [
    `Finish adding Fiducy (users bring their own AI keys, sealed in an enclave) to this ${nameFramework(project.framework)} app.`,
    ...describeFiles(project, plan),
    `Put the key box ${describePlacement(plan.placement)}, and nowhere else. Never put it in a header, nav bar, sidebar or root layout.`,
    'Do these steps, editing only what each one names:',
    ...plan.steps.map(describeStep),
    ...plan.warnings.map((warning) => `Note: ${warning}`),
    `Then run: ${plan.commands.map((next) => `${next.command} (${next.purpose})`).join(', ')}.`,
    `Guide: ${guide}.md`
  ].join('\n\n');
}
