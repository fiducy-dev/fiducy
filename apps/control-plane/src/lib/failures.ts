import type { ControlFailure } from './types';

export function describeFailure(status: number, message: string): ControlFailure {
  return { status, message };
}

export const APP_NOT_FOUND = describeFailure(404, 'App not found');

export const APP_SECRET_NOT_VALID = describeFailure(401, 'This app secret is not valid');

export const KEY_NOT_FOUND = describeFailure(404, 'Key not found');

export const GATEWAY_UNAVAILABLE = describeFailure(
  502,
  'Gateway unreachable, so the key is still active. Try again'
);
