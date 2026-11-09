import { project } from '@/components/isometric';
import { ISO_CALLOUT, ISO_CALLOUT_NAME, ISO_CALLOUT_VALUE } from '@/lib/isoStyles';
import { ISO_WIRE, ISO_WIRE_DOT, ISO_WIRE_END } from '@/lib/isoStyles';

import type { CalloutProps } from '@/types';

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

export function Callout({ at, to, name, value, className }: CalloutProps) {
  const from = project(at);
  const [endX, rawEndY] = to;
  const endY = Math.abs(rawEndY - from[1]) < ELBOW * 2 ? from[1] : rawEndY;
  const towardRight = endX >= from[0];
  const textX = endX + (towardRight ? TEXT_GAP : -TEXT_GAP);
  return (
    <g className={className}>
      <path
        className={ISO_WIRE}
        vectorEffect="non-scaling-stroke"
        d={routeWire(from, [endX, endY])}
      />
      <circle className={ISO_WIRE_DOT} cx={from[0]} cy={from[1]} r={1.6} />
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
    </g>
  );
}
