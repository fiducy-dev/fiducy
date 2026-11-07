import { runCli } from './cli.ts';
import { createConsoleOutput } from './output.ts';

const code = await runCli(process.argv.slice(2), {
  cwd: process.cwd(),
  output: createConsoleOutput(),
  environment: process.env
});
process.exitCode = code;
