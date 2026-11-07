import { relative } from 'node:path';

import { loadFiducy } from '../config/loadFiducy.ts';

import type { Output, StorageSchema } from '../types.ts';

export const NO_SCHEMA_MESSAGE =
  'Your Fiducy storage has no table to generate. kyselyStorage, drizzleStorage and prismaStorage from @fiducy/sdk/storage/* have one; a key-value or custom storage does not need it.';

export async function loadStorageSchema(
  root: string,
  configPath: string | undefined,
  output: Output
): Promise<StorageSchema | null> {
  const { file, schema } = await loadFiducy(root, configPath);
  output.info(`Loaded ${relative(root, file)}`);
  if (!schema) output.error(NO_SCHEMA_MESSAGE);
  return schema;
}

export function describeSchema(schema: StorageSchema): string {
  return `${schema.adapter} storage, ${schema.dialect}, table ${schema.tableName}`;
}
