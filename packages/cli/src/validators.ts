import type { AuthName, DevState, FrameworkName, StorageName, StorageSchema } from './types.ts';

const FRAMEWORK_NAMES: FrameworkName[] = [
  'next',
  'tanstack-start',
  'react-router',
  'sveltekit',
  'nuxt',
  'farmjs',
  'express',
  'hono',
  'node'
];
const AUTH_NAMES: AuthName[] = ['better-auth', 'authjs', 'clerk', 'none'];
const STORAGE_NAMES: StorageName[] = ['prisma', 'drizzle', 'kysely', 'sqlite'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isFrameworkName(value: unknown): value is FrameworkName {
  return FRAMEWORK_NAMES.includes(value as FrameworkName);
}

export function isAuthName(value: unknown): value is AuthName {
  return AUTH_NAMES.includes(value as AuthName);
}

export function isStorageName(value: unknown): value is StorageName {
  return STORAGE_NAMES.includes(value as StorageName);
}

export function isDevState(value: unknown): value is DevState {
  if (!isRecord(value)) return false;
  const { appID, appSecret, masterKey, port } = value;
  return (
    typeof appID === 'string' &&
    typeof appSecret === 'string' &&
    typeof masterKey === 'string' &&
    Number.isInteger(port)
  );
}

export function isStorageSchema(value: unknown): value is StorageSchema {
  if (!isRecord(value)) return false;
  return (
    typeof value.adapter === 'string' &&
    typeof value.dialect === 'string' &&
    typeof value.tableName === 'string' &&
    typeof value.generate === 'function'
  );
}

export function readFiducySchema(value: unknown): StorageSchema | null | undefined {
  if (!isRecord(value) || typeof value.handler !== 'function' || !isRecord(value.storage)) {
    return undefined;
  }
  return isStorageSchema(value.storage.schema) ? value.storage.schema : null;
}

export function isPort(value: number): boolean {
  return Number.isInteger(value) && value > 0 && value < 65536;
}

export function isOrigin(value: string): boolean {
  const url = URL.parse(value);
  if (!url || url.origin !== value) return false;
  return url.protocol === 'http:' || url.protocol === 'https:';
}
