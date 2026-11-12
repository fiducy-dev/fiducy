import { offset } from '@/components/isometric';
import { blink, motion, track } from '@/lib/isoMotion';

import type { FlowLayout, FlowStage, MotionClock, Point } from '@/types';

export const FLOW_RATE = 0.7;

export const FLOW_HINT = 'One key, every call';

export const SETUP_MS = 3600;
export const CALL_MS = 3600;

export const SETUP_CLOCK: MotionClock = { span: SETUP_MS, isOnce: true };
export const CALL_CLOCK: MotionClock = { span: CALL_MS, delay: SETUP_MS };

export const FLOW_PROVIDERS = ['openai', 'anthropic', 'gemini', 'openrouter'] as const;
const PROVIDER_SPAN = CALL_MS * FLOW_PROVIDERS.length;
const PROVIDER_FADE_MS = 150;

export const PROVIDER_CLOCK: MotionClock = { span: PROVIDER_SPAN, delay: SETUP_MS };

export const SETUP_STAGES: FlowStage[] = [
  { until: 1300, text: 'Plaintext key · in the client' },
  { until: 1900, text: 'Plaintext key · enclave memory' },
  { until: SETUP_MS, text: 'Plaintext key · nowhere, two sealed halves' }
];

export const CALL_STAGES: FlowStage[] = [
  { until: 900, text: 'halves fetched, still sealed' },
  { until: 2600, text: 'plaintext key in enclave, 1 request' },
  { until: CALL_MS, text: 'plaintext key wiped' }
];

export const FLOW_REST_TEXT = 'Plaintext key · nowhere, two sealed halves';

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
  return motion(
    [
      [200, 'none', 0],
      [400, 'none', 1],
      [600, 'none', 1],
      [1300, travel(to, from), 1],
      [1400, travel(to, from), 0]
    ],
    SETUP_MS
  );
}

export function storeFrames(home: Point, enclave: Point) {
  return motion(
    [
      [1800, travel(enclave, home), 0],
      [1900, travel(enclave, home), 1],
      [2700, 'none', 1]
    ],
    SETUP_MS
  );
}

export function fetchFrames(home: Point, enclave: Point) {
  return motion(
    [
      [0, 'none', 0],
      [100, 'none', 1],
      [800, travel(enclave, home), 1],
      [900, travel(enclave, home), 0]
    ],
    CALL_MS
  );
}

export function callFrames(from: Point, to: Point) {
  return motion(
    [
      [1000, 'none', 0],
      [1100, 'none', 1],
      [1700, travel(to, from), 1],
      [1800, travel(to, from), 0]
    ],
    CALL_MS
  );
}

export function replyFrames(from: Point, to: Point) {
  return motion(
    [
      [1800, 'none', 0],
      [1900, 'none', 1],
      [2500, travel(to, from), 1],
      [2600, travel(to, from), 0]
    ],
    CALL_MS
  );
}

export const ENCLAVE_BLINK = blink(1300, 1900, 150, SETUP_MS);
export const ENCLAVE_OPEN_BLINK = blink(900, 2600, 220, CALL_MS);
export const WIPE_FLASH = track(
  'opacity',
  [
    [2600, 0],
    [2700, 1],
    [3200, 0]
  ],
  CALL_MS
);
export const PROVIDER_BLINK = blink(1700, 2000, 120, CALL_MS);

export const SETUP_WINDOWS = {
  browser: [200, 1300],
  split: [1300, 2200],
  database: [2400, 3300],
  store: [2400, 3300]
} as const;

export const CALL_WINDOWS = {
  open: [900, 2500]
} as const;

export function providerWindow(index: number): readonly [number, number] {
  const start = index * CALL_MS;
  return [start + 1700, start + 2500];
}

export function providerLabelFrames(index: number): Keyframe[] {
  const start = index * CALL_MS;
  const end = start + CALL_MS;
  if (index === 0) {
    return track(
      'opacity',
      [
        [0, 1],
        [end - PROVIDER_FADE_MS, 1],
        [end, 0],
        [PROVIDER_SPAN - PROVIDER_FADE_MS, 0],
        [PROVIDER_SPAN, 1]
      ],
      PROVIDER_SPAN
    );
  }
  return track(
    'opacity',
    [
      [start - PROVIDER_FADE_MS, 0],
      [start, 1],
      [end - PROVIDER_FADE_MS, 1],
      [end, 0]
    ],
    PROVIDER_SPAN
  );
}
