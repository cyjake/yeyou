import kuromoji, { type Tokenizer } from '@faanau/kuromoji';
import { describe, expect, it } from 'vitest';
import dictionary from '../../../kanji_to_hiragana.json';
import corpus from '../../../tests/fixtures/japanese-reading-corpus.json';
import { analyzeJapaneseHybrid } from './hybrid-analyzer';

function buildTokenizer(): Promise<Tokenizer> {
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: 'node_modules/@faanau/kuromoji/dict' }).build((error, tokenizer) => {
      if (error) reject(error);
      else resolve(tokenizer);
    });
  });
}

describe('hybrid analyzer corpus', () => {
  it('preserves the curated baseline and improves contextual phrases', async () => {
    const tokenizer = await buildTokenizer();
    const results = corpus.map(testCase => {
      const pairs = analyzeJapaneseHybrid(testCase.input, dictionary, tokenizer).tokens
        .filter(token => token.reading)
        .map(token => [token.base ?? token.surface, token.reading]);
      const passed = testCase.expectedRuby.every(expected =>
        pairs.some(actual => actual[0] === expected[0] && actual[1] === expected[1])
      );
      return { ...testCase, passed };
    });

    const baseline = results.filter(result => result.expectation === 'baseline');
    const contextual = results.filter(result => result.expectation === 'known-limitation');
    expect(baseline.filter(result => result.passed)).toHaveLength(40);
    expect(contextual.filter(result => result.passed).length).toBeGreaterThanOrEqual(3);
  });

  it('annotates only 入 in Bashō’s しみ入る', async () => {
    const tokenizer = await buildTokenizer();
    const result = analyzeJapaneseHybrid('閑さや岩にしみ入る蝉の声', dictionary, tokenizer);
    const token = result.tokens.find(item => item.surface === 'しみ入る');

    expect(token).toMatchObject({
      prefixKana: 'しみ',
      base: '入',
      reading: 'い',
      okurigana: 'る'
    });
  });
});
