import { describe, expect, it } from 'vitest';
import { createInitialProject } from '../document/schema';
import { CreativeSuggestionSchema, suggestLocally } from './suggestions';

describe('creative suggestion boundary', () => {
  it('returns a validated deterministic recipe without changing the document', () => {
    const project = createInitialProject();
    const source = project.content.sourceText;
    const suggestion = suggestLocally(project);
    expect(CreativeSuggestionSchema.parse(suggestion)).toEqual(suggestion);
    expect(project.content.sourceText).toBe(source);
  });
});
