import { describe, expect, it } from 'vitest';
import { createInitialProject } from '../domain/document/schema';
import { parsePersonalPassages, passageFromProject, upsertPersonalPassage } from './personal-library';

describe('personal passage library', () => {
  it('saves a project as a private example and updates duplicates', () => {
    const project = createInitialProject();
    const first = passageFromProject(project);
    const saved = upsertPersonalPassage([], first);
    project.content.attribution.work = '更新后的出处';
    const updated = upsertPersonalPassage(saved, passageFromProject(project));

    expect(updated).toHaveLength(1);
    expect(updated[0].id).toBe(first.id);
    expect(updated[0].work).toBe('更新后的出处');
    expect(parsePersonalPassages(JSON.stringify(updated))).toEqual(updated);
  });

  it('rejects imported entries that pretend to be bundled content', () => {
    const passage = { ...passageFromProject(createInitialProject()), rights: 'public-domain' };
    expect(() => parsePersonalPassages(JSON.stringify([passage]))).toThrow();
  });
});
