import { LinearFilter, WebGLRenderTarget } from 'three';

import type { AsciiGrid, AsciiPass } from '@/types';
import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three';

const FONT_SIZE = 8;
const LINE_HEIGHT = 9;
const SAMPLES_X = 3;
const SAMPLES_Y = 6;
const EMPTY_COVERAGE = 0.08;
const STROKE_COVERAGE = 0.38;
const MIN_ANISOTROPY = 0.4;
const RAMP = ' .,:;=+*#%@';
const FAINT_CHARACTERS = '.,:';
const INK = '#000000';
const FAINT_INK = '#8a8a8a';
const FONT = `${FONT_SIZE}px "Geist Mono Variable", ui-monospace, monospace`;

function pickStroke(angle: number): string {
  const degrees = (angle * 180) / Math.PI;
  if (Math.abs(degrees) < 22.5) return '-';
  if (Math.abs(degrees) > 67.5) return '|';
  return degrees > 0 ? '/' : '\\';
}

function readCell(pixels: Uint8Array, width: number, cellX: number, cellY: number): string {
  let mass = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumYY = 0;
  let sumXY = 0;
  for (let y = 0; y < SAMPLES_Y; y += 1) {
    for (let x = 0; x < SAMPLES_X; x += 1) {
      const index = ((cellY * SAMPLES_Y + y) * width + cellX * SAMPLES_X + x) * 4;
      const red = pixels[index] ?? 255;
      const green = pixels[index + 1] ?? 255;
      const blue = pixels[index + 2] ?? 255;
      const darkness = 1 - (red + green + blue) / 765;
      if (darkness <= 0) continue;
      const px = x;
      const py = y;
      mass += darkness;
      sumX += darkness * px;
      sumY += darkness * py;
      sumXX += darkness * px * px;
      sumYY += darkness * py * py;
      sumXY += darkness * px * py;
    }
  }
  const coverage = mass / (SAMPLES_X * SAMPLES_Y);
  if (coverage < EMPTY_COVERAGE) return ' ';
  if (coverage < STROKE_COVERAGE) {
    const meanX = sumX / mass;
    const meanY = sumY / mass;
    const varianceX = sumXX / mass - meanX * meanX;
    const varianceY = sumYY / mass - meanY * meanY;
    const covariance = sumXY / mass - meanX * meanY;
    const spread = Math.hypot(varianceX - varianceY, 2 * covariance);
    const anisotropy = spread / Math.max(1e-6, varianceX + varianceY);
    if (anisotropy >= MIN_ANISOTROPY) {
      return pickStroke(0.5 * Math.atan2(2 * covariance, varianceX - varianceY));
    }
  }
  const index = Math.min(RAMP.length - 1, Math.floor(Math.sqrt(coverage) * RAMP.length));
  return RAMP[index] ?? '@';
}

function measureGrid(context: CanvasRenderingContext2D, width: number, height: number): AsciiGrid {
  context.font = FONT;
  const cellWidth = context.measureText('M').width;
  return {
    columns: Math.max(1, Math.floor(width / cellWidth)),
    rows: Math.max(1, Math.floor(height / LINE_HEIGHT)),
    cellWidth
  };
}

export function createAsciiPass(renderer: WebGLRenderer, canvas: HTMLCanvasElement): AsciiPass {
  const context = canvas.getContext('2d');
  const target = new WebGLRenderTarget(1, 1, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    samples: 4
  });
  let grid: AsciiGrid = { columns: 1, rows: 1, cellWidth: FONT_SIZE };
  let pixels = new Uint8Array(4);

  return {
    resize(width, height) {
      if (!context) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      grid = measureGrid(context, width, height);
      target.setSize(grid.columns * SAMPLES_X, grid.rows * SAMPLES_Y);
      pixels = new Uint8Array(grid.columns * SAMPLES_X * grid.rows * SAMPLES_Y * 4);
    },
    render(scene, camera) {
      if (!context) return;
      const width = grid.columns * SAMPLES_X;
      renderer.setRenderTarget(target);
      renderer.setClearColor(0xffffff, 1);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(target, 0, 0, width, grid.rows * SAMPLES_Y, pixels);
      renderer.setRenderTarget(null);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.font = FONT;
      context.textBaseline = 'top';
      for (let row = 0; row < grid.rows; row += 1) {
        const sourceRow = grid.rows - 1 - row;
        let strong = '';
        let faint = '';
        for (let column = 0; column < grid.columns; column += 1) {
          const character = readCell(pixels, width, column, sourceRow);
          const isFaint = FAINT_CHARACTERS.includes(character);
          strong += isFaint ? ' ' : character;
          faint += isFaint ? character : ' ';
        }
        const top = row * LINE_HEIGHT;
        context.fillStyle = INK;
        context.fillText(strong, 0, top);
        context.fillStyle = FAINT_INK;
        context.fillText(faint, 0, top);
      }
    },
    dispose() {
      target.dispose();
    }
  };
}
