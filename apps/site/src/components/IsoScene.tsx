'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import type { IsoSceneProps } from '@/types';

const SCENE_WIDTH = 300;
const SCENE_HEIGHT = 175;
const SCENE_RATIO = SCENE_WIDTH / SCENE_HEIGHT;
const SCENE_PADDING = 8;

export function IsoScene({ children }: IsoSceneProps) {
  const sceneRef = useRef<SVGGElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [viewBox, setViewBox] = useState(
    `${-SCENE_WIDTH / 2} ${-SCENE_HEIGHT / 2} ${SCENE_WIDTH} ${SCENE_HEIGHT}`
  );

  useLayoutEffect(() => {
    if (!isMounted) {
      setIsMounted(true);
      return;
    }
    const bounds = sceneRef.current?.getBBox();
    if (!bounds || bounds.width === 0) return;
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const width = Math.max(
      SCENE_WIDTH,
      bounds.width + SCENE_PADDING,
      (bounds.height + SCENE_PADDING) * SCENE_RATIO
    );
    const height = width / SCENE_RATIO;
    setViewBox(`${centerX - width / 2} ${centerY - height / 2} ${width} ${height}`);
  }, [isMounted]);

  return (
    <svg
      className="h-[clamp(190px,24vh,260px)] w-full overflow-visible stroke-ink [stroke-linejoin:round] max-md:h-[200px]"
      viewBox={viewBox}
      aria-hidden="true"
    >
      <g ref={sceneRef}>{isMounted ? children : null}</g>
    </svg>
  );
}
