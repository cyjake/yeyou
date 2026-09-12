import { describe, expect, it } from 'vitest';
import { validateChineseScript } from './policy';

describe('Chinese regional script policy', () => {
  it('flags likely traditional glyphs in simplified mode without changing text', () => {
    const source = '秋風悲畫扇';
    expect(validateChineseScript(source, 'zh-Hans-CN')[0]).toContain('風、畫');
    expect(source).toBe('秋風悲畫扇');
  });

  it('flags likely simplified glyphs in both traditional policies', () => {
    expect(validateChineseScript('秋风悲画扇', 'zh-Hant-TW')).toHaveLength(1);
    expect(validateChineseScript('秋風悲畫扇', 'zh-Hant-HK')).toEqual([]);
  });
});
