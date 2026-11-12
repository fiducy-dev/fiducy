'use client';

import { useEffect, useRef, useState } from 'react';

import { ENCLAVE_STEPS } from '@/lib/constants';
import { startEnclaveRenderer } from '@/lib/enclaveRenderer';

const LABEL_CLASS =
  'pointer-events-none absolute top-0 left-0 rounded-sm bg-white/85 px-1.5 py-0.5 font-mono text-[0.625rem] whitespace-nowrap transition-opacity duration-300';

export function EnclaveCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleLabelRef = useRef<HTMLSpanElement>(null);
  const storedLabelRef = useRef<HTMLSpanElement>(null);
  const requestLabelRef = useRef<HTMLSpanElement>(null);
  const providerLabelRef = useRef<HTMLSpanElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const handleHalf = handleLabelRef.current;
    const storedHalf = storedLabelRef.current;
    const request = requestLabelRef.current;
    const provider = providerLabelRef.current;
    if (!host || !canvas || !handleHalf || !storedHalf || !request || !provider) return;
    return startEnclaveRenderer(
      canvas,
      host,
      { handleHalf, storedHalf, request, provider },
      setStep
    );
  }, []);

  return (
    <div className="absolute inset-0 grid grid-rows-[minmax(0,1fr)_auto] gap-3">
      <div ref={hostRef} className="relative cursor-grab active:cursor-grabbing">
        <canvas ref={canvasRef} className="block size-full touch-pan-y" />
        <span ref={handleLabelRef} className={`${LABEL_CLASS} -translate-x-1/2 -translate-y-full`}>
          half 1 · lives with you
        </span>
        <span ref={storedLabelRef} className={`${LABEL_CLASS} -translate-x-1/2 text-ink-muted`}>
          half 2 · lives with us
        </span>
        <span ref={requestLabelRef} className={`${LABEL_CLASS} -translate-x-1/2 max-sm:hidden`}>
          one call to <span ref={providerLabelRef}>OpenAI</span>
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
