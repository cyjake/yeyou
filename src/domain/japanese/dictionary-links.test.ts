import { describe, expect, it } from 'vitest';
import { dictionaryLinksFor } from './dictionary-links';

describe('external Japanese dictionary links', () => {
  it('links a complete inflected word to reachable dictionary searches', () => {
    expect(dictionaryLinksFor('長い')).toEqual([
      { label: 'MOJi辞書', href: 'https://www.mojidict.com/searchText/%E9%95%B7%E3%81%84' },
      { label: 'Jisho', href: 'https://jisho.org/search/%E9%95%B7%E3%81%84' }
    ]);
  });

  it('looks up kanji together with its okurigana', () => {
    expect(dictionaryLinksFor('巡る')[0].href).toMatch(/\/%E5%B7%A1%E3%82%8B$/);
  });
});
