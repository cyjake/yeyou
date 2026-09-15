import { describe, expect, it } from 'vitest';
import { createInitialProject } from '../document/schema';
import { planVerticalCopy } from './vertical-copy-layout';

describe('vertical copy layout', () => {
  it('balances Japanese tokens without splitting words', () => {
    const project = createInitialProject();
    const plan = planVerticalCopy(project.content.tokens, '3:4', 'bunko');
    const lengths = plan.columns.map(column => column.reduce((sum, item) => sum + Array.from(item.surface).length, 0));

    expect(plan.columns).toHaveLength(3);
    expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThanOrEqual(3);
    expect(plan.columns.flat().every(item => item.fullToken)).toBe(true);
  });

  it('adapts its column plan to the canvas ratio without oversizing type', () => {
    const project = createInitialProject();
    const portrait = planVerticalCopy(project.content.tokens, '3:4', 'bunko');
    const square = planVerticalCopy(project.content.tokens, '1:1', 'bunko');

    expect(square.columns.length).toBeGreaterThan(portrait.columns.length);
    expect(portrait.fontSizeCqw).toBeLessThanOrEqual(9);
    expect(square.fontSizeCqw).toBeLessThanOrEqual(9);
  });

  it('does not enlarge short vertical copy beyond its preferred size', () => {
    const project = createInitialProject();
    project.content.tokens = [{
      id: 'short', start: 0, end: 3, surface: '春風や', candidates: [], locked: false
    }];

    expect(planVerticalCopy(project.content.tokens, '3:4', 'bunko').fontSizeCqw).toBeLessThanOrEqual(10.2);
  });

  it('uses a calmer size for short copy distributed across three columns', () => {
    const project = createInitialProject();
    const source = '吾輩は猫である。名前はまだ無い。';
    project.content.tokens = [{
      id: 'cat', start: 0, end: source.length, surface: source, candidates: [], locked: false
    }];

    const plan = planVerticalCopy(project.content.tokens, '3:4', 'notebook');

    expect(plan.columns).toHaveLength(3);
    expect(plan.fontSizeCqw).toBeLessThanOrEqual(9.2);
  });

  it('can balance an unsegmented Chinese prose token', () => {
    const project = createInitialProject();
    const token = { ...project.content.tokens[0], surface: '天地玄黄宇宙洪荒日月盈昃辰宿列张', reading: undefined };
    const plan = planVerticalCopy([token], '1:1', 'modern-zh');

    expect(plan.columns.length).toBeGreaterThan(1);
    expect(plan.columns.flat().map(item => item.surface).join('')).toBe(token.surface);
  });

  it('keeps Chinese closing punctuation out of the start of a column', () => {
    const project = createInitialProject();
    const source = '人生天地之間，若白駒之過隙，忽然而已。';
    project.content.tokens = [{
      id: 'prose', start: 0, end: source.length, surface: source, candidates: [], locked: false
    }];

    const plan = planVerticalCopy(project.content.tokens, '3:4', 'calligraphy');
    const prohibited = new Set(Array.from('、。，．！？；：…‥）〕］｝〉》」』】'));

    expect(plan.columns).toHaveLength(3);
    expect(plan.columns.every(column => column.length === 0 || !prohibited.has(column[0].surface))).toBe(true);
    expect(plan.columns.map(column => column.map(item => item.surface).join(''))).toEqual([
      '人生天地之間，',
      '若白駒之過隙，',
      '忽然而已。'
    ]);
    expect(plan.columns.flat().map(item => item.surface).join('')).toBe(source);
  });

  it('prefers clause-ending breaks for tokenized Chinese copy with readings', () => {
    const surfaces = ['人生', '天地', '之', '間，', '若', '白駒', '之', '過', '隙，', '忽然', '而', '已。'];
    const tokens = surfaces.map((surface, index) => ({
      id: `token-${index}`,
      start: 0,
      end: surface.length,
      surface,
      reading: `讀${index}`,
      candidates: [],
      locked: false
    }));

    const plan = planVerticalCopy(tokens, '3:4', 'notebook');

    expect(plan.columns.map(column => column.map(item => item.surface).join(''))).toEqual([
      '人生天地之間，',
      '若白駒之過隙，',
      '忽然而已。'
    ]);
    expect(plan.columns.flat().every(item => item.fullToken)).toBe(true);
  });

  it('keeps Chinese opening punctuation out of the end of a column', () => {
    const project = createInitialProject();
    const source = '天地玄黃宇（宙洪荒日月）盈昃辰宿列張寒來暑往';
    project.content.tokens = [{
      id: 'brackets', start: 0, end: source.length, surface: source, candidates: [], locked: false
    }];

    const plan = planVerticalCopy(project.content.tokens, '3:4', 'modern-zh');
    const prohibited = new Set(Array.from('（〔［｛〈《「『【'));

    expect(plan.columns.length).toBeGreaterThan(1);
    expect(plan.columns.every(column => column.length === 0 || !prohibited.has(column.at(-1)!.surface))).toBe(true);
    expect(plan.columns.flat().map(item => item.surface).join('')).toBe(source);
  });
});
