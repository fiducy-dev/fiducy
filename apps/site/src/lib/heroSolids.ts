import { BackSide, DataTexture, EdgesGeometry, ExtrudeGeometry, Group } from 'three';
import { LineBasicMaterial, LineDashedMaterial, LineSegments, Mesh } from 'three';
import { BufferGeometry, Float32BufferAttribute, MeshBasicMaterial } from 'three';
import { MeshToonMaterial, NearestFilter, RedFormat, Shape } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import type { Vector3Tuple } from 'three';

const INK = 0x0a0a0a;
const HULL = 0.035;
const KEY_DEPTH = 0.22;
const KEY_SCALE = 1 / 18;
const SEAM = 1;
const CENTER: readonly [number, number] = [32, 34];
const TONES = [90, 170, 255];

export const inkEdges = new LineBasicMaterial({ color: INK });

function toneMap(): DataTexture {
  const texture = new DataTexture(new Uint8Array(TONES), TONES.length, 1, RedFormat);
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

const gradientMap = toneMap();

export function toon(color: number): MeshToonMaterial {
  return new MeshToonMaterial({ color, gradientMap });
}

function hullOf(geometry: BufferGeometry): Mesh {
  const hull = geometry.clone();
  const position = hull.getAttribute('position');
  const normal = hull.getAttribute('normal');
  const pushed = new Float32Array(position.count * 3);
  for (let index = 0; index < position.count; index += 1) {
    pushed[index * 3] = position.getX(index) + normal.getX(index) * HULL;
    pushed[index * 3 + 1] = position.getY(index) + normal.getY(index) * HULL;
    pushed[index * 3 + 2] = position.getZ(index) + normal.getZ(index) * HULL;
  }
  hull.setAttribute('position', new Float32BufferAttribute(pushed, 3));
  return new Mesh(hull, new MeshBasicMaterial({ color: INK, side: BackSide }));
}

export function roundedSolid(
  [width, height, depth]: Vector3Tuple,
  radius: number,
  material: MeshToonMaterial
): Group {
  const geometry = new RoundedBoxGeometry(width, height, depth, 4, radius);
  geometry.translate(0, height / 2, 0);
  const group = new Group();
  group.add(new Mesh(geometry, material), hullOf(geometry));
  return group;
}

function grid([x, y]: readonly [number, number]): [number, number] {
  return [(x - CENTER[0]) * KEY_SCALE, (CENTER[1] - y) * KEY_SCALE];
}

function keyholeHalf(side: -1 | 1): Shape {
  const seamX = 32 + side * SEAM;
  const top = 24 - Math.sqrt(144 - SEAM * SEAM);
  const points: [number, number][] = [
    [seamX, top],
    [32 + side * 6.52, 34.08],
    [32 + side * 12, 56],
    [seamX, 56]
  ];
  const [cx, cy] = grid([32, 24]);
  const radius = 12 * KEY_SCALE;
  const shape = new Shape();
  const [startX, startY] = grid(points[0] ?? [0, 0]);
  shape.moveTo(startX, startY);
  const startAngle = Math.atan2(startY - cy, startX - cx);
  const [joinX, joinY] = grid(points[1] ?? [0, 0]);
  const joinAngle = Math.atan2(joinY - cy, joinX - cx);
  shape.absarc(cx, cy, radius, startAngle, joinAngle, side === 1);
  for (const point of points.slice(2)) {
    const [x, y] = grid(point);
    shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

export function keyholeCenterX(side: -1 | 1): number {
  return side * 6.5 * KEY_SCALE;
}

export function keyholePiece(side: -1 | 1, material: MeshToonMaterial): Group {
  const geometry = new ExtrudeGeometry(keyholeHalf(side), {
    depth: KEY_DEPTH,
    bevelEnabled: false,
    curveSegments: 24
  });
  geometry.translate(0, 0, -KEY_DEPTH / 2);
  const group = new Group();
  group.add(
    new Mesh(geometry, material),
    new LineSegments(new EdgesGeometry(geometry, 25), inkEdges)
  );
  return group;
}

export function dashedPath(points: Vector3Tuple[]): LineSegments {
  const vertices: number[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    vertices.push(...(points[index] ?? []), ...(points[index + 1] ?? []));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  const line = new LineSegments(
    geometry,
    new LineDashedMaterial({ color: 0xa8a8a8, dashSize: 0.14, gapSize: 0.12 })
  );
  line.computeLineDistances();
  return line;
}
