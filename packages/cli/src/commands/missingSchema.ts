import { DEFAULT_TABLE_NAME, generateSchema } from '@fiducy/sdk/storage';

import { DRIZZLE_PROVIDER_DIALECTS, GENERATED_SCHEMA_MODULE } from '../constants.ts';
import { readDrizzleProvider } from '../project/detect.ts';

import type { Output, StorageSchema } from '../types.ts';

const MISSING_MODULE_PATTERN = /Cannot find module '([^']+)'/;

export function isMissingGeneratedSchema(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  const specifier = MISSING_MODULE_PATTERN.exec(message)?.[1] ?? '';
  const name = specifier
    .split('/')
    .pop()
    ?.replace(/\.[cm]?[jt]s$/, '');
  return name === GENERATED_SCHEMA_MODULE;
}

export function readDrizzleFallback(root: string, output: Output): StorageSchema {
  const dialect = DRIZZLE_PROVIDER_DIALECTS[readDrizzleProvider(root)] ?? 'postgres';
  output.info(
    `Your app imports ${GENERATED_SCHEMA_MODULE}, which does not exist yet, so the Drizzle table comes from the dialect in drizzle.config.`
  );
  return {
    adapter: 'drizzle',
    dialect,
    tableName: DEFAULT_TABLE_NAME,
    generate: () => generateSchema({ adapter: 'drizzle', dialect })
  };
}
