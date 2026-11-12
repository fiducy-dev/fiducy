'use client';

import { useEffect, useRef, useState } from 'react';

import { FLOW_REST_STAGE, FLOW_STAGES } from '@/lib/flowFigure';
import { LOOP_MS } from '@/lib/isoMotion';

const POLL_MS = 120;

function visibleClock(root: HTMLElement): number | null {
  for (const svg of root.querySelectorAll('svg')) {
    if (svg.getBoundingClientRect().width === 0) continue;
    const time = svg.getAnimations({ subtree: true })[0]?.currentTime;
    if (typeof time === 'number') return time % LOOP_MS;
  }
  return null;
}

export function useFlowReadout() {
  const ref = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(FLOW_REST_STAGE);

  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      const time = visibleClock(root);
      if (time === null) return;
      const next = FLOW_STAGES.findIndex((item) => time < item.until);
      setStage((current) => (next >= 0 && next !== current ? next : current));
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return { ref, text: FLOW_STAGES[stage]?.text ?? '' };
}
