import type { SQLDialect } from './types.ts';

export function isSQLDialect(value: unknown): value is SQLDialect {
  return value === 'sqlite' || value === 'postgres' || value === 'mysql';
}
