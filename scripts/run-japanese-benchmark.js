'use strict';

const dictionary = require('../kanji_to_hiragana.json');
const corpus = require('../tests/fixtures/japanese-reading-corpus.json');
const engine = require('../legacy/ruby-engine.js');

const okuriganaSet = engine.buildOkuriganaKanjiSet(dictionary);

function rubyPairs(html) {
    return Array.from(html.matchAll(/<ruby>(.*?)<rt>(.*?)<\/rt><\/ruby>/g), match => [match[1], match[2]]);
}

function containsExpectedPair(actualPairs, expectedPair) {
    return actualPairs.some(pair => pair[0] === expectedPair[0] && pair[1] === expectedPair[1]);
}

const results = corpus.map(testCase => {
    const html = engine.generateRubyHtml(testCase.input, dictionary, okuriganaSet);
    const actualPairs = rubyPairs(html);
    const passed = testCase.expectedRuby.every(pair => containsExpectedPair(actualPairs, pair));
    return { ...testCase, actualPairs, passed };
});

const baseline = results.filter(result => result.expectation === 'baseline');
const challenges = results.filter(result => result.expectation === 'known-limitation');
const baselinePassed = baseline.filter(result => result.passed).length;
const challengesPassed = challenges.filter(result => result.passed).length;

console.log(`Japanese reading benchmark: ${results.length} cases`);
console.log(`Baseline: ${baselinePassed}/${baseline.length}`);
console.log(`Context challenges: ${challengesPassed}/${challenges.length}`);

for (const result of results.filter(item => !item.passed)) {
    console.log(`- ${result.expectation}: ${result.id}`);
    console.log(`  expected ${JSON.stringify(result.expectedRuby)}`);
    console.log(`  actual   ${JSON.stringify(result.actualPairs)}`);
}

if (baselinePassed !== baseline.length) {
    process.exitCode = 1;
}
