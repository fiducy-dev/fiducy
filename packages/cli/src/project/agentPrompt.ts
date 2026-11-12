import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { findGuideURL, nameFramework } from './names.ts';
import { describePlacement } from './placement.ts';
import { describeProviderKeys } from './providers.ts';

import type { InitPlan, NextCommand, ProjectInfo, Snippet, WidgetPlacement } from '../types.ts';

function describeStep(step: Snippet, index: number): string {
  const lines = [`${index + 1}. In ${step.file}: ${step.title}.`];
  if (step.detail) lines.push(`   ${step.detail}`);
  if (step.code) lines.push('```', step.code, '```');
  return lines.join('\n');
}

function describeCommand(next: NextCommand, index: number): string {
  const followUp = next.followUp ? ` Then ${next.followUp}.` : '';
  return `${index + 1}. \`${next.command}\` ${next.purpose}.${followUp}`;
}

function describeFiles(project: ProjectInfo, plan: InitPlan): string {
  const present = plan.files.filter((file) => existsSync(join(project.root, file.path)));
  const init = `${plan.fiducyCommand} init`;
  if (present.length === 0) return `Run \`${init}\` first. It creates the Fiducy files.`;
  return `\`${init}\` already created: ${present.map((file) => file.path).join(', ')}.`;
}

function describeCheck(placement: WidgetPlacement): string {
  const save = 'Save a key (with the dev gateway in --mock mode, any string works)';
  if (placement.kind === 'chat') {
    return `Done when: signed in, a message without a key shows the key box in the chat. ${save}, and the same message gets its reply. Signed out, the AI route answers 401.`;
  }
  return `Done when: signed in, the key box shows ${describePlacement(placement)}. ${save}, then send a message to the AI: the reply arrives. Signed out, the AI route answers 401.`;
}

export function buildAgentPrompt(project: ProjectInfo, plan: InitPlan): string {
  const guide = findGuideURL(project.framework, plan.placement);
  return [
    `Finish adding Fiducy (users bring their own AI keys, sealed in an enclave) to this ${nameFramework(project.framework)} app. It uses ${project.packageManager}.`,
    describeFiles(project, plan),
    `Put the key box ${describePlacement(plan.placement)}, and nowhere else. Never put it in a header, nav bar, sidebar or root layout.`,
    'Make these edits. Leave the rest of the app as it is unless a step or command below needs a change.',
    ...plan.steps.map(describeStep),
    ...plan.warnings.map((warning) => `Note: ${warning}`),
    ['Then run, in order:', ...plan.commands.map(describeCommand)].join('\n'),
    `Model calls now use each user's own key, so the app's own provider env vars (${describeProviderKeys(project)}) no longer pay for them. Remove each once nothing else reads it.`,
    describeCheck(plan.placement),
    `Guide: ${guide}.md`
  ].join('\n\n');
}
