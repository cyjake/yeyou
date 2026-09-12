import { beforeEach, describe, expect, it } from 'vitest';
import { analyzeJapanese } from '../japanese/analyzer';
import { assertTokenInvariant, createInitialProject } from './schema';
import { useProjectStore } from './store';
import { curatedPassages } from '../../content/passages';

beforeEach(() => {
  const project = createInitialProject();
  useProjectStore.setState({
    project,
    preservedTokens: project.content.tokens,
    past: [],
    future: [],
    analysisStatus: 'idle',
    analysisError: undefined,
    uncertainCount: 0
  });
});

describe('project store', () => {
  it('keeps the document reconstructable while asynchronous analysis is pending', () => {
    useProjectStore.getState().setSourceText('新しい文。');
    const content = useProjectStore.getState().project.content;
    expect(() => assertTokenInvariant(content.sourceText, content.tokens)).not.toThrow();
    expect(content.tokens.map(token => token.surface).join('')).toBe('新しい文。');
  });

  it('applies structured analysis only to the matching source revision', () => {
    const dictionary = { 雪国: ['ゆきぐに'] };
    const analyzed = analyzeJapanese('雪国', dictionary);

    useProjectStore.getState().setSourceText('雪国');
    useProjectStore.getState().applyAnalysis('古い内容', analyzed.tokens);
    expect(useProjectStore.getState().analysisStatus).toBe('loading');

    useProjectStore.getState().applyAnalysis('雪国', analyzed.tokens);
    expect(useProjectStore.getState().project.content.tokens[0]).toMatchObject({
      surface: '雪国',
      reading: 'ゆきぐに'
    });
  });

  it('undoes and redoes document edits without recording analysis as a user edit', () => {
    const initialText = useProjectStore.getState().project.content.sourceText;
    useProjectStore.getState().setSourceText('雪国');
    useProjectStore.getState().applyAnalysis('雪国', analyzeJapanese('雪国', { 雪国: ['ゆきぐに'] }).tokens);

    useProjectStore.getState().undo();
    expect(useProjectStore.getState().project.content.sourceText).toBe(initialText);

    useProjectStore.getState().redo();
    expect(useProjectStore.getState().project.content.sourceText).toBe('雪国');
    expect(useProjectStore.getState().project.content.tokens[0]).toMatchObject({
      surface: '雪国',
      reading: 'ゆきぐに'
    });
  });

  it('clears redo history after a new edit', () => {
    useProjectStore.getState().setTranslation('第一版');
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().future).toHaveLength(1);

    useProjectStore.getState().updateAttribution('author', '夏目漱石');
    expect(useProjectStore.getState().future).toHaveLength(0);
  });

  it('includes social ratios in history', () => {
    useProjectStore.getState().setRatio('1:1');
    expect(useProjectStore.getState().project.layout.ratio).toBe('1:1');
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().project.layout.ratio).toBe('3:4');
  });

  it('tracks template and context edits in the same document history', () => {
    useProjectStore.getState().setTemplate('cinema');
    useProjectStore.getState().setContextNote('黄昏时分的独白');
    expect(useProjectStore.getState().project.layout.template).toBe('cinema');
    expect(useProjectStore.getState().project.content.contextNoteZh).toBe('黄昏时分的独白');
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().project.content.contextNoteZh).toBe('');
    expect(useProjectStore.getState().project.layout.template).toBe('cinema');
  });

  it('stores the selected export format in history', () => {
    useProjectStore.getState().setExportFormat('pdf');
    expect(useProjectStore.getState().project.export.format).toBe('pdf');
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().project.export.format).toBe('png');
  });

  it('loads a curated passage as an immediately valid pending document', () => {
    const passage = curatedPassages[0];
    useProjectStore.getState().loadPassage(passage);
    const state = useProjectStore.getState();
    expect(state.project.content.sourceText).toBe(passage.sourceText);
    expect(state.project.content.translationZh).toBe(passage.translationZh);
    expect(state.project.layout.template).toBe(passage.suggestedTemplate);
    expect(() => assertTokenInvariant(state.project.content.sourceText, state.project.content.tokens)).not.toThrow();
  });

  it('loads a Chinese example without invoking Japanese reading analysis', () => {
    const passage = curatedPassages.find(item => item.language === 'zh')!;
    useProjectStore.getState().loadPassage(passage);
    const state = useProjectStore.getState();
    expect(state.project.locale).toBe('zh-Hant-TW');
    expect(state.project.content.sourceText).toBe(passage.sourceText);
    expect(state.project.layout.template).toBe(passage.suggestedTemplate);
    expect(state.analysisStatus).toBe('ready');
  });

  it('switches to an explicit Chinese script policy without implicit conversion', () => {
    useProjectStore.getState().setLocale('zh-Hant-HK');
    const project = useProjectStore.getState().project;
    expect(project.locale).toBe('zh-Hant-HK');
    expect(project.content.sourceText).toContain('秋風悲畫扇');
    expect(project.layout.template).toBe('modern-zh');
    expect(() => assertTokenInvariant(project.content.sourceText, project.content.tokens)).not.toThrow();
  });

  it('treats a preview reading choice as a locked, undoable correction', () => {
    const state = useProjectStore.getState();
    const token = state.project.content.tokens.find(item => item.reading);
    expect(token).toBeDefined();

    state.setTokenReading(token!.id, 'こっきょう');
    expect(useProjectStore.getState().project.content.tokens.find(item => item.id === token!.id)).toMatchObject({
      reading: 'こっきょう',
      readingSource: 'manual',
      locked: true
    });

    useProjectStore.getState().undo();
    expect(useProjectStore.getState().project.content.tokens.find(item => item.id === token!.id)?.reading).toBe(token!.reading);
  });

  it('confirms an unchanged low-confidence reading', () => {
    const state = useProjectStore.getState();
    const token = state.project.content.tokens.find(item => item.reading)!;
    const tokens = state.project.content.tokens.map(item => item.id === token.id
      ? { ...item, confidence: 'low' as const, locked: false }
      : item);
    useProjectStore.setState({
      project: { ...state.project, content: { ...state.project.content, tokens } },
      preservedTokens: tokens,
      uncertainCount: 1
    });

    useProjectStore.getState().setTokenReading(token.id, token.reading!);
    const updated = useProjectStore.getState();
    expect(updated.project.content.tokens.find(item => item.id === token.id)?.locked).toBe(true);
    expect(updated.uncertainCount).toBe(0);
  });
});
