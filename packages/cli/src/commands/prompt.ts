import { buildAgentPrompt } from '../project/agentPrompt.ts';
import { prepareInit } from './init.ts';

import type { CommandContext } from '../types.ts';

export const PROMPT_HELP = `Usage: fiducy prompt [--framework next] [--auth better-auth]

Prints a setup prompt for your coding agent: what fiducy init created, the few
things left to wire up with their code, and the guide for your framework.
It writes nothing. Pipe it anywhere, for example: npx fiducy prompt | pbcopy`;

export async function runPrompt(argv: string[], context: CommandContext) {
  const { project, plan } = prepareInit(argv, context);
  context.output.info(buildAgentPrompt(project, plan));
  return 0;
}
