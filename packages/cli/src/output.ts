import type { Output } from './types.ts';

export function createConsoleOutput(): Output {
  return {
    info: (message) => process.stdout.write(`${message}\n`),
    error: (message) => process.stderr.write(`${message}\n`)
  };
}
