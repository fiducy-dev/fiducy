import { isPCR } from './pcr.ts';

import type { VerifyAttestationInput, VerifyNitroAttestationInput } from './types.ts';

function requireBytes(value: unknown, name: string): void {
  if (!(value instanceof Uint8Array)) throw new TypeError(`${name} must be a Uint8Array`);
}

function requirePCRList(list: unknown, name: string, isEmptyAllowed: boolean): void {
  if (!Array.isArray(list) || (!isEmptyAllowed && list.length === 0)) {
    throw new TypeError(`${name} must list at least one PCR`);
  }
  if (!list.every((measurement) => typeof measurement === 'string' && isPCR(measurement))) {
    throw new TypeError(`${name} must hold 96-character hex SHA-384 measurements`);
  }
}

export function assertAttestationInput(input: VerifyAttestationInput): void {
  requireBytes(input.document, 'document');
  requireBytes(input.nonce, 'nonce');
  if (input.nonce.length === 0) throw new TypeError('nonce must not be empty');
  requirePCRList(input.expectedPCR0s, 'expectedPCR0s', false);
  if (input.expectedPCR16s !== undefined) {
    requirePCRList(input.expectedPCR16s, 'expectedPCR16s', true);
  }
}

export function assertNitroAttestationInput(input: VerifyNitroAttestationInput): void {
  requirePCRList(input.expectedPCR16s, 'expectedPCR16s', false);
}
