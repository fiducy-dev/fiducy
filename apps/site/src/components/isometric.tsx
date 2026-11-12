import type { LineProps, Point } from '@/types';

const UNIT = 16;
const COS_30 = Math.cos(Math.PI / 6);

export function project([x, y, z]: Point): [number, number] {
  return [(x - y) * COS_30 * UNIT, ((x + y) * 0.5 - z) * UNIT];
}

export function offset(x: number, y: number, z: number): string {
  const [left, top] = project([x, y, z]);
  return `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px)`;
}

export function Line({ from, to, className }: LineProps) {
  const [x1, y1] = project(from);
  const [x2, y2] = project(to);
  return (
    <line className={className} vectorEffect="non-scaling-stroke" x1={x1} y1={y1} x2={x2} y2={y2} />
  );
}
