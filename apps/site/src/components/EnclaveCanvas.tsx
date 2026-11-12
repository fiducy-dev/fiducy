'use client';

import { useEffect, useRef, useState } from 'react';

import { ENCLAVE_STEPS } from '@/lib/constants';
import { startEnclaveRenderer } from '@/lib/enclaveRenderer';

const LABEL_CLASS =
  'pointer-events-none absolute top-0 left-0 -translate-x-1/2 translate-y-2 rounded-sm bg-white/85 px-1.5 py-0.5 font-mono text-[0.625rem] whitespace-nowrap';

export function EnclaveCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appLabelRef = useRef<HTMLSpanElement>(null);
  const storeLabelRef = useRef<HTMLSpanElement>(null);
  const providerLabelRef = useRef<HTMLSpanElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const app = appLabelRef.current;
    const store = storeLabelRef.current;
    const provider = providerLabelRef.current;
    if (!host || !canvas || !app || !store || !provider) return;
    return startEnclaveRenderer(canvas, host, { app, store, provider }, setStep);
  }, []);

  return (
    <div className="absolute inset-0 grid grid-rows-[minmax(0,1fr)_auto] gap-3">
      <div ref={hostRef} className="relative cursor-grab active:cursor-grabbing">
        <canvas ref={canvasRef} className="block size-full touch-pan-y" />
        <span ref={appLabelRef} className={LABEL_CLASS}>
          your app<span className="max-sm:hidden"> · half 1</span>
        </span>
        <span ref={storeLabelRef} className={`${LABEL_CLASS} text-ink-muted`}>
          fiducy<span className="max-sm:hidden"> · half 2</span>
        </span>
        <span ref={providerLabelRef} className={LABEL_CLASS}>
          OpenAI
        </span>
      </div>
      <p className="flex min-h-[3em] gap-3 text-sm leading-[1.5] text-ink-body">
        <span className="shrink-0 font-mono text-xs leading-[1.75] text-ink-muted">
          0{step + 1}/0{ENCLAVE_STEPS.length}
        </span>
        <span key={step} className="animate-rise-in text-pretty motion-reduce:animate-none">
          {ENCLAVE_STEPS[step]}
        </span>
      </p>
    </div>
  );
}
