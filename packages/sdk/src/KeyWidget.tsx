import { mountKeyWidget } from '@fiducy/widget';
import { useEffect, useRef } from 'react';

import type { KeyWidgetProps } from './types.ts';

export function KeyWidget({
  gatewayURL,
  appID,
  enclavePCR0,
  enclavePCR16,
  skipAttestation,
  onHandle,
  onError,
  className
}: KeyWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onHandleRef = useRef(onHandle);
  const onErrorRef = useRef(onError);
  onHandleRef.current = onHandle;
  onErrorRef.current = onError;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const widget = mountKeyWidget({
      gatewayURL,
      appID,
      enclavePCR0,
      enclavePCR16,
      skipAttestation,
      container,
      onHandle: (handle, record) => onHandleRef.current(handle, record),
      onError: (message) => onErrorRef.current?.(message)
    });
    return widget.unmount;
  }, [gatewayURL, appID, enclavePCR0, enclavePCR16, skipAttestation]);

  return <div ref={containerRef} className={className} />;
}
