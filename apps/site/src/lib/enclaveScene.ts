import { AmbientLight, BoxGeometry, DirectionalLight, Group, MathUtils, Scene } from 'three';

import { createDashedBox, createDashedTrack, createGlassFaces } from '@/lib/enclaveGeometry';
import { createHandleHalfGeometry, createLineArt, createSolidFaces } from '@/lib/enclaveGeometry';
import { GLASS_OPACITY, createPulseRing, createStoredHalfGeometry } from '@/lib/enclaveGeometry';
import { glassLines } from '@/lib/enclaveGeometry';
import { createClientWindow, createProviderBlock } from '@/lib/enclaveProps';

import type { EnclaveParts, KeyHalves } from '@/types';
import type { Mesh, MeshBasicMaterial } from 'three';

const VAULT_SIZE = 3.0;
const CLIENT_X = -6.2;
const PROVIDER_X = 5.6;
const TRACK_Y = -1.0;
const CYCLE_SECONDS = 14;
const STEP_STARTS = [0, 0.2, 0.4, 0.74];
const JOINED_X = 0.17;
const SPLIT_POINT = JOINED_X + 0.35;
const HANDLE_REST_X = CLIENT_X + 1.5;
const VAULT_EXIT_X = VAULT_SIZE / 2;
const PROVIDER_FACE_X = PROVIDER_X - 1.3;
const KEY_OPEN_GRAY = 0x8c8c8c;
const PROVIDER_LIT_GRAY = 0xe4e4e4;
const PROVIDER_COUNT = 4;
const KEY_SCALE = 1.12;
const KEY_SEALED_WHITE = 0xffffff;

function createKeyHalves(): KeyHalves {
  const keyFaces = createSolidFaces();
  const handleHalf = createLineArt(createHandleHalfGeometry(), keyFaces);
  const storedHalf = createLineArt(createStoredHalfGeometry(), keyFaces);
  storedHalf.position.x = JOINED_X;
  handleHalf.scale.setScalar(KEY_SCALE);
  storedHalf.scale.setScalar(KEY_SCALE);
  return { handleHalf, storedHalf, keyFaces };
}

function createPacket(): Group {
  const packet = createLineArt(new BoxGeometry(0.32, 0.22, 0.22), createSolidFaces());
  packet.position.y = TRACK_Y;
  return packet;
}

function createTrack(): Group {
  const track = createDashedTrack(PROVIDER_X - CLIENT_X);
  track.position.set((CLIENT_X + PROVIDER_X) / 2, TRACK_Y, 0);
  const group = new Group();
  group.add(track);
  return group;
}

export function createEnclaveParts(): EnclaveParts {
  const scene = new Scene();
  scene.add(new AmbientLight(0xffffff, 1.6));
  const sun = new DirectionalLight(0xffffff, 1.6);
  sun.position.set(-2, 5, 6);
  scene.add(sun);
  const turntable = new Group();
  const glass = createGlassFaces();
  const vault = createLineArt(
    new BoxGeometry(VAULT_SIZE, VAULT_SIZE, VAULT_SIZE),
    glass,
    glassLines
  );
  vault.renderOrder = 1;
  const pulse = createPulseRing();
  pulse.position.x = SPLIT_POINT;
  const providerPulse = createPulseRing();
  providerPulse.position.set(PROVIDER_FACE_X - 0.01, TRACK_Y, 0);
  const attestationFrame = createDashedBox(VAULT_SIZE + 0.7);
  const halves = createKeyHalves();
  const client = createClientWindow();
  client.group.position.set(CLIENT_X, 0.1, -0.9);
  client.group.rotation.y = 0.5;
  const provider = createProviderBlock();
  provider.group.position.x = PROVIDER_X;
  const request = createPacket();
  const response = createPacket();
  turntable.add(
    client.group,
    halves.handleHalf,
    halves.storedHalf,
    vault,
    attestationFrame,
    createTrack(),
    request,
    response,
    pulse,
    providerPulse,
    provider.group
  );
  turntable.rotation.set(0.32, -0.62, 0);
  turntable.scale.setScalar(0.86);
  scene.add(turntable);
  return {
    scene,
    turntable,
    vault,
    attestationFrame,
    request,
    response,
    halves,
    pulse,
    providerPulse,
    glass,
    client,
    provider
  };
}

function easeInOut(progress: number): number {
  const clamped = MathUtils.clamp(progress, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function phaseProgress(cycle: number, start: number, end: number): number {
  return easeInOut((cycle - start) / (end - start));
}

function settle(progress: number): number {
  const t = MathUtils.clamp(progress, 0, 1) - 1;
  return 1 + 2.2 * t * t * t + 1.2 * t * t;
}

function animateRing(ring: Mesh, cycle: number, start: number, growth: number): void {
  const progress = MathUtils.clamp((cycle - start) / 0.1, 0, 1);
  const material = ring.material as MeshBasicMaterial;
  ring.visible = progress > 0 && progress < 1;
  ring.scale.setScalar(1 + progress * growth);
  material.opacity = (1 - progress) * 0.8;
}

function animateMessages(parts: EnclaveParts, cycle: number): void {
  const fade = 1 - phaseProgress(cycle, 0.95, 0.99);
  parts.client.question.scale.setScalar(settle((cycle - 0.01) / 0.05) * fade);
  parts.client.answer.scale.setScalar(settle((cycle - 0.86) / 0.05) * fade);
}

function animatePackets(parts: EnclaveParts, cycle: number): void {
  const outbound = phaseProgress(cycle, 0.46, 0.6);
  parts.request.position.x = MathUtils.lerp(VAULT_EXIT_X, PROVIDER_FACE_X - 0.2, outbound);
  parts.request.visible = cycle > 0.45 && cycle < 0.61;
  const inbound = phaseProgress(cycle, 0.64, 0.86);
  parts.response.position.x = MathUtils.lerp(PROVIDER_FACE_X - 0.2, CLIENT_X + 1.1, inbound);
  parts.response.visible = cycle > 0.63 && cycle < 0.87;
  const lit = Math.max(0, 1 - Math.abs(cycle - 0.62) / 0.04);
  parts.provider.faces.color
    .setHex(KEY_SEALED_WHITE)
    .lerp(parts.provider.faces.color.clone().setHex(PROVIDER_LIT_GRAY), lit);
}

export function readProviderIndex(elapsedSeconds: number): number {
  return Math.floor(elapsedSeconds / CYCLE_SECONDS) % PROVIDER_COUNT;
}

export function readEnclaveStep(elapsedSeconds: number): number {
  const cycle = (elapsedSeconds % CYCLE_SECONDS) / CYCLE_SECONDS;
  return STEP_STARTS.filter((start) => cycle >= start).length - 1;
}

export function animateEnclave(parts: EnclaveParts, elapsedSeconds: number): void {
  const cycle = (elapsedSeconds % CYCLE_SECONDS) / CYCLE_SECONDS;
  const arriving = settle((cycle - 0.04) / 0.16);
  const leaving = phaseProgress(cycle, 0.78, 0.95);
  const opened = phaseProgress(cycle, 0.4, 0.45) - phaseProgress(cycle, 0.7, 0.76);
  const { handleHalf, keyFaces } = parts.halves;
  handleHalf.position.x =
    MathUtils.lerp(HANDLE_REST_X, JOINED_X, arriving) + leaving * (HANDLE_REST_X - JOINED_X);
  keyFaces.color
    .setHex(KEY_SEALED_WHITE)
    .lerp(keyFaces.color.clone().setHex(KEY_OPEN_GRAY), opened);
  parts.attestationFrame.rotation.y = elapsedSeconds * 0.12;
  animateRing(parts.pulse, cycle, 0.2, 2.2);
  animateRing(parts.providerPulse, cycle, 0.6, 3.2);
  animateMessages(parts, cycle);
  animatePackets(parts, cycle);
  const wipe = Math.max(0, 1 - Math.abs(cycle - 0.75) / 0.04);
  parts.glass.opacity = GLASS_OPACITY + (0.95 - GLASS_OPACITY) * wipe;
}
