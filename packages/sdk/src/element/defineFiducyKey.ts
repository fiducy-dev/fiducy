import { FIDUCY_KEY_TAG } from './constants.ts';
import { createFiducyKeyElement } from './createFiducyKeyElement.ts';

export function defineFiducyKey(): void {
  if (typeof customElements === 'undefined') return;
  if (customElements.get(FIDUCY_KEY_TAG)) return;
  customElements.define(FIDUCY_KEY_TAG, createFiducyKeyElement());
}
