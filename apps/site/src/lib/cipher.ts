const CIPHER_GLYPHS = '0123456789abcdef';

export const CIPHER_FRAME_MILLISECONDS = 28;
export const CIPHER_STEP = 0.2;
export const CIPHER_SETTLED_EVERY = 5;
export const CIPHER_TOUCH_HOLD_MILLISECONDS = 1400;

function randomGlyph() {
  return CIPHER_GLYPHS[Math.floor(Math.random() * CIPHER_GLYPHS.length)];
}

export function encipher(word: string, progress: number) {
  const sealedCount = Math.ceil(progress * word.length);
  return Array.from(word, (_, index) => (index < sealedCount ? randomGlyph() : ' ')).join('');
}

export function moveToward(progress: number, isSealed: boolean) {
  return isSealed ? Math.min(1, progress + CIPHER_STEP) : Math.max(0, progress - CIPHER_STEP);
}

const NOISE_ROWS = 9;
const NOISE_COLUMNS_PER_CHARACTER = 5;
const NOISE_DENSITY = 0.5;
const NOISE_SHADES = ['#e9e9e9', '#dadada', '#cccccc'];

export function pixelNoise(word: string) {
  const columns = word.length * NOISE_COLUMNS_PER_CHARACTER;
  let pixels = '';
  for (let row = 0; row < NOISE_ROWS; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (Math.random() > NOISE_DENSITY) continue;
      const shade = NOISE_SHADES[Math.floor(Math.random() * NOISE_SHADES.length)];
      pixels += `<rect x="${column}" y="${row}" width="1" height="1" fill="${shade}"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${columns} ${NOISE_ROWS}" preserveAspectRatio="none" shape-rendering="crispEdges">${pixels}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
