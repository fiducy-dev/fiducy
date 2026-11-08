import { styleText } from 'node:util';

import { COMMAND_PATTERN } from './constants.ts';

import type { Style, StyleFormat } from './types.ts';

export function shouldUseColor(
  stream: { isTTY?: boolean },
  environment: Record<string, string | undefined>
): boolean {
  if (environment.NO_COLOR) return false;
  if (environment.FORCE_COLOR && environment.FORCE_COLOR !== '0') return true;
  return stream.isTTY === true && environment.TERM !== 'dumb';
}

export function createStyle(enabled: boolean): Style {
  const paint = (format: StyleFormat) => (text: string) =>
    enabled ? styleText(format, text, { validateStream: false }) : text;
  const command = paint('cyan');
  const snippet = paint('blueBright');
  return {
    success: paint('green'),
    warning: paint('yellow'),
    failure: paint('red'),
    heading: paint('bold'),
    path: paint(['bold', 'cyan']),
    command,
    muted: paint('gray'),
    code: (block) => block.replace(/^.*$/gm, (line) => (line ? `  ${snippet(line)}` : line)),
    prose: (text) => text.replace(COMMAND_PATTERN, (match) => command(match))
  };
}
