import { createStyle, shouldUseColor } from './style.ts';

import type { Output } from './types.ts';

export function createConsoleOutput(): Output {
  const errorStyle = createStyle(shouldUseColor(process.stderr, process.env));
  return {
    info: (message) => process.stdout.write(`${message}\n`),
    error: (message) => process.stderr.write(`${errorStyle.failure(message)}\n`),
    style: createStyle(shouldUseColor(process.stdout, process.env))
  };
}
