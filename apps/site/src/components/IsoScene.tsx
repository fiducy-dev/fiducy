'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { IsoSceneProps } from '@/types';

const SCENE_WIDTH = 300;
const SCENE_HEIGHT = 175;
const SCENE_RATIO = SCENE_WIDTH / SCENE_HEIGHT;
const SCENE_PADDING = 8;
const HOVER_RATE = 0.35;

function eachAnimation(svg: SVGSVGElement | null, apply: (animation: Animation) => void) {
  for (const animation of svg?.getAnimations({ subtree: true }) ?? []) apply(animation);
}

export function IsoScene({ children }: IsoSceneProps) {
  const svgRef = useRef<SVGSVGElement>(null);
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

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new IntersectionObserver(([entry]) => {
      eachAnimation(svg, (animation) =>
        entry?.isIntersecting ? animation.play() : animation.pause()
      );
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      ref={svgRef}
      onPointerEnter={() =>
        eachAnimation(svgRef.current, (animation) => animation.updatePlaybackRate(HOVER_RATE))
      }
      onPointerLeave={() =>
        eachAnimation(svgRef.current, (animation) => animation.updatePlaybackRate(1))
      }
      className="h-[clamp(190px,24vh,260px)] w-full overflow-visible stroke-ink [stroke-linejoin:round] max-md:h-[200px]"
      viewBox={viewBox}
      aria-hidden="true"
    >
      <g ref={sceneRef}>{isMounted ? children : null}</g>
    </svg>
  );
}
