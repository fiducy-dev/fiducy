import { createStyle, shouldUseColor } from './style.ts';

import type { Output } from './types.ts';

const CLEAR_LINE = '\r\u001b[2K';

export function createConsoleOutput(): Output {
  const errorStyle = createStyle(shouldUseColor(process.stderr, process.env));
  const isInteractive = process.stdout.isTTY === true && !process.env.CI;
  return {
    info: (message) => process.stdout.write(`${message}\n`),
    error: (message) => process.stderr.write(`${errorStyle.failure(message)}\n`),
    status: isInteractive
      ? (message) => process.stdout.write(`${CLEAR_LINE}${message}`)
      : undefined,
    style: createStyle(shouldUseColor(process.stdout, process.env))
  };
}
