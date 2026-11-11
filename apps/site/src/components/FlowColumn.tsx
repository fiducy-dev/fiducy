import { cn } from '@/lib/utils';

import type { FlowCardProps, FlowColumnProps } from '@/types';

const LINE = 'pointer-events-none absolute bg-control';
const RAIL_IN_FIRST =
  'top-0 right-0 left-1/2 h-px lg:top-1/2 lg:right-auto lg:bottom-0 lg:left-0 lg:h-auto lg:w-px';
const RAIL_IN_LAST =
  'top-0 right-1/2 left-0 h-px lg:top-0 lg:right-auto lg:bottom-1/2 lg:left-0 lg:h-auto lg:w-px';
const RAIL_OUT_FIRST =
  'right-0 bottom-0 left-1/2 h-px lg:top-1/2 lg:right-0 lg:bottom-0 lg:left-auto lg:h-auto lg:w-px';
const RAIL_OUT_LAST =
  'right-1/2 bottom-0 left-0 h-px lg:top-0 lg:right-0 lg:bottom-1/2 lg:left-auto lg:h-auto lg:w-px';
const TICK_IN = 'top-0 left-1/2 h-3 w-px lg:top-1/2 lg:left-0 lg:h-px lg:w-3';
const TICK_OUT =
  'bottom-0 left-1/2 h-3 w-px lg:top-1/2 lg:right-0 lg:bottom-auto lg:left-auto lg:h-px lg:w-3';

function FlowCard({ card, isActive }: FlowCardProps) {
  return (
    <div
      className={cn(
        'grid h-full content-start gap-2 border bg-white p-3.5 transition-colors duration-500',
        isActive || card.isVerdict ? 'border-ink-quiet' : 'border-frame'
      )}
    >
      <span className="flex items-center gap-2 font-mono text-[0.6875rem] tracking-[0.04em] text-ink-muted uppercase">
        <span
          className={cn(
            'size-1.5 shrink-0 transition-colors duration-500',
            isActive ? 'animate-pulse bg-ink' : 'bg-ink-faint'
          )}
        />
        {card.label}
      </span>
      <span
        className={cn(
          'text-pretty',
          card.isVerdict
            ? 'text-[0.9375rem] leading-snug font-semibold text-ink'
            : 'text-sm leading-snug text-ink-body'
        )}
      >
        {card.text}
      </span>
    </div>
  );
}

export function FlowColumn({ column, isShown, isActive, hasExit }: FlowColumnProps) {
  const isGroup = column.cards.length > 1;
  return (
    <div
      className={cn(
        'grid min-w-0 transition-[opacity,translate] duration-500 ease-out lg:flex-1 lg:basis-0',
        isGroup ? 'grid-cols-2 lg:grid-cols-1' : 'grid-cols-1',
        isShown ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0'
      )}
    >
      {column.cards.map((card, index) => {
        const isFirst = index === 0;
        return (
          <div
            key={card.label}
            className={cn(
              'relative',
              isGroup && 'px-1 pt-3 lg:px-0 lg:py-1.5 lg:pl-3',
              isGroup && hasExit && 'pb-3 lg:pr-3'
            )}
          >
            {isGroup ? (
              <>
                <span className={cn(LINE, isFirst ? RAIL_IN_FIRST : RAIL_IN_LAST)} />
                <span className={cn(LINE, TICK_IN)} />
                {hasExit ? (
                  <>
                    <span className={cn(LINE, isFirst ? RAIL_OUT_FIRST : RAIL_OUT_LAST)} />
                    <span className={cn(LINE, TICK_OUT)} />
                  </>
                ) : null}
              </>
            ) : null}
            <FlowCard card={card} isActive={isActive} />
          </div>
        );
      })}
    </div>
  );
}
