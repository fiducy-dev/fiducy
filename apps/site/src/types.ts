import type { ReactNode } from 'react';
import type { Group, LineSegments, MeshBasicMaterial } from 'three';
import type { Object3D, OrthographicCamera, PerspectiveCamera, Scene } from 'three';
import type { Vector2, WebGLRenderTarget } from 'three';

export type Point = readonly [number, number, number];

export interface BoxProps {
  at: Point;
  size: Point;
  tone?: 'line' | 'solid';
  children?: ReactNode;
}

export interface PlateProps {
  at: Point;
  size: readonly [number, number];
  className?: string;
}

export interface LineProps {
  from: Point;
  to: Point;
  className?: string;
}

export interface TagProps {
  at: Point;
  children: ReactNode;
  className?: string;
}

export interface IsoKeyProps {
  at: Point;
  tone?: BoxProps['tone'];
  part?: 'whole' | 'bow' | 'tip';
}

export interface IsoSceneProps {
  children: ReactNode;
}

export interface LeakScene {
  label: string;
  hint: string;
  stat: string;
  title: string;
  quiet: string;
  description: string;
  scene: ReactNode;
}

export interface KeyHalves {
  storedHalf: Group;
  handleHalf: Group;
  keyFaces: MeshBasicMaterial;
}

export interface EnclaveParts {
  scene: Scene;
  turntable: Group;
  attestationFrame: LineSegments;
  request: Group;
  halves: KeyHalves;
}

export interface DitherKeyParts {
  scene: Scene;
  camera: PerspectiveCamera;
  turntable: Group;
  handleHalf: Group;
  storedHalf: Group;
  target: WebGLRenderTarget;
  cells: Vector2;
  quad: Scene;
  quadCamera: OrthographicCamera;
}

export interface PointerState {
  targetX: number;
  targetY: number;
  dragVelocity: number;
  isDragging: boolean;
  lastClientX: number;
}

export interface EnclaveCanvasProps {
  className?: string;
}

export interface SceneLabel {
  element: HTMLElement;
  anchor: Object3D;
}

export interface SceneLabelElements {
  handleHalf: HTMLElement;
  storedHalf: HTMLElement;
  request: HTMLElement;
}

export interface InfoSection {
  title: string;
  body: ReactNode;
}

export interface InfoVisualProps {
  caption: string;
}

export interface InfoPageProps {
  title: string;
  intro: string;
  sections: InfoSection[];
  visual: InfoVisualProps;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface PlanCardProps {
  id?: string;
  title: string;
  price: string;
  description: string;
  linkLabel?: string;
  linkURL?: string;
  action?: ReactNode;
}

export interface WaitlistJoinInput {
  email: string;
  source: string;
}

export type WaitlistStatus = 'idle' | 'sending' | 'joined' | 'already_joined' | 'error';

export interface WaitlistFormProps {
  source: string;
}

export type ShowcaseStep = 'key' | 'ask' | 'answer';

export interface TypingWindow {
  text: string;
  startsAt: number;
  endsAt: number;
}

export interface ShowcaseFrame {
  isFlipped: boolean;
  code: string;
  isCodeTyping: boolean;
  key: string;
  isKeySaved: boolean;
  question: string;
  isQuestionSent: boolean;
  answer: string;
  activeStep: ShowcaseStep | null;
  traceCount: number;
}

export interface ShowcaseFrameProps {
  frame: ShowcaseFrame;
}

export interface ShowcaseClock {
  elapsed: number;
  isRunning: boolean;
}

export interface CodeBlockProps {
  code: string;
}

export interface ProviderLogoProps {
  name: string;
}

export interface TypedTagProps {
  at: Point;
  text: string;
  startsAt: number;
  className: string;
}

export interface LeakCardProps {
  leak: LeakScene;
}

export interface ShaderBoxProps {
  x: number;
  y: number;
  width: number;
  height: number;
  viewWidth: number;
  viewHeight: number;
}

export interface PixelEffect {
  x: number;
  y: number;
  strength: number;
  radius: number;
}

export interface PixelPass {
  resize: () => void;
  render: (scene: Scene, camera: PerspectiveCamera, effect: PixelEffect) => void;
  dispose: () => void;
}

export interface Disturbance {
  x: number;
  y: number;
  strength: number;
  target: number;
  lastX: number;
  lastY: number;
  lastTime: number;
}
