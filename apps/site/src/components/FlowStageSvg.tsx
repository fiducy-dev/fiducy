'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { FLOW_RATE } from '@/lib/flowFigure';

import type { FlowStageSvgProps } from '@/types';

const PADDING = 12;
const HOVER_RATE = FLOW_RATE * 0.35;

function eachAnimation(svg: SVGSVGElement | null, apply: (animation: Animation) => void) {
  for (const animation of svg?.getAnimations({ subtree: true }) ?? []) apply(animation);
}

export function FlowStageSvg({ className, children }: FlowStageSvgProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const sceneRef = useRef<SVGGElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [viewBox, setViewBox] = useState('0 0 100 100');

  useLayoutEffect(() => {
    if (!isMounted) {
      setIsMounted(true);
      return;
    }
    const bounds = sceneRef.current?.getBBox();
    if (!bounds || bounds.width === 0) return;
    setViewBox(
      `${bounds.x - PADDING} ${bounds.y - PADDING} ${bounds.width + PADDING * 2} ${bounds.height + PADDING * 2}`
    );
  }, [isMounted]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !isMounted) return;
    eachAnimation(svg, (animation) => animation.updatePlaybackRate(FLOW_RATE));
    const observer = new IntersectionObserver(([entry]) => {
      eachAnimation(svg, (animation) => {
        if (!entry?.isIntersecting) animation.pause();
        else if (animation.playState === 'paused') animation.play();
      });
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, [isMounted]);

  return (
    <svg
      ref={svgRef}
      onPointerEnter={() =>
        eachAnimation(svgRef.current, (animation) => animation.updatePlaybackRate(HOVER_RATE))
      }
      onPointerLeave={() =>
        eachAnimation(svgRef.current, (animation) => animation.updatePlaybackRate(FLOW_RATE))
      }
      className={`h-auto overflow-visible stroke-ink [stroke-linejoin:round] ${className}`}
      viewBox={viewBox}
      aria-hidden="true"
    >
      <g ref={sceneRef}>{isMounted ? children : null}</g>
    </svg>
  );
}
