import { AmbientLight, BoxGeometry, DirectionalLight, Group, MathUtils, Scene } from 'three';

import { PROVIDERS } from '@/lib/constants';
import { createDashedBox, createDashedTrack, createGlassFaces } from '@/lib/enclaveGeometry';
import { createHandleHalfGeometry, createLineArt, createSolidFaces } from '@/lib/enclaveGeometry';
import { GLASS_OPACITY, createPulseRing, createStoredHalfGeometry } from '@/lib/enclaveGeometry';
import { glassLines } from '@/lib/enclaveGeometry';

import type { EnclaveParts, KeyHalves, PulseRing } from '@/types';

const VAULT_SIZE = 3.0;
const TRACK_LENGTH = 6.6;
const TRACK_END = TRACK_LENGTH / 2;
const CYCLE_SECONDS = 12;
const STEP_STARTS = [0, 0.22, 0.44, 0.74];
const JOINED_X = 0.17;
const SPLIT_POINT = JOINED_X + 0.35;
const KEY_OPEN_GRAY = 0x8c8c8c;
const KEY_SCALE = 1.12;
const KEY_SEALED_WHITE = 0xffffff;
const LIGHT_COLOR = 0xffffff;
const LIGHT_INTENSITY = 1.6;
const GLASS_WIPED_OPACITY = 0.95;

function createKeyHalves(): KeyHalves {
  const keyFaces = createSolidFaces();
  const handleHalf = createLineArt(createHandleHalfGeometry(), keyFaces);
  const storedHalf = createLineArt(createStoredHalfGeometry(), keyFaces);
  storedHalf.position.x = JOINED_X;
  handleHalf.scale.setScalar(KEY_SCALE);
  storedHalf.scale.setScalar(KEY_SCALE);
  return { handleHalf, storedHalf, keyFaces };
}

function createRequest(): Group {
  const request = createLineArt(new BoxGeometry(0.32, 0.22, 0.22), createSolidFaces());
  request.position.y = -1.0;
  return request;
}

export function createEnclaveParts(): EnclaveParts {
  const scene = new Scene();
  scene.add(new AmbientLight(LIGHT_COLOR, LIGHT_INTENSITY));
  const sun = new DirectionalLight(LIGHT_COLOR, LIGHT_INTENSITY);
  sun.position.set(-2, 5, 6);
  scene.add(sun);
  const turntable = new Group();
  const glass = createGlassFaces();
  const vault = createLineArt(
    new BoxGeometry(VAULT_SIZE, VAULT_SIZE, VAULT_SIZE),
    glass,
    glassLines
  );
  const pulse = createPulseRing();
  pulse.position.x = SPLIT_POINT;
  const attestationFrame = createDashedBox(VAULT_SIZE + 0.7);
  const track = createDashedTrack(TRACK_LENGTH);
  track.position.y = -1.0;
  const halves = createKeyHalves();
  const request = createRequest();
  vault.renderOrder = 1;
  turntable.add(
    halves.handleHalf,
    halves.storedHalf,
    vault,
    attestationFrame,
    track,
    request,
    pulse
  );
  turntable.rotation.set(0.42, -0.62, 0);
  scene.add(turntable);
  return { scene, turntable, attestationFrame, request, halves, pulse, glass };
}

function easeInOut(progress: number): number {
  const clamped = MathUtils.clamp(progress, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function phaseProgress(cycle: number, start: number, end: number): number {
  return easeInOut((cycle - start) / (end - start));
}

function settle(progress: number): number {
  const remaining = MathUtils.clamp(progress, 0, 1) - 1;
  return 1 + 2.2 * remaining ** 3 + 1.2 * remaining ** 2;
}

function animatePulse(pulse: PulseRing, cycle: number): void {
  const pulseProgress = MathUtils.clamp((cycle - 0.22) / 0.1, 0, 1);
  pulse.visible = pulseProgress > 0 && pulseProgress < 1;
  pulse.scale.setScalar(1 + pulseProgress * 2.2);
  pulse.material.opacity = (1 - pulseProgress) * 0.8;
}

export function readProviderIndex(elapsedSeconds: number): number {
  return Math.floor(elapsedSeconds / CYCLE_SECONDS) % PROVIDERS.length;
}

export function readEnclaveStep(elapsedSeconds: number): number {
  const cycle = (elapsedSeconds % CYCLE_SECONDS) / CYCLE_SECONDS;
  return STEP_STARTS.filter((start) => cycle >= start).length - 1;
}

export function animateEnclave(parts: EnclaveParts, elapsedSeconds: number): void {
  const cycle = (elapsedSeconds % CYCLE_SECONDS) / CYCLE_SECONDS;
  const arriving = settle((cycle - 0.02) / 0.2);
  const leaving = phaseProgress(cycle, 0.76, 0.95);
  const opened = phaseProgress(cycle, 0.42, 0.48) - phaseProgress(cycle, 0.7, 0.76);
  const { handleHalf, keyFaces } = parts.halves;
  handleHalf.position.x = MathUtils.lerp(-TRACK_END, JOINED_X, arriving) - leaving * TRACK_END;
  keyFaces.color
    .setHex(KEY_SEALED_WHITE)
    .lerp(keyFaces.color.clone().setHex(KEY_OPEN_GRAY), opened);
  parts.request.position.x = MathUtils.lerp(0, TRACK_END, phaseProgress(cycle, 0.48, 0.72));
  parts.request.visible = cycle > 0.46 && cycle < 0.74;
  parts.attestationFrame.rotation.y = elapsedSeconds * 0.12;
  animatePulse(parts.pulse, cycle);
  const wipeStrength = Math.max(0, 1 - Math.abs(cycle - 0.75) / 0.04);
  parts.glass.opacity = MathUtils.lerp(GLASS_OPACITY, GLASS_WIPED_OPACITY, wipeStrength);
}
