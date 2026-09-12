'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const dictionary = require('../kanji_to_hiragana.json');
const engine = require('../legacy/ruby-engine.js');

const okuriganaSet = engine.buildOkuriganaKanjiSet(dictionary);

test('splitByScript preserves the complete source text', () => {
    const source = '東京2026、長いトンネル。\n雪国';
    assert.equal(engine.splitByScript(source).join(''), source);
});

test('user-authored markup is escaped', () => {
    const html = engine.generateRubyHtml('<img src=x onerror=alert(1)>雪国', dictionary, okuriganaSet);
    assert.match(html, /^&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.doesNotMatch(html, /<img/i);
    assert.match(html, /<ruby>雪国<rt>ゆきぐに<\/rt><\/ruby>/);
});

test('okurigana keeps the full reading as editable state', () => {
    const html = engine.generateRubyHtml('長い', dictionary, okuriganaSet);
    assert.match(html, /data-okurigana="長い"/);
    assert.match(html, /data-reading="ながい"/);
    assert.match(html, /<ruby>長<rt>なが<\/rt><\/ruby><span class="okurigana">い<\/span>/);
});

test('longest okurigana match is preferred', () => {
    const html = engine.generateRubyHtml('美しい', dictionary, okuriganaSet);
    assert.match(html, /data-okurigana="美しい"/);
    assert.match(html, /data-reading="うつくしい"/);
});

test('empty input is valid', () => {
    assert.equal(engine.generateRubyHtml('', dictionary, okuriganaSet), '');
    assert.deepEqual(engine.splitByScript(''), []);
});
