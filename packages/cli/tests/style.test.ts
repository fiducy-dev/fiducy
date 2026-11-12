import { describe, expect, it } from 'bun:test';

import { createStyle, shouldUseColor } from '../src/style.ts';

describe('output style', () => {
  it('colors only a terminal, and respects NO_COLOR and FORCE_COLOR', () => {
    expect(shouldUseColor({ isTTY: true }, {})).toBe(true);
    expect(shouldUseColor({ isTTY: false }, {})).toBe(false);
    expect(shouldUseColor({ isTTY: true }, { NO_COLOR: '1' })).toBe(false);
    expect(shouldUseColor({ isTTY: true }, { TERM: 'dumb' })).toBe(false);
    expect(shouldUseColor({ isTTY: false }, { FORCE_COLOR: '1' })).toBe(true);
  });

  it('leaves text untouched without color', () => {
    const style = createStyle(false);
    expect(style.success('Created')).toBe('Created');
    expect(style.code('a\n\nb')).toBe('  a\n\n  b');
  });

  it('highlights commands and links in prose', () => {
    const style = createStyle(true);
    const note = style.prose(
      'Next: npx fiducy migrate creates the table. See https://fiducy.dev/docs.'
    );
    expect(note).toContain(style.command('npx fiducy migrate'));
    expect(note).toContain(style.command('https://fiducy.dev/docs'));
    expect(note).toEndWith('docs\u001b[39m.');
  });
});
