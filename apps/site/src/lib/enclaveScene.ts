import { BoxGeometry, Group, MathUtils, Scene } from 'three';

import { createDashedBox, createDashedTrack, createGlassFaces } from '@/lib/enclaveGeometry';
import { createHandleHalfGeometry, createLineArt, createSolidFaces } from '@/lib/enclaveGeometry';
import { createStoredHalfGeometry } from '@/lib/enclaveGeometry';

import type { EnclaveParts, KeyHalves } from '@/types';

const VAULT_SIZE = 3.0;
const TRACK_LENGTH = 6.6;
const TRACK_END = TRACK_LENGTH / 2;
const CYCLE_SECONDS = 12;
const STEP_STARTS = [0, 0.22, 0.44, 0.74];
const JOINED_X = 0.17;
const KEY_OPEN_GRAY = 0x2a2a2a;
const KEY_SEALED_GRAY = 0x808080;

function createKeyHalves(): KeyHalves {
  const keyFaces = createSolidFaces();
  const handleHalf = createLineArt(createHandleHalfGeometry(), keyFaces);
  const storedHalf = createLineArt(createStoredHalfGeometry(), keyFaces);
  storedHalf.position.x = JOINED_X;
  return { handleHalf, storedHalf, keyFaces };
}

function createRequest(): Group {
  const request = createLineArt(new BoxGeometry(0.28, 0.28, 0.28), createSolidFaces());
  request.position.y = -1.0;
  return request;
}

export function createEnclaveParts(): EnclaveParts {
  const scene = new Scene();
  const turntable = new Group();
  const vault = createLineArt(
    new BoxGeometry(VAULT_SIZE, VAULT_SIZE, VAULT_SIZE),
    createGlassFaces()
  );
  const attestationFrame = createDashedBox(VAULT_SIZE + 0.7);
  const track = createDashedTrack(TRACK_LENGTH);
  track.position.y = -1.0;
  const halves = createKeyHalves();
  const request = createRequest();
  vault.renderOrder = 1;
  turntable.add(halves.handleHalf, halves.storedHalf, vault, attestationFrame, track, request);
  turntable.rotation.set(0.42, -0.62, 0);
  scene.add(turntable);
  return { scene, turntable, attestationFrame, request, halves };
}

function easeInOut(progress: number): number {
  const clamped = MathUtils.clamp(progress, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function phaseProgress(cycle: number, start: number, end: number): number {
  return easeInOut((cycle - start) / (end - start));
}

export function readEnclaveStep(elapsedSeconds: number): number {
  const cycle = (elapsedSeconds % CYCLE_SECONDS) / CYCLE_SECONDS;
  return STEP_STARTS.filter((start) => cycle >= start).length - 1;
}

export function animateEnclave(parts: EnclaveParts, elapsedSeconds: number): void {
  const cycle = (elapsedSeconds % CYCLE_SECONDS) / CYCLE_SECONDS;
  const arriving = phaseProgress(cycle, 0, 0.22);
  const leaving = phaseProgress(cycle, 0.76, 0.95);
  const opened = phaseProgress(cycle, 0.42, 0.48) - phaseProgress(cycle, 0.7, 0.76);
  const { handleHalf, keyFaces } = parts.halves;
  handleHalf.position.x = MathUtils.lerp(-TRACK_END, JOINED_X, arriving) - leaving * TRACK_END;
  keyFaces.color.setHex(KEY_SEALED_GRAY).lerp(keyFaces.color.clone().setHex(KEY_OPEN_GRAY), opened);
  parts.request.position.x = MathUtils.lerp(0, TRACK_END, phaseProgress(cycle, 0.48, 0.72));
  parts.request.visible = cycle > 0.46 && cycle < 0.74;
  parts.attestationFrame.rotation.y = elapsedSeconds * 0.12;
}
