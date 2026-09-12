import { describe, expect, it } from 'vitest';
import { detectClassicalVerseLines } from './verse-layout';

describe('classical Chinese verse layout', () => {
  it('retains punctuation while separating five-character lines', () => {
    expect(detectClassicalVerseLines('床前明月光，疑是地上霜。举头望明月，低头思故乡。')).toEqual([
      '床前明月光，',
      '疑是地上霜。',
      '举头望明月，',
      '低头思故乡。'
    ]);
  });

  it('recognizes seven-character verse and trailing quotation marks', () => {
    expect(detectClassicalVerseLines('“两个黄鹂鸣翠柳，一行白鹭上青天。”')).toEqual([
      '“两个黄鹂鸣翠柳，',
      '一行白鹭上青天。”'
    ]);
  });

  it('does not impose metrical layout on prose or mixed-length text', () => {
    expect(detectClassicalVerseLines('今天天气很好，我们一起出去散步。')).toBeNull();
    expect(detectClassicalVerseLines('床前明月光，何事秋风悲画扇。')).toBeNull();
  });

  it('honors author-provided line breaks when the meter is regular', () => {
    expect(detectClassicalVerseLines('白日依山尽\n黄河入海流')).toEqual(['白日依山尽', '黄河入海流']);
  });
});
