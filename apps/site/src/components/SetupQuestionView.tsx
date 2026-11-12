import { cn } from '@/lib/utils';

import type { SetupQuestionProps } from '@/types';

const TILE_CLASS =
  'grid min-h-16 cursor-pointer content-center gap-0.5 rounded-lg border px-3.5 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

export function SetupQuestionView({ question, chosen, onChoose }: SetupQuestionProps) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
      <div className="grid gap-1.5">
        <h2 className="text-lg font-semibold tracking-[-0.02em]">{question.title}</h2>
        <p className="text-sm text-ink-muted">{question.helper}</p>
      </div>
      <div
        role={question.isMultiple ? 'group' : 'radiogroup'}
        aria-label={question.title}
        className="grid grid-cols-2 gap-2"
      >
        {question.options.map((option) => {
          const isChosen = chosen.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              role={question.isMultiple ? 'checkbox' : 'radio'}
              aria-checked={isChosen}
              onClick={() => onChoose(option.id)}
              className={cn(
                TILE_CLASS,
                isChosen ? 'border-ink bg-wash' : 'border-frame hover:border-ink-quiet'
              )}
            >
              <span className="text-sm font-medium text-ink">{option.label}</span>
              <span className="text-xs text-ink-muted">{option.detail}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
