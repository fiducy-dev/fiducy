import { parseArgs } from 'node:util';

import type { ParseArgsConfig } from 'node:util';
import type { ParsedFlags } from './types.ts';

export class UsageError extends Error {}

export function parseFlags(argv: string[], options: ParseArgsConfig['options']): ParsedFlags {
  try {
    const { values, positionals } = parseArgs({ args: argv, options, allowPositionals: true });
    return { values, positionals };
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : String(error));
  }
}

export function readString(flags: ParsedFlags, name: string): string | undefined {
  const value = flags.values[name];
  return typeof value === 'string' ? value : undefined;
}

export function readStrings(flags: ParsedFlags, name: string): string[] {
  const value = flags.values[name];
  return Array.isArray(value) ? value : [];
}

export function readBoolean(flags: ParsedFlags, name: string): boolean {
  return flags.values[name] === true;
}
