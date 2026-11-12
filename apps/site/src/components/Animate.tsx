'use client';

import { useEffect, useRef } from 'react';

import { LOOP_CLOCK } from '@/lib/isoMotion';

import type { AnimateProps } from '@/types';

export function Animate({ frames, clock = LOOP_CLOCK, className, children }: AnimateProps) {
  const groupRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const group = groupRef.current;
    if (!group || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = group.animate(frames, {
      duration: clock.span,
      delay: clock.delay ?? 0,
      iterations: clock.isOnce ? 1 : Number.POSITIVE_INFINITY,
      fill: 'both',
      easing: 'linear'
    });
    return () => animation.cancel();
  }, [frames, clock]);

  return (
    <g ref={groupRef} className={className}>
      {children}
    </g>
  );
}
