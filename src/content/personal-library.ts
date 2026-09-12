import { z } from 'zod';
import type { ProjectDocument } from '../domain/document/schema';
import type { CuratedPassage } from './passages';

export const PERSONAL_PASSAGES_KEY = 'yeyou-personal-passages-v1';

const PersonalPassageSchema = z.object({
  id: z.string().min(1),
  language: z.enum(['ja', 'zh']),
  mood: z.enum(['静谧', '旅情', '季节', '童心', '相思', '豪情', '清醒']),
  sourceText: z.string().min(1),
  readingKana: z.string().optional(),
  translationZh: z.string(),
  author: z.string(),
  work: z.string(),
  sourceUrl: z.string().url().optional(),
  rights: z.literal('personal'),
  translationSource: z.literal('user'),
  suggestedTemplate: z.enum(['bunko', 'cinema', 'notebook', 'modern-zh', 'calligraphy'])
});

const PersonalLibrarySchema = z.array(PersonalPassageSchema);

export function loadPersonalPassages(): CuratedPassage[] {
  if (typeof window === 'undefined') return [];
  try {
    return PersonalLibrarySchema.parse(JSON.parse(window.localStorage.getItem(PERSONAL_PASSAGES_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

export function persistPersonalPassages(passages: CuratedPassage[]): void {
  window.localStorage.setItem(PERSONAL_PASSAGES_KEY, JSON.stringify(passages));
}

export function passageFromProject(project: ProjectDocument): CuratedPassage {
  return {
    id: `mine-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    language: project.locale === 'ja-JP' ? 'ja' : 'zh',
    mood: '清醒',
    sourceText: project.content.sourceText.trim(),
    translationZh: project.content.translationZh,
    author: project.content.attribution.author,
    work: project.content.attribution.work,
    rights: 'personal',
    translationSource: 'user',
    suggestedTemplate: project.layout.template
  };
}

export function upsertPersonalPassage(passages: CuratedPassage[], passage: CuratedPassage): CuratedPassage[] {
  const duplicate = passages.findIndex(item =>
    item.language === passage.language && item.sourceText === passage.sourceText
  );
  if (duplicate < 0) return [passage, ...passages];
  return passages.map((item, index) => index === duplicate ? { ...passage, id: item.id } : item);
}

export function parsePersonalPassages(value: string): CuratedPassage[] {
  return PersonalLibrarySchema.parse(JSON.parse(value));
}
