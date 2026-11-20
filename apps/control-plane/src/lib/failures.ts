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

export const TWO_FACTOR_NOT_SET_UP = describeFailure(403, 'Set up two-factor first');

export const TWO_FACTOR_ALREADY_ON = describeFailure(409, 'Two-factor is already on');

export const TWO_FACTOR_CODE_NOT_VALID = describeFailure(
  403,
  'That code did not work. Try the next one'
);

export const TWO_FACTOR_LOCKED = describeFailure(
  429,
  'Too many wrong codes. Try again in 5 minutes'
);
