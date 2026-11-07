import { createElement, useEffect, useRef } from 'react';

import { FIDUCY_KEY_TAG } from './element/constants.ts';
import { defineFiducyKey } from './element/defineFiducyKey.ts';
import { attachFiducyKeyListeners, toElementAttributes } from './element/listeners.ts';

import type { FiducyKeyProps } from './types.ts';

export function FiducyKey({
  onConnected,
  onRemoved,
  onError,
  className,
  ...options
}: FiducyKeyProps) {
  const elementRef = useRef<HTMLElement>(null);
  const handlersRef = useRef({ onConnected, onRemoved, onError });
  handlersRef.current = { onConnected, onRemoved, onError };

  useEffect(() => {
    defineFiducyKey();
    const element = elementRef.current;
    if (!element) return;
    return attachFiducyKeyListeners(element, () => handlersRef.current);
  }, []);

  return createElement(FIDUCY_KEY_TAG, {
    ref: elementRef,
    className,
    ...toElementAttributes(options)
  });
}
