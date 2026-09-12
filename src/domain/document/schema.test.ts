import { describe, expect, it } from 'vitest';
import {
  assertTokenInvariant,
  createInitialProject,
  ProjectDocumentSchema,
  reconcileLockedTokens,
  type TextToken
} from './schema';

describe('project document', () => {
  it('creates a valid, exactly reconstructable initial document', () => {
    const project = createInitialProject();
    expect(ProjectDocumentSchema.parse(project)).toEqual(project);
    expect(() => assertTokenInvariant(project.content.sourceText, project.content.tokens)).not.toThrow();
  });

  it('rejects tokens that do not reproduce the source', () => {
    expect(() => assertTokenInvariant('雪国', [plainToken('雪', 0, 1)])).toThrow(/source text/);
  });

  it('preserves a locked manual reading after re-analysis', () => {
    const previous = [{
      ...plainToken('人気', 0, 2),
      base: '人気',
      reading: 'ひとけ',
      candidates: ['にんき', 'ひとけ'],
      readingSource: 'manual' as const,
      confidence: 'medium' as const,
      locked: true
    }];
    const next = [{
      ...plainToken('人気', 0, 2),
      base: '人気',
      reading: 'にんき',
      candidates: ['にんき', 'ひとけ'],
      readingSource: 'dictionary' as const,
      confidence: 'medium' as const
    }];

    expect(reconcileLockedTokens(previous, next)[0]).toMatchObject({
      reading: 'ひとけ',
      readingSource: 'manual',
      locked: true
    });
  });
});

function plainToken(surface: string, start: number, end: number): TextToken {
  return {
    id: `test-${start}`,
    start,
    end,
    surface,
    candidates: [],
    locked: false
  };
}
