import { describe, expect, it } from 'vitest';
import type { TextToken } from '../document/schema';
import { adjacentReading, readingChoices } from './reading-choices';

const token: TextToken = {
  id: 'ten', start: 0, end: 1, surface: '天', base: '天', reading: 'てん',
  candidates: ['てん', 'あめ', 'あま'], locked: false
};

describe('inline reading choices', () => {
  it('keeps analyzer candidate order stable after a selection', () => {
    expect(readingChoices(token)).toEqual(['てん', 'あめ', 'あま']);
    expect(readingChoices({ ...token, reading: 'あめ', locked: true })).toEqual(['てん', 'あめ', 'あま']);
  });

  it('wraps in both directions and retains custom readings', () => {
    const choices = readingChoices({ ...token, reading: 'てぃん' });
    expect(choices).toEqual(['てん', 'あめ', 'あま', 'てぃん']);
    expect(adjacentReading(choices, 'てぃん', 1)).toBe('てん');
    expect(adjacentReading(choices, 'てん', -1)).toBe('てぃん');
  });
});
