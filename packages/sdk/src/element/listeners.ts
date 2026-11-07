import { FIDUCY_KEY_ATTRIBUTES, FIDUCY_KEY_EVENTS } from './constants.ts';

import type { FiducyErrorDetail, FiducyKeyHandlers, FiducyKeyOptions } from '../types.ts';
import type { FiducyRemovedDetail } from '../types.ts';
import type { UserKeySummaryView } from '../types.ts';

function readDetail<T>(event: Event): T {
  return (event as CustomEvent<T>).detail;
}

export function attachFiducyKeyListeners(
  element: HTMLElement,
  readHandlers: () => FiducyKeyHandlers
): () => void {
  const handleConnected = (event: Event) =>
    readHandlers().onConnected?.(readDetail<UserKeySummaryView>(event));
  const handleRemoved = (event: Event) =>
    readHandlers().onRemoved?.(readDetail<FiducyRemovedDetail>(event).keyID);
  const handleError = (event: Event) =>
    readHandlers().onError?.(readDetail<FiducyErrorDetail>(event).message);
  element.addEventListener(FIDUCY_KEY_EVENTS.connected, handleConnected);
  element.addEventListener(FIDUCY_KEY_EVENTS.removed, handleRemoved);
  element.addEventListener(FIDUCY_KEY_EVENTS.error, handleError);
  return () => {
    element.removeEventListener(FIDUCY_KEY_EVENTS.connected, handleConnected);
    element.removeEventListener(FIDUCY_KEY_EVENTS.removed, handleRemoved);
    element.removeEventListener(FIDUCY_KEY_EVENTS.error, handleError);
  };
}

export function toElementAttributes({
  provider,
  basePath,
  gatewayURL,
  appID
}: FiducyKeyOptions): Record<string, string> {
  const attributes: Record<string, string> = { provider };
  if (basePath) attributes['base-path'] = basePath;
  if (gatewayURL) attributes['gateway-url'] = gatewayURL;
  if (appID) attributes['app-id'] = appID;
  return attributes;
}

export function applyElementAttributes(element: HTMLElement, options: FiducyKeyOptions) {
  const attributes = toElementAttributes(options);
  for (const name of FIDUCY_KEY_ATTRIBUTES) {
    const value = attributes[name];
    if (value === undefined) element.removeAttribute(name);
    else if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }
}
