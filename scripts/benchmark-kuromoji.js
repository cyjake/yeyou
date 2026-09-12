'use strict';

const path = require('node:path');
const kuromoji = require('@faanau/kuromoji');
const corpus = require('../tests/fixtures/japanese-reading-corpus.json');

const dictionaryPath = path.resolve(__dirname, '../node_modules/@faanau/kuromoji/dict');

function toHiragana(value = '') {
  return value.replace(/[ァ-ヶ]/g, character =>
    String.fromCharCode(character.charCodeAt(0) - 0x60)
  );
}

function rubyPair(token) {
  const surface = token.surface_form;
  const lastKanji = Math.max(...Array.from(surface, (character, index) =>
    /[\u4E00-\u9FFF]/.test(character) ? index : -1
  ));
  if (lastKanji < 0 || !token.reading || token.reading === '*') return undefined;

  const base = surface.slice(0, lastKanji + 1);
  const suffix = toHiragana(surface.slice(lastKanji + 1));
  const fullReading = toHiragana(token.reading);
  const reading = suffix && fullReading.endsWith(suffix)
    ? fullReading.slice(0, -suffix.length)
    : fullReading;

  return [base, reading];
}

function containsExpectedPair(actualPairs, expectedPair) {
  return actualPairs.some(pair => pair[0] === expectedPair[0] && pair[1] === expectedPair[1]);
}

function buildTokenizer() {
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: dictionaryPath }).build((error, tokenizer) => {
      if (error) reject(error);
      else resolve(tokenizer);
    });
  });
}

async function main() {
  const tokenizer = await buildTokenizer();
  const results = corpus.map(testCase => {
    const actualPairs = tokenizer.tokenize(testCase.input).map(rubyPair).filter(Boolean);
    const passed = testCase.expectedRuby.every(pair => containsExpectedPair(actualPairs, pair));
    return { ...testCase, actualPairs, passed };
  });

  const baseline = results.filter(result => result.expectation === 'baseline');
  const challenges = results.filter(result => result.expectation === 'known-limitation');
  const baselinePassed = baseline.filter(result => result.passed).length;
  const challengesPassed = challenges.filter(result => result.passed).length;

  console.log(`Kuromoji benchmark: ${results.length} cases`);
  console.log(`Baseline: ${baselinePassed}/${baseline.length}`);
  console.log(`Context challenges: ${challengesPassed}/${challenges.length}`);

  for (const result of results.filter(item => !item.passed)) {
    console.log(`- ${result.expectation}: ${result.id}`);
    console.log(`  expected ${JSON.stringify(result.expectedRuby)}`);
    console.log(`  actual   ${JSON.stringify(result.actualPairs)}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
