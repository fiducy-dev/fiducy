import { Color, Group, MathUtils, Object3D, Scene, Vector3 } from 'three';
import { AmbientLight, DirectionalLight } from 'three';

import { dashedPath, keyholeCenterX, keyholePiece, roundedSolid, toon } from '@/lib/heroSolids';

import type { EnclaveParts, HeroStation } from '@/types';
import type { MeshToonMaterial, Vector3Tuple } from 'three';

const CYCLE_SECONDS = 8;
const SPACING = 4.4;
const ENCLAVE_SIZE = 2.2;
const ENCLAVE_HEIGHT = 1.5;
const PAD_TOP = 0.32;
const HALF_LIFT = 1.24;
const JOIN_Y = ENCLAVE_HEIGHT + HALF_LIFT + 0.55;
const SNAP_DROP = 0.38;
const STEP_STARTS = [0, 0.15, 0.28, 0.8];
const PROVIDER_COUNT = 4;
const FACE_YAW = Math.PI / 4;
const WHITE = 0xffffff;
const PAPER = 0xf4f4f4;
const COAL = 0x1b1b1b;
const DIM = 0x9a9a9a;
const INSET_DARK = 0x2c2c2c;

export const REST_CYCLE = 0.47;

const UP = new Vector3(0, 1, 0);

const STATIONS: Record<HeroStation, Vector3Tuple> = {
  app: [-SPACING, 0, 0],
  store: [0, 0, -SPACING],
  enclave: [0, 0, 0],
  provider: [SPACING, 0, 0]
};

function ease(progress: number): number {
  const t = MathUtils.clamp(progress, 0, 1);
  return t * t * (3 - 2 * t);
}

function overshoot(progress: number): number {
  const t = MathUtils.clamp(progress, 0, 1) - 1;
  return 1 + 2.4 * t * t * t + 1.4 * t * t;
}

function span(cycle: number, start: number, end: number): number {
  return ease((cycle - start) / (end - start));
}

function at([x, y, z]: Vector3Tuple, object: Object3D): Object3D {
  object.position.set(x, y, z);
  return object;
}

function anchor(parent: Object3D, y: number): Object3D {
  const point = new Object3D();
  point.position.y = y;
  parent.add(point);
  return point;
}

function appStation(): Group {
  const station = new Group();
  station.add(roundedSolid([1.9, 0.26, 1.9], 0.1, toon(WHITE)));
  const screen = roundedSolid([1.3, 0.06, 1.3], 0.04, toon(PAPER));
  screen.position.y = 0.26;
  station.add(screen);
  return station;
}

function storeStation(): Group {
  const station = new Group();
  for (const level of [0, 1, 2]) {
    const slab = roundedSolid([1.9, 0.2, 1.9], 0.07, toon(WHITE));
    slab.position.y = level * 0.24;
    station.add(slab);
  }
  return station;
}

function led(material: MeshToonMaterial, [x, y, z]: Vector3Tuple): Group {
  const dot = roundedSolid([0.12, 0.12, 0.04], 0.02, material);
  dot.position.set(x, y, z);
  return dot;
}

function restPosition(station: HeroStation, side: -1 | 1, base: number): Vector3 {
  const [x, y, z] = STATIONS[station];
  const offset = new Vector3(-keyholeCenterX(side), 0, 0).applyAxisAngle(UP, FACE_YAW);
  return new Vector3(x, y + base + HALF_LIFT, z).add(offset);
}

export function createEnclaveParts(): EnclaveParts {
  const scene = new Scene();
  scene.add(new AmbientLight(WHITE, 0.9));
  const sun = new DirectionalLight(WHITE, 1.8);
  sun.position.set(-2, 8, 3);
  scene.add(sun);
  const turntable = new Group();
  scene.add(turntable);

  const app = at(STATIONS.app, appStation());
  const store = at(STATIONS.store, storeStation());
  const insetMaterial = toon(INSET_DARK);
  const enclave = at(
    STATIONS.enclave,
    roundedSolid([ENCLAVE_SIZE, ENCLAVE_HEIGHT, ENCLAVE_SIZE], 0.16, toon(COAL))
  );
  const inset = roundedSolid([1.5, 0.05, 1.5], 0.04, insetMaterial);
  inset.position.y = ENCLAVE_HEIGHT;
  enclave.add(inset);
  const enclaveLed = toon(0x555555);
  enclave.add(led(enclaveLed, [0.7, 0.35, ENCLAVE_SIZE / 2 + 0.01]));
  const provider = at(STATIONS.provider, roundedSolid([1.8, 0.85, 1.8], 0.14, toon(WHITE)));
  const providerLed = toon(0xc8c8c8);
  provider.add(led(providerLed, [0.55, 0.3, 0.91]));

  const userHalf = keyholePiece(-1, toon(COAL));
  const fiducyHalf = keyholePiece(1, toon(DIM));
  const userCopy = keyholePiece(-1, toon(COAL));
  const fiducyCopyMaterial = toon(DIM);
  const fiducyCopy = keyholePiece(1, fiducyCopyMaterial);
  for (const piece of [userHalf, fiducyHalf, userCopy, fiducyCopy]) piece.rotation.y = FACE_YAW;

  const packet = roundedSolid([0.34, 0.34, 0.34], 0.06, toon(WHITE));
  const reply = roundedSolid([0.34, 0.34, 0.34], 0.06, toon(COAL));

  turntable.add(
    dashedPath([STATIONS.app, STATIONS.enclave, STATIONS.provider]),
    dashedPath([STATIONS.store, STATIONS.enclave]),
    app,
    store,
    enclave,
    provider,
    userHalf,
    fiducyHalf,
    userCopy,
    fiducyCopy,
    packet,
    reply
  );
  turntable.rotation.set(Math.atan(1 / Math.SQRT2), -Math.PI / 4, 0);

  return {
    scene,
    turntable,
    userHalf,
    fiducyHalf,
    userCopy,
    fiducyCopy,
    fiducyCopyMaterial,
    insetMaterial,
    enclaveLed,
    providerLed,
    packet,
    reply,
    rests: {
      user: restPosition('app', -1, PAD_TOP),
      fiducy: restPosition('store', 1, 0.72)
    },
    anchors: {
      app: anchor(app, -0.15),
      store: anchor(store, -0.15),
      provider: anchor(provider, -0.15)
    }
  };
}

function cycleOf(elapsedSeconds: number): number {
  return (elapsedSeconds % CYCLE_SECONDS) / CYCLE_SECONDS;
}

export function readEnclaveStep(elapsedSeconds: number): number {
  const cycle = cycleOf(elapsedSeconds);
  return STEP_STARTS.filter((start) => cycle >= start).length - 1;
}

export function readProviderIndex(elapsedSeconds: number): number {
  return Math.floor(elapsedSeconds / CYCLE_SECONDS) % PROVIDER_COUNT;
}

function hop(cycle: number, start: number, end: number): number {
  if (cycle < start || cycle > end) return 0;
  return Math.sin(((cycle - start) / (end - start)) * Math.PI) * 0.3;
}

function fly(from: Vector3, to: Vector3, progress: number, target: Vector3): Vector3 {
  return target
    .lerpVectors(from, to, progress)
    .setY(MathUtils.lerp(from.y, to.y, progress) + Math.sin(progress * Math.PI) * 1.1);
}

const joinPoint = new Vector3(0, JOIN_Y, 0);
const coal = new Color(COAL);
const dim = new Color(DIM);
const insetDark = new Color(INSET_DARK);
const insetLit = new Color(0xe9e9e9);

export function animateEnclave(
  parts: EnclaveParts,
  elapsedSeconds: number,
  cycle = cycleOf(elapsedSeconds)
): void {
  const bob = Math.sin(elapsedSeconds * 1.6) * 0.04;
  const { rests } = parts;
  parts.userHalf.position.copy(rests.user).setY(rests.user.y + bob + hop(cycle, 0.02, 0.14));
  parts.fiducyHalf.position.copy(rests.fiducy).setY(rests.fiducy.y - bob + hop(cycle, 0.16, 0.28));

  const travel = span(cycle, 0.28, 0.42);
  const snap = overshoot((cycle - 0.43) / 0.06);
  const sink = span(cycle, 0.5, 0.58);
  const copiesVisible = cycle > 0.28 && cycle < 0.58;
  parts.userCopy.visible = copiesVisible;
  parts.fiducyCopy.visible = copiesVisible;
  const fiducyTarget = joinPoint.clone().setY(JOIN_Y - SNAP_DROP * (1 - (cycle > 0.43 ? snap : 0)));
  fly(rests.user, joinPoint, travel, parts.userCopy.position);
  fly(rests.fiducy, fiducyTarget, travel, parts.fiducyCopy.position);
  parts.userCopy.position.y -= sink * 2.4;
  parts.fiducyCopy.position.y -= sink * 2.4;
  parts.fiducyCopyMaterial.color.copy(dim).lerp(coal, span(cycle, 0.43, 0.47));

  const lit = span(cycle, 0.52, 0.58) - span(cycle, 0.8, 0.9);
  const flash = Math.max(0, 1 - Math.abs(cycle - 0.82) / 0.03);
  parts.insetMaterial.color.copy(insetDark).lerp(insetLit, Math.max(lit * 0.7, flash));
  parts.enclaveLed.color.setScalar(
    cycle > 0.52 && cycle < 0.8 && Math.sin(elapsedSeconds * 18) > 0 ? 1 : 0.35
  );

  const outbound = span(cycle, 0.58, 0.67);
  const inbound = span(cycle, 0.69, 0.78);
  parts.packet.visible = cycle > 0.57 && cycle < 0.68;
  parts.packet.position.set(MathUtils.lerp(1.1, SPACING - 0.9, outbound), 0.02, 0);
  parts.reply.visible = cycle > 0.68 && cycle < 0.79;
  parts.reply.position.set(MathUtils.lerp(SPACING - 0.9, 1.1, inbound), 0.02, 0);
  parts.providerLed.color.setScalar(cycle > 0.66 && cycle < 0.72 ? 0.05 : 0.78);
}
