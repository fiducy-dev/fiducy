import { ConnectKeyToolUI } from './ConnectKeyToolUI.tsx';
import { CONNECT_KEY_TOOL, PROVIDERS } from './constants.ts';

import type { Toolkit } from '@assistant-ui/react';
import type { FiducyToolkitOptions } from './types.ts';

/**
 * Tools to spread into an assistant-ui toolkit. `connect_api_key` is a human tool: the
 * model (or your server, through `requestKey`) calls it, the thread shows the key box, and
 * the run continues once the user saves a key.
 */
export function fiducyToolkit(options: FiducyToolkitOptions = {}): Toolkit {
  return {
    [CONNECT_KEY_TOOL]: {
      type: 'human',
      description:
        'Ask the user to connect an API key for a model provider. Call it when the user wants to use a provider they have not connected yet.',
      parameters: {
        type: 'object',
        properties: { provider: { type: 'string', enum: PROVIDERS } },
        required: ['provider'],
        additionalProperties: false
      },
      render: (props) => <ConnectKeyToolUI {...props} {...options} />
    }
  };
}
