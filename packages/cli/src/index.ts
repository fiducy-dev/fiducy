import { createInterface } from 'node:readline/promises';

import { runCli } from './cli.ts';
import { createConsoleOutput } from './output.ts';

import type { Ask } from './types.ts';

const canAsk = process.stdin.isTTY === true && process.stdout.isTTY === true && !process.env.CI;

const ask: Ask = async (question) => {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await readline.question(question);
  } finally {
    readline.close();
  }
};

const code = await runCli(process.argv.slice(2), {
  cwd: process.cwd(),
  output: createConsoleOutput(),
  environment: process.env,
  ask: canAsk ? ask : undefined
});
process.exitCode = code;
