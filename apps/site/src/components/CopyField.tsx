'use client';

import { Button } from '@/components/ui/button';
import { useCopied } from '@/components/useCopied';

import type { CopyFieldProps } from '@/types';

export function CopyField({ value, event }: CopyFieldProps) {
  const { isCopied, copy } = useCopied(event);

  return (
    <div className="flex h-10 min-w-0 items-center gap-1 rounded-lg border border-input bg-white pr-1 pl-3 sm:h-9">
      <span className="font-mono text-ink-quiet select-none">$</span>
      <code className="min-w-0 flex-1 overflow-x-auto font-mono text-[0.8125rem] whitespace-nowrap text-ink-body max-sm:text-xs">
        {value}
      </code>
      <Button variant="ghost" size="xs" onClick={() => copy(value)} aria-live="polite">
        {isCopied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
}
