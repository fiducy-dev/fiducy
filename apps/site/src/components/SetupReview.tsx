'use client';

import { CopyField } from '@/components/CopyField';
import { Button } from '@/components/ui/button';
import { useCopied } from '@/components/useCopied';
import { SETUP_QUESTIONS } from '@/lib/setupOptions';
import { buildInitCommand, buildSetupPrompt, describeAnswer } from '@/lib/setupPrompt';
import { listDocsPages } from '@/lib/setupPrompt';
import { NEW_TAB } from '@/lib/site';

import type { SetupReviewProps } from '@/types';

const HEADING_CLASS = 'text-sm font-medium text-ink';

function Summary({ answers, onJump }: SetupReviewProps) {
  return (
    <dl className="grid grid-cols-[minmax(0,1fr)] divide-y divide-frame rounded-lg border border-frame">
      {SETUP_QUESTIONS.map((question, index) => (
        <div
          key={question.id}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3.5 py-2.5"
        >
          <dt className="text-xs text-ink-muted">{question.step}</dt>
          <dd className="col-start-1 truncate text-sm text-ink">
            {describeAnswer(answers, question.id)}
          </dd>
          <Button
            variant="ghost"
            size="xs"
            className="col-start-2 row-span-2 row-start-1"
            onClick={() => onJump(index)}
          >
            Change
          </Button>
        </div>
      ))}
    </dl>
  );
}

export function SetupReview({ answers, onJump }: SetupReviewProps) {
  const prompt = buildSetupPrompt(answers);
  const { isCopied, copy } = useCopied('copy_setup_prompt');

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
      <div className="grid gap-1.5">
        <h2 className="text-lg font-semibold tracking-[-0.02em]">Hand it to your agent</h2>
        <p className="text-sm text-ink-muted">
          Paste the prompt into Claude Code, Cursor or Codex, opened in your app's folder. It runs
          the command below, wires the rest, and never asks you for a secret.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 sm:flex-1">
          <CopyField value={buildInitCommand(answers)} event="copy_setup_command" />
        </div>
        <Button onClick={() => copy(prompt)} aria-live="polite" className="shrink-0 max-sm:h-10">
          {isCopied ? 'Prompt copied' : 'Copy prompt'}
        </Button>
      </div>
      <Summary answers={answers} onJump={onJump} />
      <div className="grid gap-2">
        <h3 className={HEADING_CLASS}>Docs for your stack</h3>
        <ul className="grid gap-1 text-sm">
          {listDocsPages(answers).map((page) => (
            <li key={page}>
              <a
                className="text-ink-muted underline underline-offset-4 hover:text-ink"
                href={page}
                {...NEW_TAB}
              >
                {page.replace('https://', '')}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
