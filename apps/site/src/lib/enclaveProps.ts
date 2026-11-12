import { BoxGeometry, Group, type MeshToonMaterial } from 'three';

import { createLineArt, createSolidFaces, glassLines } from '@/lib/enclaveGeometry';

import type { ClientWindow, ProviderBlock } from '@/types';

const WINDOW_WIDTH = 2.0;
const WINDOW_HEIGHT = 1.4;
const WINDOW_DEPTH = 0.1;
const BUBBLE_DEPTH = 0.05;
const PROVIDER_SIZE = 2.6;
const ANSWER_GRAY = 0xd6d6d6;

function createBubble(width: number, faces: MeshToonMaterial, x: number, y: number): Group {
  const bubble = createLineArt(new BoxGeometry(width, 0.2, BUBBLE_DEPTH), faces);
  bubble.position.set(x, y, WINDOW_DEPTH / 2 + BUBBLE_DEPTH / 2);
  bubble.scale.setScalar(0);
  return bubble;
}

export function createClientWindow(): ClientWindow {
  const group = new Group();
  const frame = createLineArt(
    new BoxGeometry(WINDOW_WIDTH, WINDOW_HEIGHT, WINDOW_DEPTH),
    createSolidFaces()
  );
  const titleBar = createLineArt(
    new BoxGeometry(WINDOW_WIDTH, 0.22, WINDOW_DEPTH + 0.02),
    createSolidFaces(),
    glassLines
  );
  titleBar.position.y = WINDOW_HEIGHT / 2 - 0.11;
  const answerFaces = createSolidFaces();
  answerFaces.color.setHex(ANSWER_GRAY);
  const question = createBubble(0.9, createSolidFaces(), 0.4, 0.2);
  const answer = createBubble(1.2, answerFaces, -0.27, -0.18);
  group.add(frame, titleBar, question, answer);
  return { group, question, answer };
}

export function createProviderBlock(): ProviderBlock {
  const faces = createSolidFaces();
  const group = createLineArt(new BoxGeometry(PROVIDER_SIZE, PROVIDER_SIZE, PROVIDER_SIZE), faces);
  return { group, faces };
}
