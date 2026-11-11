'use client';

import { useEffect, useRef } from 'react';

import { LOOP_MS } from '@/lib/isoMotion';

import type { AnimateProps } from '@/types';

export function Animate({ frames, className, children }: AnimateProps) {
  const groupRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const group = groupRef.current;
    if (!group || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = group.animate(frames, {
      duration: LOOP_MS,
      iterations: Number.POSITIVE_INFINITY,
      easing: 'linear'
    });
    return () => animation.cancel();
  }, [frames]);

  return (
    <g ref={groupRef} className={className}>
      {children}
    </g>
  );
}
