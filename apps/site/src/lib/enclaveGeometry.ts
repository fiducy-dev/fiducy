import { BoxGeometry, EdgesGeometry, ExtrudeGeometry, Group, RingGeometry } from 'three';
import { LineBasicMaterial, LineDashedMaterial, LineSegments, Mesh } from 'three';
import { DataTexture, MeshBasicMaterial, MeshToonMaterial, NearestFilter } from 'three';
import { Path, RedFormat, Shape } from 'three';

import type { BufferGeometry, Material } from 'three';

const INK = 0x000000;
const SURFACE = 0xffffff;
const EDGE_ANGLE = 20;
export const GLASS_OPACITY = 0.62;
const KEY_DEPTH = 0.24;
const HEAD_CENTER_X = -1.1;
const HEAD_RADIUS = 0.55;
const HOLE_RADIUS = 0.24;
const SHAFT_HALF_HEIGHT = 0.12;
const COLLAR_HALF_HEIGHT = 0.2;
const COLLAR_LENGTH = 0.16;
const TONES = [188, 226, 255];
const SPLIT_X = 0.35;

export const inkLines = new LineBasicMaterial({ color: INK });

export const glassLines = new LineBasicMaterial({ color: 0x8f8f8f });

export function createLineArt(
  geometry: BufferGeometry,
  faces: Material,
  lines: LineBasicMaterial = inkLines
): Group {
  const group = new Group();
  group.add(new Mesh(geometry, faces));
  group.add(new LineSegments(new EdgesGeometry(geometry, EDGE_ANGLE), lines));
  return group;
}

function createToneMap(): DataTexture {
  const texture = new DataTexture(new Uint8Array(TONES), TONES.length, 1, RedFormat);
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

const toneMap = createToneMap();

export function createSolidFaces(): MeshToonMaterial {
  return new MeshToonMaterial({
    color: SURFACE,
    gradientMap: toneMap,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
  });
}

export function createGlassFaces(): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color: SURFACE,
    transparent: true,
    opacity: GLASS_OPACITY,
    depthWrite: false
  });
}

export function createPulseRing(): Mesh {
  const ring = new Mesh(
    new RingGeometry(0.34, 0.37, 48),
    new MeshBasicMaterial({ color: INK, transparent: true, opacity: 0, depthWrite: false })
  );
  ring.rotation.y = Math.PI / 2;
  return ring;
}

export function createDashedBox(size: number): LineSegments {
  const edges = new EdgesGeometry(new BoxGeometry(size, size, size));
  const box = new LineSegments(
    edges,
    new LineDashedMaterial({ color: 0x8a8a8a, dashSize: 0.12, gapSize: 0.1 })
  );
  box.computeLineDistances();
  return box;
}

export function createDashedTrack(length: number): LineSegments {
  const edges = new EdgesGeometry(new BoxGeometry(length, 0.001, 0.001));
  const track = new LineSegments(
    edges,
    new LineDashedMaterial({ color: 0xb0b0b0, dashSize: 0.1, gapSize: 0.12 })
  );
  track.computeLineDistances();
  return track;
}

function extrudeKeyShape(shape: Shape): ExtrudeGeometry {
  const geometry = new ExtrudeGeometry(shape, { depth: KEY_DEPTH, bevelEnabled: false });
  geometry.translate(0, 0, -KEY_DEPTH / 2);
  return geometry;
}

export function createHandleHalfGeometry(): ExtrudeGeometry {
  const joinAngle = Math.asin(COLLAR_HALF_HEIGHT / HEAD_RADIUS);
  const joinX = HEAD_CENTER_X + HEAD_RADIUS * Math.cos(joinAngle);
  const collarEnd = joinX + COLLAR_LENGTH;
  const shape = new Shape();
  shape.moveTo(joinX, COLLAR_HALF_HEIGHT);
  shape.lineTo(collarEnd, COLLAR_HALF_HEIGHT);
  shape.lineTo(collarEnd, SHAFT_HALF_HEIGHT);
  shape.lineTo(SPLIT_X, SHAFT_HALF_HEIGHT);
  shape.lineTo(SPLIT_X, -SHAFT_HALF_HEIGHT);
  shape.lineTo(collarEnd, -SHAFT_HALF_HEIGHT);
  shape.lineTo(collarEnd, -COLLAR_HALF_HEIGHT);
  shape.lineTo(joinX, -COLLAR_HALF_HEIGHT);
  shape.absarc(HEAD_CENTER_X, 0, HEAD_RADIUS, -joinAngle, joinAngle - Math.PI * 2, true);
  const hole = new Path();
  hole.absarc(HEAD_CENTER_X, 0, HOLE_RADIUS, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return extrudeKeyShape(shape);
}

export function createStoredHalfGeometry(): ExtrudeGeometry {
  const outline: [number, number][] = [
    [1.22, SHAFT_HALF_HEIGHT],
    [1.3, 0.04],
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
