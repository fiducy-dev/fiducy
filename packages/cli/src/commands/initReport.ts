import { CLI_VERSION } from '../constants.ts';
import { findGuideURL, nameAuth, nameFramework, nameStorage } from '../project/names.ts';
import { describePlacement } from '../project/placement.ts';

import type { InitPlan, NextCommand, Output, ProjectInfo, Snippet } from '../types.ts';
import type { WidgetPlacement } from '../types.ts';

const MAX_TITLE_WIDTH = 40;

function capitalize(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function describeStorage(project: ProjectInfo, { style }: Output): string {
  const { storage } = project;
  if (!storage.source) return style.warning('no database, using local SQLite');
  return `${style.heading(nameStorage(storage.name))} ${style.muted(`(${storage.source.exportName})`)}`;
}

export function printHeader(project: ProjectInfo, output: Output) {
  const { style } = output;
  const dot = style.muted('·');
  const auth =
    project.auth === 'none' ? style.warning('no auth') : style.heading(nameAuth(project.auth));
  const stack = `${style.heading(nameFramework(project.framework))} + ${style.heading(project.packageManager)}`;
  output.info(`\n${style.accent('◇ fiducy')} ${style.muted(`init · ${CLI_VERSION}`)}\n`);
  output.info(
    `${style.success('✓')} Found ${stack} ${dot} ${auth} ${dot} ${describeStorage(project, output)}`
  );
}

export function printPlacement(placement: WidgetPlacement, { info, style }: Output) {
  info(`${style.success('✓')} Key box goes ${style.heading(describePlacement(placement))}`);
}

export function printFile(path: string, created: boolean, { info, style }: Output) {
  const check = style.success('✓');
  if (created) info(`${check} Created ${style.path(path)}`);
  else info(`${check} Kept ${style.path(path)} ${style.muted('(already there)')}`);
}

export function printInstall(packages: string[], command: string | undefined, output: Output) {
  const { info, style } = output;
  const names = packages.map((name) =>
    name.slice(0, name.lastIndexOf('@') > 0 ? name.lastIndexOf('@') : undefined)
  );
  if (command) info(`${style.warning('○')} Install with: ${style.command(command)}`);
  else info(`${style.success('✓')} Installed ${style.heading(names.join(', '))}`);
}

function describeWhere(file: string, { style }: Output): string {
  return /[./]/.test(file) ? `${style.muted('in')} ${style.path(file)}` : style.muted(`in ${file}`);
}

function printStepList(steps: Snippet[], output: Output) {
  const width = Math.min(MAX_TITLE_WIDTH, Math.max(...steps.map((step) => step.title.length)));
  steps.forEach((step, index) => {
    const title = capitalize(step.title).padEnd(width);
    output.info(
      `  ${output.style.badge(String(index + 1))}  ${title}  ${describeWhere(step.file, output)}`
    );
  });
}

function printStepCode(steps: Snippet[], output: Output) {
  const { style } = output;
  steps.forEach((step, index) => {
    output.info(
      `\n${style.badge(String(index + 1))}  ${style.heading(capitalize(step.title))}  ${describeWhere(step.file, output)}`
    );
    if (step.detail) output.info(`\n   ${step.detail}`);
    if (step.code) output.info(`\n${style.code(step.code).replace(/^ {2}/gm, '   ')}`);
  });
}

function printCommands(commands: NextCommand[], output: Output) {
  const width = Math.max(...commands.map((next) => next.command.length));
  output.info(`\n${output.style.heading('Then run')}`);
  for (const next of commands) {
    output.info(
      `  ${output.style.command(next.command.padEnd(width))}  ${output.style.muted(next.purpose)}`
    );
  }
}

export function printSteps(
  project: ProjectInfo,
  plan: InitPlan,
  showCode: boolean,
  output: Output
) {
  const { style, info } = output;
  const count = plan.steps.length;
  info(`\n${style.heading(`${count} ${count === 1 ? 'thing' : 'things'} left`)}`);
  if (showCode) printStepCode(plan.steps, output);
  else printStepList(plan.steps, output);
  info('');
  if (!showCode)
    info(
      `  ${style.muted('Code for each'.padEnd(16))}${style.command('npx fiducy init --show-code')}`
    );
  info(
    `  ${style.muted('Full guide'.padEnd(16))}${style.link(findGuideURL(project.framework, plan.placement))}`
  );
  for (const warning of plan.warnings) info(`\n${style.warning('!')} ${style.prose(warning)}`);
  printCommands(plan.commands, output);
}

export function printAgentHint(copied: boolean, { info, style }: Output) {
  const arrow = style.accent('→');
  if (copied) {
    info(
      `\n${arrow} Using a coding agent? A setup prompt is ${style.heading('on your clipboard')}. Paste it in.\n`
    );
  } else {
    info(
      `\n${arrow} Using a coding agent? Run ${style.command('npx fiducy prompt')} and paste what it prints.\n`
    );
  }
}
