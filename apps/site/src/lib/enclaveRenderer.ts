import { MathUtils, Object3D, PerspectiveCamera, Vector3 } from 'three';
import { WebGLRenderer } from 'three';

import { animateEnclave, createEnclaveParts, readEnclaveStep } from '@/lib/enclaveScene';
import { createPixelPass } from '@/lib/pixelPass';

import type { Disturbance, EnclaveParts, PixelPass, PointerState } from '@/types';
import type { SceneLabel, SceneLabelElements } from '@/types';

const MAX_PIXEL_RATIO = 2;
const BASE_PITCH = 0.42;
const BASE_YAW = -0.62;
const POINTER_YAW = 0.55;
const POINTER_PITCH = 0.3;
const FOLLOW_RATE = 0.06;
const DRAG_FRICTION = 0.94;
const REDUCED_MOTION_SECONDS = 6.5;
const DISTURB_SPEED = 1.2;
const DISTURB_TAP = 0.8;
const DISTURB_FOLLOW = 0.25;
const DISTURB_DECAY = 0.9;
const DISTURB_RADIUS_SHARE = 0.24;

function createPointerState(): PointerState {
  return { targetX: 0, targetY: 0, dragVelocity: 0, isDragging: false, lastClientX: 0 };
}

function steerTurntable(parts: EnclaveParts, pointer: PointerState, spin: number): void {
  const { turntable } = parts;
  const targetYaw = BASE_YAW + spin + pointer.targetX * POINTER_YAW;
  const targetPitch = BASE_PITCH + pointer.targetY * POINTER_PITCH;
  turntable.rotation.y = MathUtils.lerp(turntable.rotation.y, targetYaw, FOLLOW_RATE);
  turntable.rotation.x = MathUtils.lerp(turntable.rotation.x, targetPitch, FOLLOW_RATE);
}

function listenToPointer(canvas: HTMLCanvasElement, pointer: PointerState): () => void {
  const move = (event: PointerEvent) => {
    pointer.targetX = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.targetY = (event.clientY / window.innerHeight) * 2 - 1;
    if (!pointer.isDragging) return;
    pointer.dragVelocity = (event.clientX - pointer.lastClientX) * 0.004;
    pointer.lastClientX = event.clientX;
  };
  const press = (event: PointerEvent) => {
    pointer.isDragging = true;
    pointer.lastClientX = event.clientX;
  };
  const release = () => {
    pointer.isDragging = false;
  };
  window.addEventListener('pointermove', move, { passive: true });
  canvas.addEventListener('pointerdown', press);
  window.addEventListener('pointerup', release);
  return () => {
    window.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerdown', press);
    window.removeEventListener('pointerup', release);
  };
}

function createDisturbance(): Disturbance {
  return { x: -1e4, y: -1e4, strength: 0, target: 0, lastX: 0, lastY: 0, lastTime: 0 };
}

function listenToDisturbance(host: HTMLElement, disturbance: Disturbance): () => void {
  const locate = (event: PointerEvent) => {
    const bounds = host.getBoundingClientRect();
    disturbance.x = event.clientX - bounds.left;
    disturbance.y = bounds.height - (event.clientY - bounds.top);
  };
  const move = (event: PointerEvent) => {
    locate(event);
    const elapsed = Math.max(1, event.timeStamp - disturbance.lastTime);
    const distance = Math.hypot(
      event.clientX - disturbance.lastX,
      event.clientY - disturbance.lastY
    );
    disturbance.target = Math.max(
      disturbance.target,
      Math.min(1, distance / elapsed / DISTURB_SPEED)
    );
    disturbance.lastX = event.clientX;
    disturbance.lastY = event.clientY;
    disturbance.lastTime = event.timeStamp;
  };
  const press = (event: PointerEvent) => {
    locate(event);
    disturbance.target = Math.max(disturbance.target, DISTURB_TAP);
  };
  host.addEventListener('pointermove', move, { passive: true });
  host.addEventListener('pointerdown', press);
  return () => {
    host.removeEventListener('pointermove', move);
    host.removeEventListener('pointerdown', press);
  };
}

function settleDisturbance(disturbance: Disturbance): void {
  disturbance.strength = MathUtils.lerp(disturbance.strength, disturbance.target, DISTURB_FOLLOW);
  disturbance.target *= DISTURB_DECAY;
}

function createAnchor(parent: Object3D, x: number, y: number): Object3D {
  const anchor = new Object3D();
  anchor.position.set(x, y, 0);
  parent.add(anchor);
  return anchor;
}

function pinLabels(parts: EnclaveParts, elements: SceneLabelElements): SceneLabel[] {
  return [
    { element: elements.handleHalf, anchor: createAnchor(parts.halves.handleHalf, -1.1, 0.75) },
    { element: elements.storedHalf, anchor: createAnchor(parts.halves.storedHalf, 1.0, -0.6) },
    { element: elements.request, anchor: createAnchor(parts.request, 0, -0.3) }
  ];
}

function placeLabels(labels: SceneLabel[], camera: PerspectiveCamera, host: HTMLElement): void {
  const { width, height } = host.getBoundingClientRect();
  const point = new Vector3();
  for (const { element, anchor } of labels) {
    anchor.getWorldPosition(point).project(camera);
    const left = ((point.x + 1) / 2) * width;
    const top = ((1 - point.y) / 2) * height;
    element.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px)`;
    element.style.opacity = anchor.parent?.visible && Math.abs(point.x) < 0.95 ? '1' : '0';
  }
}

function resizeRenderer(
  renderer: WebGLRenderer,
  pass: PixelPass,
  camera: PerspectiveCamera,
  host: HTMLElement
): void {
  const { width, height } = host.getBoundingClientRect();
  renderer.setSize(Math.max(1, width), Math.max(1, height), false);
  pass.resize();
  camera.aspect = Math.max(1, width) / Math.max(1, height);
  camera.updateProjectionMatrix();
}

export function startEnclaveRenderer(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  labelElements: SceneLabelElements,
  onStep: (step: number) => void
): () => void {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  const pass = createPixelPass(renderer);
  const disturbance = createDisturbance();
  const camera = new PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0, 16);
  const parts = createEnclaveParts();
  const pointer = createPointerState();
  const labels = pinLabels(parts, labelElements);
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const startedAt = performance.now();
  let spin = 0;
  let frame = 0;
  let isVisible = true;

  const render = (now: number) => {
    spin += pointer.dragVelocity;
    pointer.dragVelocity *= pointer.isDragging ? 1 : DRAG_FRICTION;
    steerTurntable(parts, pointer, spin);
    const elapsedSeconds = isReducedMotion ? REDUCED_MOTION_SECONDS : (now - startedAt) / 1000;
    animateEnclave(parts, elapsedSeconds);
    onStep(readEnclaveStep(elapsedSeconds));
    settleDisturbance(disturbance);
    const { width, height } = host.getBoundingClientRect();
    pass.render(parts.scene, camera, {
      x: disturbance.x,
      y: disturbance.y,
      strength: isReducedMotion ? 0 : disturbance.strength,
      radius: Math.min(width, height) * DISTURB_RADIUS_SHARE
    });
    placeLabels(labels, camera, host);
    frame = isVisible && !document.hidden ? requestAnimationFrame(render) : 0;
  };
  const resizeObserver = new ResizeObserver(() => resizeRenderer(renderer, pass, camera, host));
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    isVisible = entry?.isIntersecting ?? true;
    if (isVisible && !frame) frame = requestAnimationFrame(render);
  });
  const stopListening = listenToPointer(canvas, pointer);
  const stopDisturbing = listenToDisturbance(host, disturbance);
  resizeObserver.observe(host);
  visibilityObserver.observe(host);
  resizeRenderer(renderer, pass, camera, host);
  frame = requestAnimationFrame(render);

  return () => {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    stopListening();
    stopDisturbing();
    pass.dispose();
    renderer.dispose();
  };
}
