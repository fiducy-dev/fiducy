'use client';

import { useState } from 'react';

import { trackEvent } from '@/lib/analytics';

const COPIED_RESET_MILLISECONDS = 1600;

export function useCopied(event: string) {
  const [isCopied, setIsCopied] = useState(false);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text).catch(() => null);
    trackEvent(event);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), COPIED_RESET_MILLISECONDS);
  };

  return { isCopied, copy };
}
