'use client';

import { useEffect, useRef, useState } from 'react';

import { CALL_MS, CALL_STAGES, FLOW_REST_TEXT, SETUP_MS, SETUP_STAGES } from '@/lib/flowFigure';

const POLL_MS = 120;

function visibleClock(root: HTMLElement): number | null {
  for (const svg of root.querySelectorAll('svg')) {
    if (svg.getBoundingClientRect().width === 0) continue;
    let latest: number | null = null;
    for (const animation of svg.getAnimations({ subtree: true })) {
      const time = animation.currentTime;
      if (typeof time === 'number' && (latest === null || time > latest)) latest = time;
    }
    return latest;
  }
  return null;
}

function readout(time: number): string {
  if (time < SETUP_MS) return SETUP_STAGES.find((stage) => time < stage.until)?.text ?? '';
  const elapsed = time - SETUP_MS;
  const call = Math.floor(elapsed / CALL_MS) + 1;
  const phase = elapsed % CALL_MS;
  const stage = CALL_STAGES.find((item) => phase < item.until);
  return `Call ${call} · ${stage?.text ?? ''}`;
}

export function useFlowReadout() {
  const ref = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(FLOW_REST_TEXT);

  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      const time = visibleClock(root);
      if (time !== null) setText(readout(time));
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return { ref, text };
}
