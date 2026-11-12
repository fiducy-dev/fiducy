'use client';

import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useCopied } from '@/components/useCopied';
import { cn } from '@/lib/utils';

import type { PromptEditorProps } from '@/types';

export function PromptEditor({ prompt }: PromptEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const { isCopied, copy } = useCopied('copy_setup_prompt');
  const editorID = useId();
  const text = draft ?? prompt;
  const isEdited = draft !== null && draft !== prompt;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-lg border border-frame">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 px-3.5 py-3">
        <div className="grid min-w-0 flex-1 basis-48 gap-0.5">
          <span className="text-sm font-medium text-ink">Prompt for your agent</span>
          <span className="text-xs text-ink-muted">
            {isEdited ? 'Edited by you' : 'Tailored to your stack'}
          </span>
        </div>
        <div className="flex items-center gap-2 max-sm:grid max-sm:w-full max-sm:grid-cols-[minmax(0,1fr)]">
          <Button
            variant="outline"
            aria-expanded={isOpen}
            aria-controls={editorID}
            onClick={() => setIsOpen((current) => !current)}
          >
            {isOpen ? 'Hide' : 'View and edit'}
            <ChevronDown className={cn('transition-transform', isOpen && 'rotate-180')} />
          </Button>
          <Button onClick={() => copy(text)} aria-live="polite" className="max-sm:order-first">
            {isCopied ? 'Prompt copied' : 'Copy prompt'}
          </Button>
        </div>
      </div>
      {isOpen ? (
        <div id={editorID} className="grid gap-2 border-t border-frame bg-wash p-3">
          <textarea
            aria-label="Prompt for your agent"
            value={text}
            onChange={(event) => setDraft(event.target.value)}
            spellCheck={false}
            className="h-72 w-full resize-y rounded-md border border-input bg-white p-3 font-mono text-xs leading-relaxed text-ink-body focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
          />
          {isEdited ? (
            <Button
              variant="ghost"
              size="xs"
              className="justify-self-start"
              onClick={() => setDraft(null)}
            >
              Reset to the generated prompt
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
