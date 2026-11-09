import { SETUP_QUESTIONS, SETUP_STEPS } from '@/lib/setupOptions';
import { describeAnswer } from '@/lib/setupPrompt';
import { cn } from '@/lib/utils';

import type { SetupRailProps } from '@/types';

export function SetupRail({ current, answers, onJump }: SetupRailProps) {
  const progress = `${((current + 1) / SETUP_STEPS.length) * 100}%`;

  return (
    <aside className="grid content-start gap-4 border-frame bg-wash/60 p-5 max-lg:border-b lg:border-r lg:p-6">
      <p className="font-mono text-[0.6875rem] tracking-[0.04em] text-ink-muted uppercase">
        Step {current + 1} of {SETUP_STEPS.length}
      </p>
      <div className="h-0.5 bg-frame lg:hidden">
        <div
          className="h-full bg-ink transition-[width] duration-300"
          style={{ width: progress }}
        />
      </div>
      <ol className="grid gap-1 max-lg:hidden">
        {SETUP_STEPS.map((step, index) => {
          const question = SETUP_QUESTIONS[index];
          const isReachable = index <= current;
          return (
            <li key={step}>
              <button
                type="button"
                disabled={!isReachable}
                onClick={() => onJump(index)}
                aria-current={index === current ? 'step' : undefined}
                className={cn(
                  'grid w-full gap-0.5 border-l py-1.5 pl-3 text-left disabled:cursor-default',
                  index === current ? 'border-ink' : 'border-frame',
                  isReachable ? 'cursor-pointer' : 'opacity-50'
                )}
              >
                <span className="text-sm font-medium text-ink">{step}</span>
                {question && index < current ? (
                  <span className="truncate text-xs text-ink-muted">
                    {describeAnswer(answers, question.id)}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
