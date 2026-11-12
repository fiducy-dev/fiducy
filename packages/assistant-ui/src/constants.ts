import { PROVIDER_LABELS } from '@fiducy/sdk';

import type { GatewayProvider } from '@fiducy/sdk';

/** The tool name the model and the app server use to ask for a key inside the thread. */
export const CONNECT_KEY_TOOL = 'connect_api_key';

/** Tool calls the app server makes itself (not the model) start with this, so they can be dropped later. */
export const SERVER_TOOL_CALL_PREFIX = 'fiducy_';

export { PROVIDER_LABELS };

export const PROVIDERS = Object.keys(PROVIDER_LABELS) as GatewayProvider[];

/** The gateway marks its own failures with this header; the value below means the sealed key is gone. */
export const GATEWAY_ERROR_HEADER = 'x-fiducy-error';
export const KEY_UNAVAILABLE_ERROR = 'key-unavailable';
