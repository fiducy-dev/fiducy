import { join } from 'node:path';

import { writeNewFile } from '../files.ts';
import { UsageError, parseFlags, readBoolean, readString } from '../flags.ts';
import { detectProject } from '../project/detect.ts';
import { describeInstall, installPackages } from '../project/install.ts';
import { buildInitPlan } from '../project/plan.ts';
import { isAuthName, isFrameworkName } from '../validators.ts';

import type { CommandContext, InitPlan, Output, ProjectInfo } from '../types.ts';

export const INIT_HELP = `Usage: fiducy init [--dry-run] [--skip-install] [--framework next] [--auth better-auth]

Adds Fiducy to the app in this folder. It detects your framework, package
manager, auth and database, creates only new files (your server module and key
route), installs @fiducy/sdk, and prints the few lines that go in files you
already have. It never edits an existing file and never creates a new app.

  --dry-run        Show what would happen without writing or installing
  --skip-install   Do not run your package manager
  --framework      next, tanstack-start, react-router, sveltekit, nuxt, farmjs, express, hono or node
  --auth           better-auth, authjs, clerk or none (none writes a placeholder to fill in)`;

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

function describeProject(project: ProjectInfo): string {
  const storage = project.storage.source
    ? `${project.storage.name} (${project.storage.source.exportName})`
    : 'none found, using a local SQLite file';
  return `Found ${project.framework}, ${project.packageManager}, auth: ${project.auth}, database: ${storage}`;
}

function printPlanTail(plan: InitPlan, output: Output) {
  for (const snippet of plan.snippets) {
    output.info(`\nIn ${snippet.file}: ${snippet.title}\n`);
    output.info(snippet.code.replace(/^/gm, '  '));
  }
  output.info('');
  for (const note of plan.notes) output.info(note);
}

export async function runInit(argv: string[], { cwd, output, environment }: CommandContext) {
  const flags = parseFlags(argv, {
    'dry-run': { type: 'boolean' },
    'skip-install': { type: 'boolean' },
    framework: { type: 'string' },
    auth: { type: 'string' }
  });
  const dryRun = readBoolean(flags, 'dry-run');
  const project = applyOverrides(
    detectProject(cwd, environment.npm_config_user_agent),
    readString(flags, 'framework'),
    readString(flags, 'auth')
  );
  output.info(describeProject(project));
  const plan = buildInitPlan(project);
  for (const file of plan.files) {
    if (dryRun) {
      output.info(`\nWould create ${file.path}:\n`);
      output.info(file.contents.replace(/^/gm, '  '));
    } else if (writeNewFile(join(cwd, file.path), file.contents))
      output.info(`Created ${file.path}`);
    else output.info(`Kept your existing ${file.path}. Compare it with: npx fiducy init --dry-run`);
  }
  if (plan.packages.length > 0) {
    const command = describeInstall(project.packageManager, plan.packages);
    if (dryRun || readBoolean(flags, 'skip-install')) output.info(`\nInstall with: ${command}`);
    else if (!installPackages(cwd, project.packageManager, plan.packages)) {
      output.error(`Install failed. Run it yourself: ${command}`);
      return 1;
    }
  }
  printPlanTail(plan, output);
  return 0;
}
