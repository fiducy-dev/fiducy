import type { MotionClock } from '@/types';

export const LOOP_MS = 8000;
export const LOOP_CLOCK: MotionClock = { span: LOOP_MS };
const RAMP_MS = 450;

type Value = string | number;
export type Stop = readonly [number, Value];

function at(milliseconds: number, span: number): number {
  return Math.min(1, Math.max(0, milliseconds / span));
}

export function track(property: string, stops: Stop[], span = LOOP_MS): Keyframe[] {
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (!first || !last) return [];
  const frames = stops.map(([time, value]) => ({ offset: at(time, span), [property]: value }));
  if (first[0] > 0) frames.unshift({ offset: 0, [property]: first[1] });
  if (last[0] < span) frames.push({ offset: 1, [property]: last[1] });
  return frames;
}

export function shown(
  property: string,
  [from, to]: readonly [number, number],
  [hidden, visible]: readonly [Value, Value],
  ramp = RAMP_MS,
  span = LOOP_MS
): Keyframe[] {
  return track(
    property,
    [
      [from, hidden],
      [from + ramp, visible],
      [to, visible],
      [Math.min(span, to + ramp), hidden]
    ],
    span
  );
}

export type Pose = readonly [number, string, number];

export function motion(poses: Pose[], span = LOOP_MS): Keyframe[] {
  const first = poses[0];
  const last = poses[poses.length - 1];
  if (!first || !last) return [];
  const frames = poses.map(([time, transform, opacity]) => ({
    offset: at(time, span),
    transform,
    opacity
  }));
  if (first[0] > 0) frames.unshift({ offset: 0, transform: first[1], opacity: first[2] });
  if (last[0] < span) frames.push({ offset: 1, transform: last[1], opacity: last[2] });
  return frames;
}

export function blink(from: number, to: number, every = 260, span = LOOP_MS): Keyframe[] {
  const stops: Stop[] = [[0, 0.2]];
  for (let time = from; time < to; time += every * 2) {
    stops.push([time, 0.2], [time + every / 2, 1], [time + every, 0.2]);
  }
  return track('opacity', stops, span);
}
