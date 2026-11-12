'use client';

import { useEffect, useRef, useState } from 'react';

import { useMotionAllowed } from '@/components/useMotionAllowed';
import {
  CIPHER_FRAME_MILLISECONDS,
  CIPHER_SETTLED_EVERY,
  CIPHER_TOUCH_HOLD_MILLISECONDS,
  encipher,
  moveToward,
  pixelNoise
} from '@/lib/cipher';

import type { CipherWordProps } from '@/types';
import type { PointerEvent } from 'react';

export function CipherWord({ word, isHinted }: CipherWordProps) {
  const isMotionAllowed = useMotionAllowed();
  const [isHeld, setIsHeld] = useState(false);
  const [progress, setProgress] = useState(0);
  const [glyphs, setGlyphs] = useState(word);
  const [noise, setNoise] = useState('none');
  const progressRef = useRef(0);
  const releaseRef = useRef(0);
  const isSealed = isHeld || isHinted;

  useEffect(() => {
    if (!isMotionAllowed) {
      progressRef.current = isSealed ? 1 : 0;
      setProgress(progressRef.current);
      setGlyphs(encipher(word, progressRef.current));
      setNoise(pixelNoise(word));
      return;
    }
    let tick = 0;
    const timer = window.setInterval(() => {
      tick += 1;
      const isSettled = progressRef.current === 1 && isSealed;
      if (isSettled && tick % CIPHER_SETTLED_EVERY !== 0) return;
      progressRef.current = moveToward(progressRef.current, isSealed);
      setProgress(progressRef.current);
      setGlyphs(encipher(word, progressRef.current));
      setNoise(pixelNoise(word));
      if (!isSealed && progressRef.current === 0) window.clearInterval(timer);
    }, CIPHER_FRAME_MILLISECONDS);
    return () => window.clearInterval(timer);
  }, [isSealed, isMotionAllowed, word]);

  useEffect(() => () => window.clearTimeout(releaseRef.current), []);

  function hover(event: PointerEvent, isEntering: boolean) {
    if (event.pointerType === 'mouse') setIsHeld(isEntering);
  }

  function tap(event: PointerEvent) {
    if (event.pointerType === 'mouse') return;
    setIsHeld(true);
    window.clearTimeout(releaseRef.current);
    releaseRef.current = window.setTimeout(() => setIsHeld(false), CIPHER_TOUCH_HOLD_MILLISECONDS);
  }

  const isVisible = progress > 0;
  const isMoving = isVisible && progress < 1;
  const front = `${progress * 100}%`;

  return (
    <span
      className="relative inline-block cursor-crosshair touch-manipulation"
      onPointerEnter={(event) => hover(event, true)}
      onPointerLeave={(event) => hover(event, false)}
      onPointerDown={tap}
    >
      <span style={isVisible ? { clipPath: `inset(0 0 0 ${front})` } : undefined}>{word}</span>
      {isVisible ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 inset-y-[0.12em] bg-size-[100%_100%]"
          style={{ backgroundImage: noise, clipPath: `inset(0 calc(100% - ${front}) 0 0)` }}
        />
      ) : null}
      {isVisible ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden font-mono text-[0.62em] font-light tracking-[0.08em] text-ink-body whitespace-pre select-none"
        >
          {glyphs}
        </span>
      ) : null}
      {isMoving ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-[0.12em] w-px bg-ink"
          style={{ left: front }}
        />
      ) : null}
    </span>
  );
}
