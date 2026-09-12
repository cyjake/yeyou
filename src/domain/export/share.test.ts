import { describe, expect, it } from 'vitest';
import { canCopyPng, canSharePng } from './share';

describe('image sharing capabilities', () => {
  it('fails capability checks safely outside a supporting browser', () => {
    expect(canCopyPng()).toBe(false);
    expect(canSharePng()).toBe(false);
  });
});
