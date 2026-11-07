export { GATEWAY_ERROR_HEADER, GATEWAY_FAILURE_ERROR } from './constants.ts';
export { KEY_UNAVAILABLE_ERROR, SEALED_RECORD_FIELDS } from './constants.ts';
export { combineShares, decryptSecret, encryptSecret } from './crypto.ts';
export { generateDataKey, splitDataKey } from './crypto.ts';
export { createHandle, generateKeyID, parseHandle } from './handle.ts';
export { createLocalKeyWrapper } from './keyWrapper.ts';
export { fail, succeed } from './result.ts';
export { openSecret, sealSecret } from './seal.ts';

export type { Bytes, KeyWrapper, OpenSecretError, Result } from './types.ts';
export type { SealedRecord, SealSecretResult } from './types.ts';
