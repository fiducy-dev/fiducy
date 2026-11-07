import { defineFiducyKey } from './element/defineFiducyKey.ts';

defineFiducyKey();

export { FIDUCY_KEY_EVENTS, FIDUCY_KEY_TAG } from './element/constants.ts';
export { defineFiducyKey } from './element/defineFiducyKey.ts';
export { FIDUCY_KEYS_CHANGED } from './keysApi.ts';

export type { FiducyErrorDetail, FiducyKeyState, FiducyRemovedDetail } from './types.ts';
export type { GatewayProvider, UserKeySummaryView } from './types.ts';
