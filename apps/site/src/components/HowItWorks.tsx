'use client';

import { Fragment } from 'react';

import { FlowColumn } from '@/components/FlowColumn';
import { Button } from '@/components/ui/button';
import { useFlowReplay } from '@/components/useFlowReplay';
import { FLOW_COLUMNS } from '@/lib/howItWorks';
import { cn } from '@/lib/utils';

export function HowItWorks() {
  const { ref, step, isDone, replay } = useFlowReplay(FLOW_COLUMNS.length);
  const status = FLOW_COLUMNS[Math.max(step, 0)]?.status;

  return (
    <figure ref={ref} className="grid gap-6">
      <div className="flex flex-col lg:flex-row lg:items-center">
        {FLOW_COLUMNS.map((column, index) => (
          <Fragment key={column.status}>
            {index > 0 ? (
              <span
                className={cn(
                  'h-5 w-px shrink-0 self-center bg-control transition-transform duration-500 ease-out lg:h-px lg:w-5',
                  'origin-top lg:origin-left',
                  step >= index ? 'scale-100' : 'scale-y-0 lg:scale-x-0 lg:scale-y-100'
                )}
              />
            ) : null}
            <FlowColumn
              column={column}
              isShown={step >= index}
              isActive={step === index && !isDone}
              hasExit={index < FLOW_COLUMNS.length - 1}
            />
          </Fragment>
        ))}
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-dashed border-frame pt-4">
        <p className="font-mono text-xs leading-relaxed text-ink-muted">
          <span className="text-ink">Plaintext key:</span> {status}
        </p>
        <Button variant="outline" size="sm" onClick={replay} disabled={!isDone}>
          Replay
        </Button>
      </figcaption>
    </figure>
  );
}
