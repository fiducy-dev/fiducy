import { relative } from 'node:path';

import { loadFiducy } from '../config/loadFiducy.ts';
import { isMissingGeneratedSchema, readDrizzleFallback } from './missingSchema.ts';

import type { Output, StorageSchema } from '../types.ts';

export const NO_SCHEMA_MESSAGE =
  'Your Fiducy storage has no table to generate. kyselyStorage, drizzleStorage and prismaStorage from @fiducy/sdk/storage/* have one; a key-value or custom storage does not need it.';

export async function loadStorageSchema(
  root: string,
  configPath: string | undefined,
  output: Output
): Promise<StorageSchema | null> {
  const loaded = await loadFiducy(root, configPath).catch((error: unknown) => {
    if (!isMissingGeneratedSchema(error)) throw error;
    return null;
  });
  if (!loaded) return readDrizzleFallback(root, output);
  const { file, schema } = loaded;
  output.info(`Loaded ${output.style.path(relative(root, file))}`);
  if (!schema) output.error(NO_SCHEMA_MESSAGE);
  return schema;
}

export function describeSchema(schema: StorageSchema): string {
  return `${schema.adapter} storage, ${schema.dialect}, table ${schema.tableName}`;
}
