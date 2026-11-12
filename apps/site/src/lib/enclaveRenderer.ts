import { MathUtils, Object3D, PerspectiveCamera, Vector3 } from 'three';
import { WebGLRenderer } from 'three';

import { PROVIDERS } from '@/lib/constants';
import { animateEnclave, createEnclaveParts, readEnclaveStep } from '@/lib/enclaveScene';
import { readProviderIndex } from '@/lib/enclaveScene';

import type { EnclaveParts, PointerState } from '@/types';
import type { SceneLabel, SceneLabelElements } from '@/types';

const MAX_PIXEL_RATIO = 2;
const BASE_PITCH = 0.42;
const BASE_YAW = -0.62;
const POINTER_YAW = 0.55;
const POINTER_PITCH = 0.3;
const FOLLOW_RATE = 0.06;
const DRAG_FRICTION = 0.94;
const REDUCED_MOTION_SECONDS = 6.5;

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
  camera: PerspectiveCamera,
  host: HTMLElement
): void {
  const { width, height } = host.getBoundingClientRect();
  renderer.setSize(Math.max(1, width), Math.max(1, height), false);
  camera.aspect = Math.max(1, width) / Math.max(1, height);
  camera.updateProjectionMatrix();
}

export function startEnclaveRenderer(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  labelElements: SceneLabelElements,
  onStep: (step: number) => void
): () => void {
  let providerIndex = -1;
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  const camera = new PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0, 14.5);
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
    const nextProvider = readProviderIndex(elapsedSeconds);
    if (nextProvider !== providerIndex) {
      providerIndex = nextProvider;
      labelElements.provider.textContent = PROVIDERS[providerIndex] ?? '';
    }
    renderer.render(parts.scene, camera);
    placeLabels(labels, camera, host);
    frame = isVisible && !document.hidden ? requestAnimationFrame(render) : 0;
  };
  const resizeObserver = new ResizeObserver(() => resizeRenderer(renderer, camera, host));
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    isVisible = entry?.isIntersecting ?? true;
    if (isVisible && !frame) frame = requestAnimationFrame(render);
  });
  const stopListening = listenToPointer(canvas, pointer);
  resizeObserver.observe(host);
  visibilityObserver.observe(host);
  resizeRenderer(renderer, camera, host);
  frame = requestAnimationFrame(render);

  return () => {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    stopListening();
    renderer.dispose();
  };
}
