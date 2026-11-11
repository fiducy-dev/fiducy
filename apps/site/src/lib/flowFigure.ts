import { offset } from '@/components/isometric';
import { LOOP_MS, blink, motion, track } from '@/lib/isoMotion';

import type { FlowLayout, FlowStage, Point } from '@/types';

export const FLOW_RATE = 0.55;

export const FLOW_HINT = 'One key, start to finish';

export const FLOW_STAGES: FlowStage[] = [
  { until: 2000, text: 'Plaintext key · in the key box' },
  { until: 2500, text: 'Plaintext key · enclave memory' },
  { until: 5600, text: 'Plaintext key · nowhere, two sealed halves' },
  { until: 7300, text: 'Plaintext key · enclave memory, 1 request' },
  { until: LOOP_MS, text: 'Plaintext key · wiped' }
];

export const FLOW_REST_STAGE = 2;

export const FLOW_LAYOUTS: Record<'row' | 'column', FlowLayout> = {
  row: {
    along: [1, -1],
    across: [1, 1],
    step: 5,
    callouts: {
      browser: [-40, -58],
      split: [92, -86],
      open: [92, -86],
      database: [340, -104],
      store: [340, 100],
      provider: [470, -44]
    }
  },
  column: {
    along: [1, 1],
    across: [1, -1],
    step: 6,
    callouts: {
      browser: [86, -26],
      split: [-86, 70],
      open: [-86, 70],
      database: [-112, 250],
      store: [112, 250],
      provider: [86, 300]
    }
  }
};

export function station({ along, across, step }: FlowLayout, t: number, s = 0): Point {
  const distance = t * step;
  return [along[0] * distance + across[0] * s, along[1] * distance + across[1] * s, 0];
}

export function travel(from: Point, to: Point): string {
  return offset(from[0] - to[0], from[1] - to[1], from[2] - to[2]);
}

export function keyFrames(from: Point, to: Point) {
  return motion([
    [200, 'none', 0],
    [500, 'none', 1],
    [900, 'none', 1],
    [1900, travel(to, from), 1],
    [2050, travel(to, from), 0]
  ]);
}

export function halfFrames(home: Point, enclave: Point) {
  return motion([
    [2300, travel(enclave, home), 0],
    [2450, travel(enclave, home), 1],
    [3400, 'none', 1],
    [4800, 'none', 1],
    [5600, travel(enclave, home), 1],
    [5700, travel(enclave, home), 0]
  ]);
}

export function callFrames(from: Point, to: Point) {
  return motion([
    [5800, 'none', 0],
    [5900, 'none', 1],
    [6500, travel(to, from), 1],
    [6600, travel(to, from), 0]
  ]);
}

export function replyFrames(from: Point, to: Point) {
  return motion([
    [6600, 'none', 0],
    [6700, 'none', 1],
    [7200, travel(to, from), 1],
    [7300, travel(to, from), 0]
  ]);
}

export const ENCLAVE_BLINK = blink(1900, 2500, 150);
export const ENCLAVE_OPEN_BLINK = blink(5600, 7300, 220);
export const WIPE_FLASH = track('opacity', [
  [7300, 0],
  [7400, 1],
  [7900, 0]
]);
export const PROVIDER_BLINK = blink(6500, 6900, 120);

export const FLOW_WINDOWS = {
  browser: [300, 2000],
  split: [2000, 3300],
  open: [5700, 7300],
  database: [3400, 5500],
  store: [3400, 5500],
  provider: [6500, 7300]
} as const;
