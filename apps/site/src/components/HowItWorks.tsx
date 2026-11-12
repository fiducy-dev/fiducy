'use client';

import { FlowFigure } from '@/components/FlowFigure';
import { FlowStageSvg } from '@/components/FlowStageSvg';
import { useFlowReadout } from '@/components/useFlowReadout';
import { FLOW_HINT, FLOW_LAYOUTS } from '@/lib/flowFigure';
import { LABEL_CLASS } from '@/lib/styles';

export function HowItWorks() {
  const { ref, text } = useFlowReadout();

  return (
    <figure className="m-0 grid gap-5">
      <div ref={ref} className="grid">
        <FlowStageSvg className="mx-auto w-full max-w-[1040px] max-md:hidden">
          <FlowFigure layout={FLOW_LAYOUTS.row} />
        </FlowStageSvg>
        <FlowStageSvg className="mx-auto hidden w-full max-w-[380px] max-md:block">
          <FlowFigure layout={FLOW_LAYOUTS.column} />
        </FlowStageSvg>
      </div>
      <figcaption
        className={`${LABEL_CLASS} flex min-h-5 flex-wrap justify-between gap-x-4 gap-y-1 border-t border-dashed border-frame pt-4`}
      >
        <span>{FLOW_HINT}</span>
        <span className="text-ink normal-case tabular-nums">{text}</span>
      </figcaption>
    </figure>
  );
}
