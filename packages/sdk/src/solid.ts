import { createRenderEffect, onCleanup } from 'solid-js';

import { FIDUCY_KEY_TAG } from './element/constants.ts';
import { defineFiducyKey } from './element/defineFiducyKey.ts';
import { applyElementAttributes, attachFiducyKeyListeners } from './element/listeners.ts';

import type { FiducyKeyProps } from './types.ts';

export function FiducyKey(props: FiducyKeyProps): HTMLElement {
  defineFiducyKey();
  const element = document.createElement(FIDUCY_KEY_TAG);
  createRenderEffect(() => {
    applyElementAttributes(element, props);
    if (props.className) element.className = props.className;
  });
  onCleanup(attachFiducyKeyListeners(element, () => props));
  return element;
}

export type { FiducyKeyProps, GatewayProvider, UserKeySummaryView } from './types.ts';
