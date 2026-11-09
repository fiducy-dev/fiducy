import { project } from '@/components/isometric';
import { ISO_PRINT, ISO_SOLID_FACES } from '@/lib/isoStyles';

import type { DotProps, InsetProps, Point, PrintProps, RoundBoxProps } from '@/types';

type Flat = readonly [number, number];

const CORNER_STEPS = 6;
const COS_30 = Math.cos(Math.PI / 6);
const PRINT_AXES = {
  top: [COS_30, -0.5, COS_30, 0.5],
  front: [COS_30, 0.5, 0, 1],
  side: [COS_30, -0.5, 0, 1]
} as const;

function roundOutline([x, y]: Flat, [width, depth]: Flat, radius: number): Flat[] {
  const r = Math.min(radius, width / 2, depth / 2);
  const centers: Flat[] = [
    [x + r, y + r],
    [x + width - r, y + r],
    [x + width - r, y + depth - r],
    [x + r, y + depth - r]
  ];
  return centers.flatMap(([cx, cy], corner) =>
    Array.from({ length: CORNER_STEPS + 1 }, (_, step) => {
      const angle = Math.PI + (corner + step / CORNER_STEPS) * (Math.PI / 2);
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as Flat;
    })
  );
}

function toPoints(corners: Point[]): string {
  return corners
    .map((corner) =>
      project(corner)
        .map((v) => v.toFixed(2))
        .join(',')
    )
    .join(' ');
}

function nearArc(outline: Flat[]): Flat[] {
  const across = ([px, py]: Flat) => px - py;
  let left = 0;
  let right = 0;
  outline.forEach((point, index) => {
    if (across(point) < across(outline[left] ?? point)) left = index;
    if (across(point) > across(outline[right] ?? point)) right = index;
  });
  const walk = (from: number, to: number) => {
    const arc: Flat[] = [];
    for (let index = from; ; index = (index + 1) % outline.length) {
      arc.push(outline[index] ?? [0, 0]);
      if (index === to) return arc;
    }
  };
  const nearness = (arc: Flat[]) => arc.reduce((sum, [px, py]) => sum + px + py, 0) / arc.length;
  const forward = walk(left, right);
  const backward = walk(right, left).reverse();
  return nearness(forward) > nearness(backward) ? forward : backward;
}

export function RoundBox({
  at: [x, y, z],
  size: [width, depth, height],
  radius = 0.3,
  tone = 'line',
  className,
  children
}: RoundBoxProps) {
  const outline = roundOutline([x, y], [width, depth], radius);
  const near = nearArc(outline);
  const top = z + height;
  const faces = ISO_SOLID_FACES[tone];
  return (
    <g className={className}>
      <polygon
        className={faces.side}
        vectorEffect="non-scaling-stroke"
        points={toPoints([
          ...near.map(([px, py]): Point => [px, py, top]),
          ...[...near].reverse().map(([px, py]): Point => [px, py, z])
        ])}
      />
      <polygon
        className={faces.top}
        vectorEffect="non-scaling-stroke"
        points={toPoints(outline.map(([px, py]): Point => [px, py, top]))}
      />
      {children}
    </g>
  );
}

export function Inset({ at: [x, y, z], size, radius = 0.2, className }: InsetProps) {
  const outline = roundOutline([x, y], size, radius);
  return (
    <polygon
      className={className}
      vectorEffect="non-scaling-stroke"
      points={toPoints(outline.map(([px, py]): Point => [px, py, z]))}
    />
  );
}

export function Print({ at, face = 'top', size = 6, className, children }: PrintProps) {
  const [left, top] = project(at);
  const [a, b, c, d] = PRINT_AXES[face];
  return (
    <text
      className={`${ISO_PRINT} ${className ?? ''}`}
      fontSize={size}
      transform={`matrix(${a.toFixed(4)} ${b.toFixed(4)} ${c.toFixed(4)} ${d.toFixed(4)} ${left.toFixed(2)} ${top.toFixed(2)})`}
    >
      {children}
    </text>
  );
}

export function Panel({ at: [x, y, z], size: [width, height], className }: InsetProps) {
  return (
    <polygon
      className={className}
      vectorEffect="non-scaling-stroke"
      points={toPoints([
        [x, y, z],
        [x + width, y, z],
        [x + width, y, z + height],
        [x, y, z + height]
      ])}
    />
  );
}

export function SidePanel({ at: [x, y, z], size: [width, height], className }: InsetProps) {
  return (
    <polygon
      className={className}
      vectorEffect="non-scaling-stroke"
      points={toPoints([
        [x, y, z],
        [x, y + width, z],
        [x, y + width, z + height],
        [x, y, z + height]
      ])}
    />
  );
}

export function Dot({ at, radius = 1.2, className }: DotProps) {
  const [left, top] = project(at);
  return <circle className={className} cx={left} cy={top} r={radius} />;
}
