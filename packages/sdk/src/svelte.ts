import { FIDUCY_KEY_TAG } from './element/constants.ts';
import { defineFiducyKey } from './element/defineFiducyKey.ts';
import { applyElementAttributes, attachFiducyKeyListeners } from './element/listeners.ts';

import type { FiducyKeyActionOptions } from './types.ts';

export function fiducyKey(container: HTMLElement, initialOptions: FiducyKeyActionOptions) {
  defineFiducyKey();
  let options = initialOptions;
  const element = document.createElement(FIDUCY_KEY_TAG);
  applyElementAttributes(element, options);
  const detachListeners = attachFiducyKeyListeners(element, () => options);
  container.append(element);
  return {
    update: (nextOptions: FiducyKeyActionOptions) => {
      options = nextOptions;
      applyElementAttributes(element, options);
    },
    destroy: () => {
      detachListeners();
      element.remove();
    }
  };
}

export type { FiducyKeyActionOptions, GatewayProvider } from './types.ts';
export type { UserKeySummaryView } from './types.ts';
