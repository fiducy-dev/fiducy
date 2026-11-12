import type { Output } from './types.ts';

const FRAMES = ['◒', '◐', '◓', '◑'];
const FRAME_MILLISECONDS = 90;

export async function withSpinner<T>(output: Output, label: string, task: Promise<T>): Promise<T> {
  const status = output.status;
  if (!status) return task;
  let frame = 0;
  const draw = () => {
    status(
      `${output.style.command(FRAMES[frame % FRAMES.length] ?? '')} ${output.style.muted(label)}`
    );
    frame += 1;
  };
  draw();
  const timer = setInterval(draw, FRAME_MILLISECONDS);
  try {
    return await task;
  } finally {
    clearInterval(timer);
    status('');
  }
}
