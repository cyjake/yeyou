import { create } from 'zustand';
import {
  createInitialProject,
  assertTokenInvariant,
  ProjectDocumentSchema,
  reconcileLockedTokens,
  type Attribution,
  type ProjectDocument,
  type TextToken
} from './schema';
import type { CuratedPassage } from '../../content/passages';

type AnalysisStatus = 'idle' | 'loading' | 'ready' | 'error';

type ProjectState = {
  project: ProjectDocument;
  preservedTokens: TextToken[];
  past: ProjectDocument[];
  future: ProjectDocument[];
  analysisStatus: AnalysisStatus;
  analysisError?: string;
  uncertainCount: number;
  setSourceText: (sourceText: string) => void;
  applyAnalysis: (sourceText: string, tokens: TextToken[]) => void;
  setAnalysisStatus: (status: AnalysisStatus, error?: string) => void;
  updateAttribution: (field: keyof Attribution, value: string) => void;
  setTranslation: (value: string) => void;
  setContextNote: (value: string) => void;
  setLocale: (locale: ProjectDocument['locale']) => void;
  setTemplate: (template: ProjectDocument['layout']['template']) => void;
  setDirection: (direction: 'vertical' | 'horizontal') => void;
  setRatio: (ratio: '3:4' | '4:5' | '1:1') => void;
  setExportFormat: (format: 'png' | 'pdf') => void;
  loadPassage: (passage: CuratedPassage) => void;
  setTokenReading: (tokenId: string, reading: string) => void;
  undo: () => void;
  redo: () => void;
};

function touch(project: ProjectDocument): ProjectDocument {
  return { ...project, updatedAt: new Date().toISOString() };
}

function remainingUncertain(tokens: TextToken[]): number {
  return tokens.filter(item => item.confidence === 'low' && !item.locked).length;
}

function commit(state: ProjectState, project: ProjectDocument) {
  return {
    past: [...state.past, state.project].slice(-100),
    future: [],
    project: touch(project)
  };
}

export const PROJECT_STORAGE_KEY = 'yeyou-project-v1';
const LEGACY_PROJECT_STORAGE_KEY = 'kotonoha-project-v1';

const initialProject = loadStoredProject() ?? createInitialProject();

function loadStoredProject(): ProjectDocument | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const stored = window.localStorage.getItem(PROJECT_STORAGE_KEY)
      ?? window.localStorage.getItem(LEGACY_PROJECT_STORAGE_KEY);
    if (!stored) return undefined;
    const parsed = ProjectDocumentSchema.safeParse(JSON.parse(stored));
    if (!parsed.success) return undefined;
    assertStoredTokens(parsed.data);
    return parsed.data;
  } catch {
    return undefined;
  }
}

function assertStoredTokens(project: ProjectDocument): void {
  assertTokenInvariant(project.content.sourceText, project.content.tokens);
}

export const useProjectStore = create<ProjectState>((set) => ({
  project: initialProject,
  preservedTokens: initialProject.content.tokens,
  past: [],
  future: [],
  analysisStatus: 'idle',
  uncertainCount: 0,

  setSourceText: sourceText => set(state => {
    if (sourceText === state.project.content.sourceText) return state;
    const pendingTokens: TextToken[] = sourceText ? [{
      id: `pending-0-${sourceText.length}`,
      start: 0,
      end: sourceText.length,
      surface: sourceText,
      candidates: [],
      locked: false
    }] : [];

    return {
      ...commit(state, {
        ...state.project,
        content: { ...state.project.content, sourceText, tokens: pendingTokens }
      }),
      analysisStatus: 'loading',
      uncertainCount: 0
    };
  }),

  applyAnalysis: (sourceText, tokens) => set(state => {
    if (state.project.content.sourceText !== sourceText) return state;
    const reconciled = reconcileLockedTokens(state.preservedTokens, tokens);
    return {
      analysisStatus: 'ready',
      analysisError: undefined,
      uncertainCount: remainingUncertain(reconciled),
      preservedTokens: reconciled,
      project: touch({
        ...state.project,
        content: { ...state.project.content, tokens: reconciled }
      })
    };
  }),

  setAnalysisStatus: (analysisStatus, analysisError) => set({ analysisStatus, analysisError }),

  updateAttribution: (field, value) => set(state => {
    if (state.project.content.attribution[field] === value) return state;
    return commit(state, {
      ...state.project,
      content: {
        ...state.project.content,
        attribution: { ...state.project.content.attribution, [field]: value }
      }
    });
  }),

  setTranslation: translationZh => set(state => {
    if (state.project.content.translationZh === translationZh) return state;
    return commit(state, {
      ...state.project,
      content: { ...state.project.content, translationZh }
    });
  }),

  setContextNote: contextNoteZh => set(state => {
    if (state.project.content.contextNoteZh === contextNoteZh) return state;
    return commit(state, {
      ...state.project,
      content: { ...state.project.content, contextNoteZh }
    });
  }),

  setLocale: locale => set(state => {
    if (state.project.locale === locale) return state;
    const traditional = locale === 'zh-Hant-TW' || locale === 'zh-Hant-HK';
    const sourceText = locale === 'ja-JP'
      ? createInitialProject().content.sourceText
      : traditional ? '人生若只如初見，何事秋風悲畫扇。' : '人生若只如初见，何事秋风悲画扇。';
    const tokens: TextToken[] = [{ id: `locale-0-${sourceText.length}`, start: 0, end: sourceText.length, surface: sourceText, candidates: [], locked: false }];
    return {
      ...commit(state, {
        ...state.project,
        locale,
        content: {
          sourceText,
          translationZh: '',
          contextNoteZh: '',
          pronunciation: '',
          attribution: locale === 'ja-JP'
            ? createInitialProject().content.attribution
            : { work: traditional ? '《木蘭花・擬古決絕詞柬友》' : '《木兰花・拟古决绝词柬友》', author: traditional ? '納蘭性德' : '纳兰性德', speaker: '', year: '' },
          tokens
        },
        layout: { ...state.project.layout, template: locale === 'ja-JP' ? 'bunko' : 'modern-zh', direction: 'vertical' }
      }),
      preservedTokens: tokens,
      analysisStatus: locale === 'ja-JP' ? 'loading' : 'ready',
      uncertainCount: 0
    };
  }),

  setTemplate: template => set(state => {
    if (state.project.layout.template === template) return state;
    return commit(state, {
      ...state.project,
      layout: { ...state.project.layout, template }
    });
  }),

  setDirection: direction => set(state => {
    if (state.project.layout.direction === direction) return state;
    return commit(state, {
      ...state.project,
      layout: { ...state.project.layout, direction }
    });
  }),

  setRatio: ratio => set(state => {
    if (state.project.layout.ratio === ratio) return state;
    return commit(state, {
      ...state.project,
      layout: { ...state.project.layout, ratio }
    });
  }),

  setExportFormat: format => set(state => {
    if (state.project.export.format === format) return state;
    return commit(state, { ...state.project, export: { ...state.project.export, format } });
  }),

  loadPassage: passage => set(state => {
    const sourceText = passage.sourceText;
    const isJapanese = passage.language === 'ja';
    const tokens: TextToken[] = sourceText ? [{
      id: `pending-0-${sourceText.length}`,
      start: 0,
      end: sourceText.length,
      surface: sourceText,
      candidates: [],
      locked: false
    }] : [];
    return {
      ...commit(state, {
        ...state.project,
        id: `example-${passage.id}`,
        locale: isJapanese ? 'ja-JP' : 'zh-Hant-TW',
        content: {
          ...state.project.content,
          sourceText,
          translationZh: passage.translationZh,
          contextNoteZh: passage.rights === 'personal'
            ? '我的例句｜保存在本机'
            : isJapanese
              ? `${passage.readingKana ? `假名校读：${passage.readingKana}｜` : ''}${passage.rights === 'public-domain' ? '公共领域原文' : '作品摘录'}｜内置译文：编辑译`
              : '公共领域原文｜白话释义：本站编辑',
          pronunciation: '',
          attribution: { work: passage.work, author: passage.author, speaker: '', year: '' },
          tokens
        },
        layout: { ...state.project.layout, template: passage.suggestedTemplate }
      }),
      preservedTokens: tokens,
      analysisStatus: isJapanese ? 'loading' : 'ready',
      uncertainCount: 0
    };
  }),

  setTokenReading: (tokenId, reading) => set(state => {
    const current = state.project.content.tokens.find(item => item.id === tokenId);
    if (!current || (current.reading === reading && current.locked)) return state;
    const tokens = state.project.content.tokens.map(item => item.id === tokenId ? {
          ...item,
          reading,
          readingSource: 'manual' as const,
          locked: true
        } : item);

    return {
      ...commit(state, {
        ...state.project,
        content: { ...state.project.content, tokens }
      }),
      uncertainCount: remainingUncertain(tokens),
      preservedTokens: tokens
    };
  }),

  undo: () => set(state => {
    const previous = state.past.at(-1);
    if (!previous) return state;
    return {
      project: previous,
      preservedTokens: previous.content.tokens,
      past: state.past.slice(0, -1),
      future: [state.project, ...state.future].slice(0, 100),
      uncertainCount: remainingUncertain(previous.content.tokens),
      analysisStatus: 'ready',
      analysisError: undefined
    };
  }),

  redo: () => set(state => {
    const [next, ...future] = state.future;
    if (!next) return state;
    return {
      project: next,
      preservedTokens: next.content.tokens,
      past: [...state.past, state.project].slice(-100),
      future,
      uncertainCount: remainingUncertain(next.content.tokens),
      analysisStatus: 'ready',
      analysisError: undefined
    };
  })
}));
