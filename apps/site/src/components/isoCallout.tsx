import { Animate } from '@/components/Animate';
import { project } from '@/components/isometric';
import { shown, track } from '@/lib/isoMotion';
import { ISO_CALLOUT, ISO_CALLOUT_NAME, ISO_CALLOUT_VALUE } from '@/lib/isoStyles';
import { ISO_WIRE, ISO_WIRE_DOT, ISO_WIRE_END } from '@/lib/isoStyles';

import type { CalloutProps, TimedProps } from '@/types';

const ELBOW = 4;
const JOG = 12;
const END_SIZE = 3;
const TEXT_GAP = 5;
const TEXT_DROP = 3.5;

function routeWire(
  [fromX, fromY]: readonly [number, number],
  [toX, toY]: readonly [number, number]
): string {
  const rise = toY - fromY;
  if (Math.abs(rise) < ELBOW * 2) return `M${fromX},${fromY} L${toX},${fromY}`;
  const run = Math.sign(toX - fromX);
  const down = Math.sign(rise);
  const turnX = toX - run * JOG;
  return [
    `M${fromX},${fromY}`,
    `L${turnX - run * ELBOW},${fromY}`,
    `Q${turnX},${fromY} ${turnX},${fromY + down * ELBOW}`,
    `L${turnX},${toY - down * ELBOW}`,
    `Q${turnX},${toY} ${turnX + run * ELBOW},${toY}`,
    `L${toX},${toY}`
  ].join(' ');
}

const DRAW_MS = 500;
const RETRACT_MS = 400;
const LABEL_MS = 200;

function wireFrames([from, to]: readonly [number, number]): Keyframe[] {
  return track('strokeDashoffset', [
    [from, 1],
    [from + DRAW_MS, 0],
    [to, 0],
    [to + RETRACT_MS, 1]
  ]);
}

function Timed({ frames, children }: TimedProps) {
  return frames ? <Animate frames={frames}>{children}</Animate> : children;
}

export function Callout({ at, to, name, value, window }: CalloutProps) {
  const from = project(at);
  const [endX, rawEndY] = to;
  const endY = Math.abs(rawEndY - from[1]) < ELBOW * 2 ? from[1] : rawEndY;
  const towardRight = endX >= from[0];
  const textX = endX + (towardRight ? TEXT_GAP : -TEXT_GAP);
  const dotFrames = window && shown('opacity', [window[0], window[1] + RETRACT_MS], [0, 1], 120);
  const labelFrames =
    window && shown('opacity', [window[0] + DRAW_MS, window[1]], [0, 1], LABEL_MS);
  return (
    <g>
      <Timed frames={window && wireFrames(window)}>
        <path
          className={ISO_WIRE}
          pathLength={1}
          strokeDasharray={window ? '1 2' : undefined}
          d={routeWire(from, [endX, endY])}
        />
      </Timed>
      <Timed frames={dotFrames}>
        <circle className={ISO_WIRE_DOT} cx={from[0]} cy={from[1]} r={1.6} />
      </Timed>
      <Timed frames={labelFrames}>
        <rect
          className={ISO_WIRE_END}
          vectorEffect="non-scaling-stroke"
          x={endX - END_SIZE / 2}
          y={endY - END_SIZE / 2}
          width={END_SIZE}
          height={END_SIZE}
        />
        <text
          className={ISO_CALLOUT}
          x={textX}
          y={endY + TEXT_DROP}
          textAnchor={towardRight ? 'start' : 'end'}
        >
          <tspan className={ISO_CALLOUT_NAME}>{name}</tspan>
          <tspan className={ISO_CALLOUT_VALUE} dx={6}>
            {value}
          </tspan>
        </text>
      </Timed>
    </g>
  );
}
