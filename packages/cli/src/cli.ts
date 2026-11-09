import { DEV_HELP, runDev } from './commands/dev.ts';
import { GENERATE_HELP, runGenerate } from './commands/generate.ts';
import { INIT_HELP, runInit } from './commands/init.ts';
import { MIGRATE_HELP, runMigrate } from './commands/migrate.ts';
import { PROMPT_HELP, runPrompt } from './commands/prompt.ts';
import { ConfigNotFoundError } from './config/loadFiducy.ts';
import { UsageError } from './flags.ts';
import { ProjectNotFoundError } from './project/detect.ts';

import type { Command, CommandContext } from './types.ts';

const HELP = `Usage: fiducy <command>

  init       Add Fiducy to the app in this folder (new files only)
  prompt     Print a setup prompt for your coding agent
  dev        Run a local gateway for development
  generate   Write the storage table for your ORM
  migrate    Create the storage table in your database (Kysely storage)

Run fiducy <command> --help for its options. Docs: https://fiducy.dev/docs/cli`;

const COMMANDS: Record<string, { run: Command; help: string }> = {
  init: { run: runInit, help: INIT_HELP },
  prompt: { run: runPrompt, help: PROMPT_HELP },
  dev: { run: runDev, help: DEV_HELP },
  generate: { run: runGenerate, help: GENERATE_HELP },
  migrate: { run: runMigrate, help: MIGRATE_HELP }
};

const EXPECTED_ERRORS = [UsageError, ConfigNotFoundError, ProjectNotFoundError];

export async function runCli(argv: string[], context: CommandContext): Promise<number> {
  const [name, ...rest] = argv;
  if (name === undefined || name === '--help' || name === '-h' || name === 'help') {
    context.output.info(HELP);
    return name === undefined ? 1 : 0;
  }
  const command = Object.hasOwn(COMMANDS, name) ? COMMANDS[name] : undefined;
  if (!command) {
    context.output.error(`Unknown command ${name}.\n\n${HELP}`);
    return 1;
  }
  if (rest.includes('--help') || rest.includes('-h')) {
    context.output.info(command.help);
    return 0;
  }
  try {
    return await command.run(rest, context);
  } catch (error) {
    if (!EXPECTED_ERRORS.some((type) => error instanceof type)) throw error;
    context.output.error((error as Error).message);
    return 1;
  }
}
