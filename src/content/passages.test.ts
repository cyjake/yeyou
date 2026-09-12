import { describe, expect, it } from 'vitest';
import { curatedPassages } from './passages';

describe('curated passage library', () => {
  it('ships varied, traceable examples with explicit rights labels', () => {
    expect(curatedPassages).toHaveLength(45);
    expect(new Set(curatedPassages.map(item => item.id)).size).toBe(45);
    expect(curatedPassages.filter(item => item.language === 'ja')).toHaveLength(25);
    expect(curatedPassages.filter(item => item.language === 'zh')).toHaveLength(20);
    for (const passage of curatedPassages) {
      expect(passage.sourceText).not.toBe('');
      if (passage.language === 'ja') expect(passage.readingKana).toMatch(/^[ぁ-ゖー]+$/);
      else expect(passage.readingKana).toBeUndefined();
      if (passage.sourceUrl) expect(passage.sourceUrl).toMatch(/^https:\/\//);
      expect(['public-domain', 'quotation']).toContain(passage.rights);
      expect(passage.translationSource).toBe('editorial');
    }
    expect(curatedPassages.find(item => item.id === 'studio-snow-country')?.rights).toBe('quotation');
    expect(new Set(curatedPassages.filter(item => item.language === 'ja').map(item => item.author)).size).toBeGreaterThanOrEqual(7);
  });
});
