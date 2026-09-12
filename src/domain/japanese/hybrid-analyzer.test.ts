import { describe, expect, it } from 'vitest';
import type { IpadicFeatures } from '@faanau/kuromoji';
import { analyzeJapaneseHybrid } from './hybrid-analyzer';

function token(surface: string, reading?: string, wordType = 'KNOWN'): IpadicFeatures {
  return {
    word_id: 1,
    word_type: wordType,
    word_position: 1,
    surface_form: surface,
    pos: '名詞',
    pos_detail_1: '*',
    pos_detail_2: '*',
    pos_detail_3: '*',
    conjugated_type: '*',
    conjugated_form: '*',
    basic_form: surface,
    reading
  };
}

describe('hybrid Japanese analyzer', () => {
  it('keeps curated standalone literary readings authoritative', () => {
    const tokenizer = { tokenize: () => [token('春風', 'シュンプウ')] };
    const result = analyzeJapaneseHybrid('春風', { 春風: ['はるかぜ', 'しゅんぷう'] }, tokenizer);
    expect(result.tokens[0]).toMatchObject({ reading: 'はるかぜ', readingSource: 'dictionary' });
  });

  it('uses morphology for inflection and mixed-script words', () => {
    const tokenizer = {
      tokenize: () => [token('行っ', 'イッ'), token('た', 'タ'), token('生ビール', 'ナマビール')]
    };
    const result = analyzeJapaneseHybrid('行った生ビール', {}, tokenizer);
    expect(result.tokens).toEqual(expect.arrayContaining([
      expect.objectContaining({ surface: '行っ', base: '行', okurigana: 'っ', reading: 'い' }),
      expect.objectContaining({ surface: '生ビール', base: '生', okurigana: 'ビール', reading: 'なま' })
    ]));
    expect(result.tokens.map(item => item.surface).join('')).toBe('行った生ビール');
  });

  it('keeps leading kana outside the ruby while preserving one lexical token', () => {
    const tokenizer = { tokenize: () => [token('しみ入る', 'シミイル')] };
    const result = analyzeJapaneseHybrid('しみ入る', {}, tokenizer);

    expect(result.tokens[0]).toMatchObject({
      surface: 'しみ入る',
      prefixKana: 'しみ',
      base: '入',
      reading: 'い',
      okurigana: 'る'
    });
  });
});
