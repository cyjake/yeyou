import { describe, expect, it } from 'vitest';
import { analyzeJapanese, buildOkuriganaSet, splitJapaneseScripts } from './analyzer';

const dictionary = {
  国境: ['こっきょう', 'くにざかい'],
  長: ['なが', 'ちょう'],
  長い: ['ながい'],
  夜: ['よる']
};

describe('Japanese analyzer adapter', () => {
  it('preserves every source character while producing structured ruby tokens', () => {
    const source = '国境の長い夜。';
    const result = analyzeJapanese(source, dictionary, buildOkuriganaSet(dictionary));

    expect(result.tokens.map(token => token.surface).join('')).toBe(source);
    expect(result.tokens).toEqual(expect.arrayContaining([
      expect.objectContaining({ surface: '国境', reading: 'こっきょう', confidence: 'medium' }),
      expect.objectContaining({ surface: '長い', base: '長', okurigana: 'い', reading: 'なが' }),
      expect.objectContaining({ surface: '夜', reading: 'よる' })
    ]));
  });

  it('returns an empty analysis for empty input', () => {
    expect(analyzeJapanese('', dictionary).tokens).toEqual([]);
    expect(splitJapaneseScripts('')).toEqual([]);
  });

  it('marks ambiguous single-kanji fallbacks for review', () => {
    const result = analyzeJapanese('長', dictionary);
    expect(result.tokens[0]).toMatchObject({ reading: 'なが', confidence: 'low' });
    expect(result.uncertainCount).toBe(1);
  });
});
