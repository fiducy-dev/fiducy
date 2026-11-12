import { describe, expect, it } from 'bun:test';

import { isPCR, normalizePCR, parsePCRList } from '../../src/attestation/index.ts';

describe('reading PCR values', () => {
  it('accepts 96 hex characters in any case with surrounding spaces', () => {
    expect(isPCR('ab'.repeat(48))).toBe(true);
    expect(isPCR(` ${'AB'.repeat(48)} `)).toBe(true);
    expect(normalizePCR(` ${'AB'.repeat(48)} `)).toBe('ab'.repeat(48));
  });

  it('refuses values of another length or with non-hex characters', () => {
    for (const value of ['', 'ab'.repeat(47), 'ab'.repeat(49), `${'ab'.repeat(47)}zz`]) {
      expect(isPCR(value)).toBe(false);
    }
  });

  it('splits a comma-separated list and drops empty entries', () => {
    const first = 'ab'.repeat(48);
    const second = 'cd'.repeat(48);
    expect(parsePCRList(` ${first.toUpperCase()} ,, ${second} `)).toEqual([first, second]);
    expect(parsePCRList(undefined)).toEqual([]);
    expect(parsePCRList(' , ')).toEqual([]);
  });
});
