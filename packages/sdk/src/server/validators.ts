import { SEALED_RECORD_FIELDS } from '@fiducy/core';

import { PROVIDER_BASE_PATHS } from '../constants.ts';
import { FiducyInputError } from './errors.ts';

import type { SealedRecord } from '@fiducy/core';
import type { GatewayProvider } from '../types.ts';
import type { KeySource } from './types.ts';
import type { SaveKeyInput } from './types.ts';

export function isProvider(value: unknown): value is GatewayProvider {
  return typeof value === 'string' && Object.hasOwn(PROVIDER_BASE_PATHS, value);
}

export function isKeySource(value: unknown): value is KeySource {
  return value === 'widget' || value === 'import';
}

export function isSealedRecord(value: unknown): value is SealedRecord {
  if (typeof value !== 'object' || value === null) return false;
  const fields = value as Record<string, unknown>;
  return SEALED_RECORD_FIELDS.every((field) => typeof fields[field] === 'string');
}

export function readSaveKeyInput(body: unknown): SaveKeyInput {
  if (typeof body !== 'object' || body === null) throw new FiducyInputError('Send a JSON body');
  const { provider, handle, record } = body as Record<string, unknown>;
  if (!isProvider(provider)) throw new FiducyInputError('Unknown provider');
  if (typeof handle !== 'string') throw new FiducyInputError('handle is required');
  if (record !== undefined && !isSealedRecord(record)) {
    throw new FiducyInputError('The sealed record is malformed');
  }
  return { provider, handle, record };
}
