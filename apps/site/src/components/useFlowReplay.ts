'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { FLOW_STEP_MS } from '@/lib/howItWorks';

export function useFlowReplay(stepCount: number) {
  const ref = useRef<HTMLElement>(null);
  const [step, setStep] = useState(-1);
  const lastStep = stepCount - 1;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStep(lastStep);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setStep((current) => (current < 0 ? 0 : current));
        observer.disconnect();
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [lastStep]);

  useEffect(() => {
    if (step < 0 || step >= lastStep) return;
    const timer = window.setTimeout(() => setStep(step + 1), FLOW_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [step, lastStep]);

  const replay = useCallback(() => setStep(0), []);

  return { ref, step, isDone: step >= lastStep, replay };
}
