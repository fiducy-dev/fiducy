import { ExtrudeGeometry, LineBasicMaterial, Path, Shape } from 'three';

const INK = 0x000000;
const KEY_DEPTH = 0.16;
const HEAD_CENTER_X = -1.1;
const HEAD_RADIUS = 0.55;
const HOLE_RADIUS = 0.24;
const SHAFT_HALF_HEIGHT = 0.12;
const SPLIT_X = 0.35;

export const inkLines = new LineBasicMaterial({ color: INK });

function extrudeKeyShape(shape: Shape): ExtrudeGeometry {
  const geometry = new ExtrudeGeometry(shape, { depth: KEY_DEPTH, bevelEnabled: false });
  geometry.translate(0, 0, -KEY_DEPTH / 2);
  return geometry;
}

export function createHandleHalfGeometry(): ExtrudeGeometry {
  const joinAngle = Math.asin(SHAFT_HALF_HEIGHT / HEAD_RADIUS);
  const joinX = HEAD_CENTER_X + HEAD_RADIUS * Math.cos(joinAngle);
  const shape = new Shape();
  shape.moveTo(joinX, SHAFT_HALF_HEIGHT);
  shape.lineTo(SPLIT_X, SHAFT_HALF_HEIGHT);
  shape.lineTo(SPLIT_X, -SHAFT_HALF_HEIGHT);
  shape.lineTo(joinX, -SHAFT_HALF_HEIGHT);
  shape.absarc(HEAD_CENTER_X, 0, HEAD_RADIUS, -joinAngle, joinAngle - Math.PI * 2, true);
  const hole = new Path();
  hole.absarc(HEAD_CENTER_X, 0, HOLE_RADIUS, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return extrudeKeyShape(shape);
}

export function createStoredHalfGeometry(): ExtrudeGeometry {
  const outline: [number, number][] = [
    [1.3, SHAFT_HALF_HEIGHT],
    [1.3, -0.28],
    [1.12, -0.28],
    [1.12, -SHAFT_HALF_HEIGHT],
    [0.98, -SHAFT_HALF_HEIGHT],
    [0.98, -0.36],
    [0.78, -0.36],
    [0.78, -SHAFT_HALF_HEIGHT],
    [SPLIT_X, -SHAFT_HALF_HEIGHT]
  ];
  const shape = new Shape();
  shape.moveTo(SPLIT_X, SHAFT_HALF_HEIGHT);
  for (const [x, y] of outline) shape.lineTo(x, y);
  shape.closePath();
  return extrudeKeyShape(shape);
}
