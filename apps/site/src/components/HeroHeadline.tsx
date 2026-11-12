'use client';

import { useEffect, useState } from 'react';

import { CipherWord } from '@/components/CipherWord';
import { Emphasis } from '@/components/Emphasis';
import { useMotionAllowed } from '@/components/useMotionAllowed';

const SEALED_WORDS = ['You', 'never', 'hold', 'them.'];
const EMPHASIS_WORD = 'never';
const HINT_DELAY_MILLISECONDS = 1100;
const HINT_STAGGER_MILLISECONDS = 160;
const HINT_HOLD_MILLISECONDS = 900;

export function HeroHeadline() {
  const isMotionAllowed = useMotionAllowed();
  const [hinted, setHinted] = useState<number[]>([]);

  useEffect(() => {
    if (!isMotionAllowed) return;
    const timers = SEALED_WORDS.flatMap((_, index) => {
      const sealsAt = HINT_DELAY_MILLISECONDS + index * HINT_STAGGER_MILLISECONDS;
      return [
        window.setTimeout(() => setHinted((current) => [...current, index]), sealsAt),
        window.setTimeout(
          () => setHinted((current) => current.filter((item) => item !== index)),
          sealsAt + HINT_HOLD_MILLISECONDS
        )
      ];
    });
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [isMotionAllowed]);

  return (
    <h1 className="grid text-[min(4rem,10.6cqi)] leading-[1.06] font-bold tracking-[-0.05em] whitespace-nowrap">
      <span className="animate-rise-in text-ink-quiet">
        <Emphasis text="Users bring keys." word="keys" />
      </span>
      <span className="animate-rise-in text-ink-quiet [animation-delay:120ms]">
        {SEALED_WORDS.map((word, index) => (
          <span key={word}>
            {index > 0 ? ' ' : null}
            <span className={word === EMPHASIS_WORD ? 'text-emphasis' : undefined}>
              <CipherWord word={word} isHinted={hinted.includes(index)} />
            </span>
          </span>
        ))}
      </span>
    </h1>
  );
}
