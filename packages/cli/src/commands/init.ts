import { join } from 'node:path';

import { copyToClipboard } from '../clipboard.ts';
import { writeNewFile } from '../files.ts';
import { UsageError, parseFlags, readBoolean, readString } from '../flags.ts';
import { buildAgentPrompt } from '../project/agentPrompt.ts';
import { detectProject } from '../project/detect.ts';
import { describeInstall, installPackages } from '../project/install.ts';
import { readPlacementChoice, resolvePlacement } from '../project/placement.ts';
import { buildInitPlan } from '../project/plan.ts';
import { withSpinner } from '../spinner.ts';
import { isAuthName, isFrameworkName } from '../validators.ts';
import { printAgentHint, printFile, printHeader, printInstall, printSteps } from './initReport.ts';
import { printPlacement } from './initReport.ts';
import { askPlacement } from './placementQuestion.ts';

import type { CommandContext, InitPlan, Output, PlacementChoice } from '../types.ts';
import type { ProjectInfo } from '../types.ts';

export const INIT_HELP = `Usage: fiducy init [--widget chat] [--show-code] [--dry-run] [--skip-install] [--framework next] [--auth better-auth]

Adds Fiducy to the app in this folder. It detects your framework, package
manager, auth and database, creates only new files (your server module and key
route), installs @fiducy/sdk, and lists the few things left to wire up in files
you already have. It never edits an existing file and never creates a new app.
In a terminal it asks where users add their key; elsewhere it picks for you.

  --widget         Where users add their key: chat, settings, or a route like
                   /account. Default: chat if the app has assistant-ui or AI SDK
                   useChat, otherwise settings. chat without a chat UI falls back
                   to settings
  --show-code      Print the code for each thing left to do
  --dry-run        Show every file and step without writing or installing
  --skip-install   Do not run your package manager
  --framework      next, tanstack-start, react-router, sveltekit, nuxt, farmjs, express, hono or node
  --auth           better-auth, authjs, clerk or none (none writes a placeholder to fill in)`;

const INIT_FLAGS = {
  'show-code': { type: 'boolean' },
  'dry-run': { type: 'boolean' },
  'skip-install': { type: 'boolean' },
  framework: { type: 'string' },
  auth: { type: 'string' },
  widget: { type: 'string' }
} as const;

function applyOverrides(project: ProjectInfo, framework?: string, auth?: string): ProjectInfo {
  if (framework !== undefined && !isFrameworkName(framework)) {
    throw new UsageError(`--framework ${framework} is not supported (yet)`);
  }
  if (auth !== undefined && !isAuthName(auth))
    throw new UsageError(`--auth ${auth} is not supported (yet)`);
  return {
    ...project,
    framework: framework ?? project.framework,
    auth: auth ?? project.auth,
    authSource: auth === 'none' ? undefined : project.authSource
  };
}

export function prepareInit(argv: string[], { cwd, environment }: CommandContext) {
  const flags = parseFlags(argv, INIT_FLAGS);
  const project = applyOverrides(
    detectProject(cwd, environment.npm_config_user_agent),
    readString(flags, 'framework'),
    readString(flags, 'auth')
  );
  return { flags, project, choice: readPlacementChoice(readString(flags, 'widget')) };
}

export function planInit(project: ProjectInfo, choice: PlacementChoice | undefined): InitPlan {
  return buildInitPlan(project, resolvePlacement(project, choice));
}

function printDryRun(project: ProjectInfo, plan: InitPlan, output: Output) {
  for (const file of plan.files) {
    output.info(`\n${output.style.heading('Would create')} ${output.style.path(file.path)}\n`);
    output.info(output.style.code(file.contents));
  }
  if (plan.packages.length > 0) {
    const command = describeInstall(project.packageManager, plan.packages);
    output.info(`\n${output.style.heading('Would run')} ${output.style.command(command)}`);
  }
  printSteps(project, plan, true, output);
}

async function installPlan(project: ProjectInfo, plan: InitPlan, skip: boolean, output: Output) {
  if (plan.packages.length === 0) return true;
  const command = describeInstall(project.packageManager, plan.packages);
  if (skip) {
    printInstall(plan.packages, command, output);
    return true;
  }
  const label = `Installing ${plan.packages.length} packages`;
  const result = await withSpinner(
    output,
    label,
    installPackages(project.root, project.packageManager, plan.packages)
  );
  if (result.ok) printInstall(plan.packages, undefined, output);
  else output.error(`${result.log.trim()}\n\nInstall failed. Run it yourself: ${command}`);
  return result.ok;
}

export async function runInit(argv: string[], context: CommandContext) {
  const { output, cwd, environment, ask } = context;
  const { flags, project, choice } = prepareInit(argv, context);
  printHeader(project, output);
  const chosen = choice ?? (ask ? await askPlacement(ask, project, output) : undefined);
  const plan = planInit(project, chosen);
  printPlacement(plan.placement, output);
  if (readBoolean(flags, 'dry-run')) {
    printDryRun(project, plan, output);
    return 0;
  }
  for (const file of plan.files) {
    printFile(file.path, writeNewFile(join(cwd, file.path), file.contents), output);
  }
  if (!(await installPlan(project, plan, readBoolean(flags, 'skip-install'), output))) return 1;
  printSteps(project, plan, readBoolean(flags, 'show-code'), output);
  const copied =
    output.status !== undefined && copyToClipboard(buildAgentPrompt(project, plan), environment);
  printAgentHint(copied, output);
  return 0;
}
