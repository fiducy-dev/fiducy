import type { ControlFailure } from './types';

export function describeFailure(status: number, message: string): ControlFailure {
  return { status, message };
}

export const APP_NOT_FOUND = describeFailure(404, 'No app with this ID belongs to your account');

export const APP_SECRET_NOT_VALID = describeFailure(401, 'This app secret is not valid');

export const KEY_NOT_FOUND = describeFailure(404, 'No key with this ID belongs to this app');

export const GATEWAY_UNAVAILABLE = describeFailure(
  502,
  'The gateway could not delete the sealed key, so it stays active. Try again in a moment'
);
