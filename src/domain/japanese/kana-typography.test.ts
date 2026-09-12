import { describe, expect, it } from 'vitest';
import { isSmallKana } from './kana-typography';

describe('kana typography', () => {
  it('distinguishes contracted and geminated kana from their full-size forms', () => {
    expect(Array.from('こっきょう').filter(isSmallKana)).toEqual(['っ', 'ょ']);
    expect(['つ', 'よ', 'う'].some(isSmallKana)).toBe(false);
  });

  it('includes small katakana and Ainu extensions', () => {
    expect(['ッ', 'ョ', 'ㇰ'].every(isSmallKana)).toBe(true);
  });
});
