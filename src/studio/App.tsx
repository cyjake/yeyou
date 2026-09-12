import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import { PROJECT_STORAGE_KEY, useProjectStore } from '../domain/document/store';
import type { ProjectDocument, TextToken } from '../domain/document/schema';
import { analyzeJapaneseInWorker } from '../domain/japanese/analysis-client';
import { createProjectPng, downloadProjectPdf, downloadProjectPng, type ProjectPng } from '../domain/export/download';
import { canCopyPng, canSharePng, copyPngToClipboard, sharePng } from '../domain/export/share';
import { collectExportWarnings } from '../domain/export/svg-renderer';
import { curatedPassages, type CuratedPassage } from '../content/passages';
import { loadPersonalPassages, parsePersonalPassages, passageFromProject, persistPersonalPassages, upsertPersonalPassage } from '../content/personal-library';
import { trackLocalEvent } from '../domain/analytics/local-analytics';
import { activatePwaUpdate, type PwaStatus } from '../domain/pwa/registration';
import { adjacentReading, readingChoices } from '../domain/japanese/reading-choices';
import { isSmallKana } from '../domain/japanese/kana-typography';
import { dictionaryLinksFor } from '../domain/japanese/dictionary-links';
import { detectClassicalVerseLines } from '../domain/chinese/verse-layout';
import { planVerticalCopy } from '../domain/layout/vertical-copy-layout';

export function App() {
  const project = useProjectStore(state => state.project);
  const analysisStatus = useProjectStore(state => state.analysisStatus);
  const analysisError = useProjectStore(state => state.analysisError);
  const setSourceText = useProjectStore(state => state.setSourceText);
  const applyAnalysis = useProjectStore(state => state.applyAnalysis);
  const setAnalysisStatus = useProjectStore(state => state.setAnalysisStatus);
  const updateAttribution = useProjectStore(state => state.updateAttribution);
  const setTranslation = useProjectStore(state => state.setTranslation);
  const setContextNote = useProjectStore(state => state.setContextNote);
  const setLocale = useProjectStore(state => state.setLocale);
  const setTemplate = useProjectStore(state => state.setTemplate);
  const setDirection = useProjectStore(state => state.setDirection);
  const setRatio = useProjectStore(state => state.setRatio);
  const setExportFormat = useProjectStore(state => state.setExportFormat);
  const loadPassage = useProjectStore(state => state.loadPassage);
  const setTokenReading = useProjectStore(state => state.setTokenReading);
  const canUndo = useProjectStore(state => state.past.length > 0);
  const canRedo = useProjectStore(state => state.future.length > 0);
  const undo = useProjectStore(state => state.undo);
  const redo = useProjectStore(state => state.redo);
  const [exportWarnings, setExportWarnings] = useState<string[] | null>(null);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'done' | 'error'>('idle');
  const [exportError, setExportError] = useState<string>();
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [pendingExportFormat, setPendingExportFormat] = useState<'png' | 'pdf'>();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryShelf, setGalleryShelf] = useState<'curated' | 'mine'>('curated');
  const [galleryMood, setGalleryMood] = useState<'全部' | CuratedPassage['mood']>('全部');
  const [personalPassages, setPersonalPassages] = useState<CuratedPassage[]>(loadPersonalPassages);
  const [pwaStatus, setPwaStatus] = useState<PwaStatus>('ready');
  const [pwaRegistration, setPwaRegistration] = useState<ServiceWorkerRegistration>();
  const [mobilePanel, setMobilePanel] = useState<'content' | 'style' | null>(null);
  const [readingPopover, setReadingPopover] = useState<{ tokenId: string; left: number; top: number; placement: 'above' | 'below' }>();
  const [preparedPng, setPreparedPng] = useState<ProjectPng>();
  const [shareNotice, setShareNotice] = useState<{ kind: 'success' | 'error'; message: string }>();
  const personalImportRef = useRef<HTMLInputElement>(null);

  const { content, layout } = project;
  const copyDensity = getCopyDensity(content.sourceText);
  const classicalVerseLines = useMemo(
    () => project.locale.startsWith('zh') ? detectClassicalVerseLines(content.sourceText) : null,
    [content.sourceText, project.locale]
  );
  const verticalCopyPlan = useMemo(
    () => layout.direction === 'vertical' && !classicalVerseLines
      ? planVerticalCopy(content.tokens, layout.ratio, layout.template)
      : null,
    [classicalVerseLines, content.tokens, layout.direction, layout.ratio, layout.template]
  );
  const copyStyle = classicalVerseLines
    ? { '--verse-copy-size': `${getVerseCopySize(classicalVerseLines, layout.direction, layout.ratio, layout.template)}cqw` } as CSSProperties
    : verticalCopyPlan
      ? {
          '--copy-size': `${verticalCopyPlan.fontSizeCqw}cqw`,
          '--copy-letter-spacing': `${verticalCopyPlan.letterSpacingEm}em`,
          '--copy-column-gap': `${verticalCopyPlan.columnPitchEm - 1}em`,
          '--copy-optical-shift': `${verticalCopyPlan.opticalShiftCqw}cqw`
        } as CSSProperties
    : undefined;
  const galleryLanguage: CuratedPassage['language'] = project.locale === 'ja-JP' ? 'ja' : 'zh';
  const activeLibrary = galleryShelf === 'curated' ? curatedPassages : personalPassages;
  const galleryPassages = useMemo(
    () => activeLibrary.filter(passage => passage.language === galleryLanguage),
    [activeLibrary, galleryLanguage]
  );
  const galleryMoods = useMemo<Array<'全部' | CuratedPassage['mood']>>(
    () => ['全部', ...Array.from(new Set(galleryPassages.map(passage => passage.mood)))],
    [galleryPassages]
  );
  const activeReadingToken = readingPopover
    ? content.tokens.find(token => token.id === readingPopover.tokenId)
    : undefined;

  useEffect(() => {
    const sourceText = content.sourceText;
    let cancelled = false;

    if (project.locale !== 'ja-JP') {
      const tokens: TextToken[] = sourceText ? [{ id: `plain-0-${sourceText.length}`, start: 0, end: sourceText.length, surface: sourceText, candidates: [], locked: false }] : [];
      applyAnalysis(sourceText, tokens);
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        setAnalysisStatus('loading');
        const result = await analyzeJapaneseInWorker(sourceText);
        if (cancelled) return;
        applyAnalysis(sourceText, result.tokens);
      } catch (error) {
        if (!cancelled) {
          setAnalysisStatus('error', error instanceof Error ? error.message : '读音分析失败。');
        }
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [content.sourceText, project.locale, applyAnalysis, setAnalysisStatus]);

  useEffect(() => {
    const handleHistoryShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      const wantsUndo = key === 'z' && !event.shiftKey;
      const wantsRedo = (key === 'z' && event.shiftKey) || key === 'y';
      if (!wantsUndo && !wantsRedo) return;

      event.preventDefault();
      if (wantsUndo) undo();
      if (wantsRedo) redo();
    };

    window.addEventListener('keydown', handleHistoryShortcut);
    return () => window.removeEventListener('keydown', handleHistoryShortcut);
  }, [undo, redo]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    } catch {
      // Private browsing and embedded browsers may disable storage; editing still works.
    }
  }, [project]);

  useEffect(() => {
    let cancelled = false;
    setPreparedPng(undefined);
    const timeout = window.setTimeout(() => {
      void createProjectPng(project)
        .then(png => { if (!cancelled) setPreparedPng(png); })
        .catch(() => { if (!cancelled) setPreparedPng(undefined); });
    }, 260);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [project]);

  useEffect(() => {
    const handlePwaStatus = (event: Event) => {
      const detail = (event as CustomEvent<{ status: PwaStatus; registration?: ServiceWorkerRegistration }>).detail;
      setPwaStatus(detail.status);
      setPwaRegistration(detail.registration);
    };
    window.addEventListener('yeyou:pwa-status', handlePwaStatus);
    return () => window.removeEventListener('yeyou:pwa-status', handlePwaStatus);
  }, []);

  useEffect(() => {
    if (!readingPopover) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('.reading-popover, .ruby-trigger')) return;
      setReadingPopover(undefined);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setReadingPopover(undefined);
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [readingPopover]);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest('.export-action')) setExportMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExportMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [exportMenuOpen]);

  const toggleLanguage = () => {
    setLocale(galleryLanguage === 'ja' ? 'zh-Hant-TW' : 'ja-JP');
    setGalleryMood('全部');
  };

  const dismissMobilePanel = (event: ReactMouseEvent<HTMLElement>) => {
    if (!mobilePanel || !window.matchMedia('(max-width: 860px)').matches) return;
    event.stopPropagation();
    setMobilePanel(null);
  };

  const requestExport = (format: 'png' | 'pdf') => {
    setExportFormat(format);
    setPendingExportFormat(format);
    setExportMenuOpen(false);
    const warnings = collectExportWarnings(project);
    if (warnings.length) {
      setExportWarnings(warnings);
      return;
    }
    void performExport(format);
  };

  const showShareNotice = (kind: 'success' | 'error', message: string) => {
    setShareNotice({ kind, message });
    window.setTimeout(() => setShareNotice(undefined), 2600);
  };

  const saveCurrentPassage = () => {
    if (!content.sourceText.trim()) {
      showShareNotice('error', '请先输入想收藏的文字');
      return;
    }
    try {
      const next = upsertPersonalPassage(personalPassages, passageFromProject(project));
      persistPersonalPassages(next);
      setPersonalPassages(next);
      setGalleryShelf('mine');
      setGalleryMood('全部');
      showShareNotice('success', '已保存到我的例句');
    } catch {
      showShareNotice('error', '当前浏览器无法保存例句');
    }
  };

  const removePersonalPassage = (id: string) => {
    try {
      const next = personalPassages.filter(passage => passage.id !== id);
      persistPersonalPassages(next);
      setPersonalPassages(next);
    } catch {
      showShareNotice('error', '当前浏览器无法修改例句');
    }
  };

  const exportPersonalLibrary = () => {
    const blob = new Blob([JSON.stringify(personalPassages, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'yeyou-my-passages.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importPersonalLibrary = async (file?: File) => {
    if (!file) return;
    try {
      const imported = parsePersonalPassages(await file.text());
      const next = imported.reduce((items, passage) => upsertPersonalPassage(items, passage), personalPassages);
      persistPersonalPassages(next);
      setPersonalPassages(next);
      setGalleryShelf('mine');
      setGalleryMood('全部');
      showShareNotice('success', `已导入 ${imported.length} 条例句`);
    } catch {
      showShareNotice('error', '例句文件格式不正确');
    } finally {
      if (personalImportRef.current) personalImportRef.current.value = '';
    }
  };

  const copyImage = async () => {
    if (!preparedPng) return;
    setExportMenuOpen(false);
    try {
      await copyPngToClipboard(preparedPng);
      showShareNotice('success', '图片已复制');
    } catch (error) {
      showShareNotice('error', error instanceof Error ? error.message : '无法复制图片。');
    }
  };

  const shareImage = async () => {
    if (!preparedPng) return;
    setExportMenuOpen(false);
    try {
      await sharePng(preparedPng);
      showShareNotice('success', '图片已交给系统分享');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      showShareNotice('error', error instanceof Error ? error.message : '无法分享图片。');
    }
  };

  const openReadingPopover = (token: TextToken, event: ReactMouseEvent<HTMLButtonElement>) => {
    if (readingPopover?.tokenId === token.id) {
      setReadingPopover(undefined);
      return;
    }
    const surfaceRects = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('.prefix-kana, .ruby-base, .okurigana'),
      element => element.getBoundingClientRect()
    );
    const fallback = event.currentTarget.getBoundingClientRect();
    const bounds = surfaceRects.length ? {
      left: Math.min(...surfaceRects.map(rect => rect.left)),
      right: Math.max(...surfaceRects.map(rect => rect.right)),
      top: Math.min(...surfaceRects.map(rect => rect.top)),
      bottom: Math.max(...surfaceRects.map(rect => rect.bottom))
    } : fallback;
    const width = bounds.right - bounds.left;
    const left = Math.min(window.innerWidth - 142, Math.max(142, bounds.left + width / 2));
    const placement = bounds.top > 190 ? 'above' : 'below';
    setReadingPopover({
      tokenId: token.id,
      left,
      top: placement === 'above' ? bounds.top - 10 : bounds.bottom + 10,
      placement
    });
  };

  const performExport = async (format: 'png' | 'pdf' = pendingExportFormat ?? project.export.format) => {
    setExportWarnings(null);
    setExportStatus('exporting');
    setExportError(undefined);
    try {
      if (format === 'pdf') await downloadProjectPdf(project);
      else await downloadProjectPng(project);
      trackLocalEvent('export_completed');
      setExportStatus('done');
      window.setTimeout(() => setExportStatus('idle'), 2400);
    } catch (error) {
      setExportStatus('error');
      setExportError(error instanceof Error ? error.message : '导出失败。');
    }
  };

  return (
    <main className="studio-shell">
      <section className="studio-workspace" aria-label="文字卡片编辑器" data-mobile-panel={mobilePanel ?? 'closed'}>
        <aside className="inspector inspector-content">
          <div className="panel-masthead">
            <a className="brand" href={import.meta.env.BASE_URL} aria-label="葉遊首页">
              <span className="brand-mark">葉</span>
              <span><strong>葉遊</strong><small>YEYOU</small></span>
            </a>
            <div className="masthead-actions">
              {pwaStatus === 'offline' && <span className="connection-status">离线</span>}
            </div>
          </div>

          <div className="inspector-heading">
            <span className="step">01</span>
            <div><h1>文字</h1><p>从一句值得记住的话开始</p></div>
          </div>

          <div className="field">
            <div className="source-field-label">
              <label htmlFor="source-text">{project.locale === 'ja-JP' ? '日文原文' : '中文原文'}</label>
            </div>
            <textarea id="source-text" value={content.sourceText} onChange={event => setSourceText(event.target.value)} rows={6} />
          </div>

          <div className="field-grid">
            <label className="field">
              <span>作品</span>
              <input value={content.attribution.work} onChange={event => updateAttribution('work', event.target.value)} />
            </label>
            <label className="field">
              <span>作者</span>
              <input value={content.attribution.author} onChange={event => updateAttribution('author', event.target.value)} />
            </label>
          </div>

          <label className="field">
            <span>{project.locale === 'ja-JP' ? '中文释义' : '白话／释义'}</span>
            <textarea value={content.translationZh} onChange={event => setTranslation(event.target.value)} rows={3} />
          </label>

          {analysisError && <p className="analysis-error" role="alert">{analysisError}</p>}

          <div className="content-panel-actions">
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label={`切换语言，当前为${galleryLanguage === 'ja' ? '日文' : '中文'}`}
              title={`切换至${galleryLanguage === 'ja' ? '中文' : '日文'}`}
            >
              <span><GlobeIcon />{galleryLanguage === 'ja' ? '日文' : '中文'}</span>
            </button>
            <button type="button" onClick={() => { setGalleryOpen(true); trackLocalEvent('gallery_opened'); }}>
              <span>浏览例句</span>
            </button>
          </div>

        </aside>

        <section className="canvas-stage" aria-label="卡片预览" onClickCapture={dismissMobilePanel}>
          <div className="stage-label">
            <span>{templateName(layout.template)}</span>
            <span>{layout.ratio.replace(':', ' : ')}</span>
          </div>

          <article className={`paper template-${layout.template} ${layout.direction} ratio-${layout.ratio.replace(':', '-')} copy-${copyDensity}`} lang={project.locale.startsWith('zh') ? 'zh' : 'ja'}>
            <div className="paper-grain" aria-hidden="true" />
            <div className="copy-frame">
              <p className={`literary-copy ${classicalVerseLines ? 'metrical-verse' : ''} ${verticalCopyPlan ? 'balanced-columns' : ''}`} style={copyStyle}>
                {classicalVerseLines ? classicalVerseLines.map((line, index) => (
                  <Fragment key={`${index}-${line}`}>
                    {line}
                    {index < classicalVerseLines.length - 1 && <br />}
                  </Fragment>
                )) : verticalCopyPlan ? verticalCopyPlan.columns.map((column, columnIndex) => {
                  const hasRuby = column.some(item =>
                    item.fullToken && Boolean(content.tokens[item.tokenIndex]?.reading)
                  );
                  return (
                    <span className={`copy-column${hasRuby ? ' has-ruby' : ''}`} key={`column-${columnIndex}`}>
                      {column.map((item, itemIndex) => {
                        const token = content.tokens[item.tokenIndex];
                        return item.fullToken ? (
                          <RenderedToken
                            key={`${token.id}-${itemIndex}`}
                            token={token}
                            active={readingPopover?.tokenId === token.id}
                            onOpen={openReadingPopover}
                          />
                        ) : <Fragment key={`${token.id}-${columnIndex}-${itemIndex}`}>{item.surface}</Fragment>;
                      })}
                    </span>
                  );
                }) : content.tokens.map(token => (
                  <RenderedToken
                    key={token.id}
                    token={token}
                    active={readingPopover?.tokenId === token.id}
                    onOpen={openReadingPopover}
                  />
                ))}
              </p>
            </div>
            <footer className="attribution">
              {content.attribution.work && <span>{content.attribution.work}</span>}
              {content.attribution.speaker && <span>{content.attribution.speaker}</span>}
              {content.attribution.author && <span>{content.attribution.author}</span>}
            </footer>
            <span className="seal" aria-hidden="true">葉</span>
          </article>

          <p className="stage-note">
            {analysisStatus === 'loading' ? '正在核对读音…' : '文字、读音与出处现在来自同一份结构化文档。'}
          </p>

          <div className="export-dock">
            <div className="canvas-toolbar" aria-label="画布操作">
              <button className="history-button icon-only" type="button" onClick={undo} disabled={!canUndo} title="撤销（⌘Z）" aria-label="撤销">↶</button>
              <button className="history-button icon-only" type="button" onClick={redo} disabled={!canRedo} title="重做（⇧⌘Z）" aria-label="重做">↷</button>
            </div>
            <div className="export-action">
              <div className="export-split">
                <button
                  className="primary-button export-main"
                  type="button"
                  onClick={() => requestExport(project.export.format)}
                  disabled={exportStatus === 'exporting'}
                >
                  {exportStatus === 'exporting' ? '生成中…' : `导出 ${project.export.format.toUpperCase()}`}
                </button>
                <button
                  className="primary-button export-menu-trigger"
                  type="button"
                  aria-label="打开导出与分享菜单"
                  aria-haspopup="menu"
                  aria-expanded={exportMenuOpen}
                  onClick={() => setExportMenuOpen(value => !value)}
                  disabled={exportStatus === 'exporting'}
                >
                  <ChevronDownIcon />
                </button>
              </div>
              {exportMenuOpen && (
                <div className="export-menu" role="menu" aria-label="导出与分享">
                  <button type="button" role="menuitem" onClick={() => requestExport('pdf')}>
                    <span><strong>下载 PDF</strong><small>打印与存档</small></span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => requestExport('png')}>
                    <span><strong>下载 PNG</strong><small>高清图片文件</small></span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => void shareImage()} disabled={!preparedPng || !canSharePng(preparedPng)}>
                    <span><strong>分享图片</strong><small>{canSharePng(preparedPng) ? '打开系统分享' : '当前浏览器不可用'}</small></span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => void copyImage()} disabled={!preparedPng || !canCopyPng()}>
                    <span><strong>复制图片</strong><small>{canCopyPng() ? '粘贴到其他应用' : '当前浏览器不可用'}</small></span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="inspector inspector-style">
          <div className="inspector-heading compact">
            <span className="step">02</span>
            <div><h2>样式</h2><p>以选择代替繁琐调参</p></div>
          </div>

          <StyleControls
            template={layout.template}
            direction={layout.direction}
            ratio={layout.ratio}
            setTemplate={setTemplate}
            setDirection={setDirection}
            setRatio={setRatio}
            locale={project.locale}
          />

        </aside>
      </section>

      <nav className="mobile-panel-nav" aria-label="工作区">
          <button
            type="button"
            className={mobilePanel === 'content' ? 'active' : ''}
            aria-expanded={mobilePanel === 'content'}
            onClick={() => setMobilePanel(value => value === 'content' ? null : 'content')}
          ><span>01</span>文字</button>
          <button
            type="button"
            className={mobilePanel === 'style' ? 'active' : ''}
            aria-expanded={mobilePanel === 'style'}
            onClick={() => setMobilePanel(value => value === 'style' ? null : 'style')}
          ><span>02</span>样式</button>
      </nav>

      {readingPopover && activeReadingToken && (
        <ReadingPopover
          token={activeReadingToken}
          left={readingPopover.left}
          top={readingPopover.top}
          placement={readingPopover.placement}
          onChange={reading => setTokenReading(activeReadingToken.id, reading)}
          onConfirm={() => {
            if (activeReadingToken.reading) setTokenReading(activeReadingToken.id, activeReadingToken.reading);
            setReadingPopover(undefined);
          }}
          onClose={() => setReadingPopover(undefined)}
        />
      )}

      {exportWarnings && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setExportWarnings(null)}>
          <section className="export-dialog" role="dialog" aria-modal="true" aria-labelledby="export-review-title" onMouseDown={event => event.stopPropagation()}>
            <span className="dialog-eyebrow">导出前检查</span>
            <h2 id="export-review-title">这张卡片还有几处值得确认</h2>
            <ul>{exportWarnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
            <div className="dialog-actions">
              <button className="quiet-button" type="button" onClick={() => setExportWarnings(null)}>返回修改</button>
              <button className="primary-button" type="button" onClick={() => void performExport()}>仍然导出</button>
            </div>
          </section>
        </div>
      )}

      {galleryOpen && (
        <div className="dialog-backdrop gallery-backdrop" role="presentation" onMouseDown={() => setGalleryOpen(false)}>
          <section className="gallery-dialog" role="dialog" aria-modal="true" aria-labelledby="gallery-title" onMouseDown={event => event.stopPropagation()}>
            <header className="gallery-heading">
              <div><span className="dialog-eyebrow">例句库</span><h2 id="gallery-title">从一句喜欢的文字开始</h2></div>
              <button className="dialog-close" type="button" onClick={() => setGalleryOpen(false)} aria-label="关闭例句库">×</button>
            </header>
            <div className="gallery-library-bar">
              <div className="library-tabs" role="tablist" aria-label="例句来源">
                <button type="button" role="tab" aria-selected={galleryShelf === 'curated'} className={galleryShelf === 'curated' ? 'active' : ''} onClick={() => { setGalleryShelf('curated'); setGalleryMood('全部'); }}>葉遊精选</button>
                <button type="button" role="tab" aria-selected={galleryShelf === 'mine'} className={galleryShelf === 'mine' ? 'active' : ''} onClick={() => { setGalleryShelf('mine'); setGalleryMood('全部'); }}>我的例句</button>
              </div>
              <div className="library-actions">
                <button type="button" onClick={saveCurrentPassage}>保存当前文字</button>
                {galleryShelf === 'mine' && <>
                  <button type="button" onClick={() => personalImportRef.current?.click()}>导入</button>
                  <button type="button" onClick={exportPersonalLibrary} disabled={!personalPassages.length}>备份</button>
                </>}
                <input ref={personalImportRef} type="file" accept="application/json,.json" hidden onChange={event => void importPersonalLibrary(event.target.files?.[0])} />
              </div>
            </div>
            <div className="mood-filter" aria-label="按心情筛选">
              {galleryMoods.map(mood => (
                <button className={galleryMood === mood ? 'active' : ''} type="button" onClick={() => setGalleryMood(mood)} key={mood}>{mood}</button>
              ))}
            </div>
            <div className="passage-grid">
              {!galleryPassages.length && <div className="empty-library"><strong>这里还没有例句</strong><span>保存当前文字，或导入以前的 YEYOU 备份。</span></div>}
              {galleryPassages.filter(passage => galleryMood === '全部' || passage.mood === galleryMood).map(passage => (
                <article className="passage-card" key={passage.id}>
                  <span className="passage-mood">{passage.mood} · {passage.rights === 'public-domain' ? '经典' : passage.rights === 'quotation' ? '作品摘录' : '我的'}</span>
                  <p lang={passage.language === 'ja' ? 'ja' : 'zh-Hant'}>{passage.sourceText}</p>
                  <small>{[passage.author, passage.work].filter(Boolean).join(' · ') || '未填写出处'}</small>
                  <div className="passage-actions">
                    <span>{passage.sourceUrl && <a href={passage.sourceUrl} target="_blank" rel="noreferrer">出处</a>}</span>
                    {galleryShelf === 'mine' && <button className="remove-passage" type="button" onClick={() => removePersonalPassage(passage.id)}>移除</button>}
                    <button type="button" onClick={() => { loadPassage(passage); trackLocalEvent('example_used'); setGalleryOpen(false); }}>使用这句</button>
                  </div>
                </article>
              ))}
            </div>
            <footer className="gallery-note">
              {galleryShelf === 'curated'
                ? `共 ${galleryPassages.length} 句 · 经典原文与标注摘录分开注明 · ${galleryLanguage === 'ja' ? '中文为本站编辑译' : '白话释义为本站编辑'}`
                : `共 ${galleryPassages.length} 句 · 仅保存在当前浏览器中`}
            </footer>
          </section>
        </div>
      )}

      {exportStatus === 'done' && (
        <div className="export-toast" role="status">
          {project.export.format === 'pdf' ? '打印 PDF 已生成' : '高清 PNG 已生成'}
        </div>
      )}
      {exportError && <div className="export-toast error" role="alert">{exportError}</div>}
      {shareNotice && <div className={`export-toast ${shareNotice.kind === 'error' ? 'error' : ''}`} role={shareNotice.kind === 'error' ? 'alert' : 'status'}>{shareNotice.message}</div>}
      {pwaStatus === 'update-available' && pwaRegistration && (
        <div className="update-toast" role="status"><span>新版本已准备好</span><button type="button" onClick={() => activatePwaUpdate(pwaRegistration)}>立即更新</button></div>
      )}
    </main>
  );
}

type StyleControlsProps = {
  template: ProjectDocument['layout']['template'];
  direction: 'vertical' | 'horizontal';
  ratio: '3:4' | '4:5' | '1:1';
  setTemplate: (template: ProjectDocument['layout']['template']) => void;
  setDirection: (direction: 'vertical' | 'horizontal') => void;
  setRatio: (ratio: '3:4' | '4:5' | '1:1') => void;
  locale: ProjectDocument['locale'];
  compact?: boolean;
};

const templates = [
  { id: 'bunko', name: '素纸', note: '温润纸色与留白' },
  { id: 'cinema', name: '夜幕', note: '深色底与微光' },
  { id: 'notebook', name: '手稿', note: '课堂练习纸与辅助线' },
  { id: 'modern-zh', name: '朱砂', note: '细框与朱红秩序' },
  { id: 'calligraphy', name: '水墨', note: '宣纸与淡墨层次' }
] as const;

function StyleControls({ template, direction, ratio, setTemplate, setDirection, setRatio, locale, compact }: StyleControlsProps) {
  const availableTemplates = templates.filter(option => locale === 'ja-JP' ? !option.id.endsWith('zh') && option.id !== 'calligraphy' : option.id === 'modern-zh' || option.id === 'calligraphy');
  return (
    <div className={compact ? 'style-controls compact' : 'style-controls'}>
      <fieldset className="template-picker">
        <legend>气质</legend>
        {availableTemplates.map(option => (
          <button
            className={`template-option ${template === option.id ? 'selected' : ''}`}
            type="button"
            onClick={() => setTemplate(option.id)}
            aria-pressed={template === option.id}
            key={option.id}
          >
            <span className={`template-swatch ${option.id}`} />
            <span><strong>{option.name}</strong><small>{option.note}</small></span>
          </button>
        ))}
      </fieldset>

      <fieldset className="direction-picker">
        <legend>排版方向</legend>
        <button className={`choice ${direction === 'vertical' ? 'active' : ''}`} type="button" onClick={() => setDirection('vertical')}>纵书</button>
        <button className={`choice ${direction === 'horizontal' ? 'active' : ''}`} type="button" onClick={() => setDirection('horizontal')}>横书</button>
      </fieldset>

      <fieldset className="ratio-picker">
        <legend>画布比例</legend>
        {(['3:4', '4:5', '1:1'] as const).map(option => (
          <button className={`choice ${ratio === option ? 'active' : ''}`} type="button" onClick={() => setRatio(option)} key={option}>{option}</button>
        ))}
      </fieldset>

    </div>
  );
}

function templateName(template: StyleControlsProps['template']): string {
  return templates.find(option => option.id === template)?.name ?? '素纸';
}

function getVerseCopySize(
  lines: string[],
  direction: ProjectDocument['layout']['direction'],
  ratio: ProjectDocument['layout']['ratio'],
  template: ProjectDocument['layout']['template']
): number {
  const aspect = { '3:4': 3 / 4, '4:5': 4 / 5, '1:1': 1 }[ratio];
  const maxCharacters = Math.max(...lines.map(line => Array.from(line).length));
  const density = getCopyDensity(lines.join(''));
  const calligraphic = template === 'calligraphy';
  const base = direction === 'horizontal'
    ? { short: 8.8, regular: 8, long: 6.7 }[density]
    : calligraphic
      ? { short: 10.65, regular: 9.5, long: 7.85 }[density]
      : { short: 10.2, regular: 9, long: 7.4 }[density];
  const lineHeight = direction === 'vertical' ? (calligraphic ? 2.4 : 2.25) : 2.15;
  const widthLimit = direction === 'vertical' ? 82 / (lines.length * lineHeight) : 80 / maxCharacters;
  const heightLimit = direction === 'vertical'
    ? (72 / aspect) / (maxCharacters * 1.08)
    : (72 / aspect) / (lines.length * lineHeight);
  return Math.round(Math.min(base, widthLimit, heightLimit) * 100) / 100;
}

export function RenderedToken({ token, active, onOpen }: {
  token: TextToken;
  active: boolean;
  onOpen: (token: TextToken, event: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  const dictionaryOnly = !token.reading && isKatakanaLookupToken(token.surface);
  if (!token.reading && !dictionaryOnly) return <Fragment>{token.surface}</Fragment>;
  const spokenReading = token.reading
    ? (token.prefixKana ?? '') + token.reading + (token.okurigana ?? '')
    : undefined;

  return (
    <Fragment>
      <button
        className={`ruby-trigger ${dictionaryOnly ? 'dictionary-trigger' : ''} ${token.prefixKana ? 'has-prefix-kana' : ''} ${token.okurigana ? 'has-okurigana' : ''} ${active ? 'active' : ''}`}
        type="button"
        onClick={event => onOpen(token, event)}
        aria-label={spokenReading
          ? `${token.surface}，读音 ${spokenReading}，点击校对`
          : `${token.surface}，点击查词`}
        aria-expanded={active}
      >
        {token.prefixKana && <span className="prefix-kana">{token.prefixKana}</span>}
        {token.reading ? (
          <ruby data-confidence={token.confidence} data-locked={token.locked}>
            <span className="ruby-base">{token.base ?? token.surface}</span>
            <rt>{Array.from(token.reading).map((character, index) =>
              isSmallKana(character)
                ? <span className="small-kana" key={`${index}-${character}`}>{character}</span>
                : <Fragment key={`${index}-${character}`}>{character}</Fragment>
            )}</rt>
          </ruby>
        ) : <span className="ruby-base">{token.surface}</span>}
        {token.okurigana && <span className="okurigana">{token.okurigana}</span>}
      </button>
    </Fragment>
  );
}

function ReadingPopover({ token, left, top, placement, onChange, onConfirm, onClose }: {
  token: TextToken;
  left: number;
  top: number;
  placement: 'above' | 'below';
  onChange: (reading: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const choices = readingChoices(token);
  const selectedIndex = Math.max(0, choices.indexOf(token.reading ?? ''));
  const displayedReading = (token.prefixKana ?? '') + (token.reading ?? '') + (token.okurigana ?? '');
  const dictionaryLinks = dictionaryLinksFor(token.surface);
  const dictionaryOnly = !token.reading && isKatakanaLookupToken(token.surface);
  const chooseOffset = (offset: number) => {
    if (choices.length < 2) return;
    onChange(adjacentReading(choices, token.reading ?? '', offset < 0 ? -1 : 1));
  };

  return (
    <section
      className={`reading-popover ${placement}`}
      style={{ left, top }}
      role="dialog"
      aria-label={dictionaryOnly ? `${token.surface}的词典释义` : `${token.surface}的读音校对`}
    >
      <header>
        <span className="reading-word">{token.surface}</span>
        {dictionaryOnly
          ? <span className="confidence high">片假名</span>
          : <span className={`confidence ${token.confidence ?? 'high'}`}>{token.locked ? '已确认' : confidenceLabel(token.confidence)}</span>}
        <button type="button" onClick={onClose} aria-label="关闭读音校对">×</button>
      </header>
      {!dictionaryOnly && <div className="reading-carousel">
        <button type="button" onClick={() => chooseOffset(-1)} disabled={choices.length < 2} aria-label="上一个读音">‹</button>
        <label>
          <span className="sr-only">自定义读音</span>
          <input
            value={displayedReading}
            onChange={event => onChange(stripDisplayedAffixes(event.target.value, token.prefixKana, token.okurigana))}
            lang="ja"
          />
        </label>
        <button type="button" onClick={() => chooseOffset(1)} disabled={choices.length < 2} aria-label="下一个读音">›</button>
      </div>}
      <footer>
        <span>{dictionaryOnly
          ? '在外部词典中查看释义'
          : choices.length > 1 ? `${selectedIndex + 1} / ${choices.length} 个候选` : '可直接输入读音'}</span>
        <nav className="dictionary-links" aria-label="外部词典">
          {dictionaryLinks.map(link => (
            <a href={link.href} target="_blank" rel="noreferrer" key={link.label}>{link.label} ↗</a>
          ))}
        </nav>
        <button type="button" onClick={dictionaryOnly || token.locked ? onClose : onConfirm}>
          {dictionaryOnly || token.locked ? '完成' : '确认读音'}
        </button>
      </footer>
    </section>
  );
}

export function isKatakanaLookupToken(surface: string): boolean {
  return /^[\u30A0-\u30FF\u31F0-\u31FF]+$/.test(surface)
    && /[\u30A1-\u30FA\u30FD-\u30FF\u31F0-\u31FF]/.test(surface);
}

function stripDisplayedAffixes(reading: string, prefixKana?: string, okurigana?: string): string {
  const withoutPrefix = prefixKana && reading.startsWith(prefixKana)
    ? reading.slice(prefixKana.length)
    : reading;
  return okurigana && withoutPrefix.endsWith(okurigana)
    ? withoutPrefix.slice(0, -okurigana.length)
    : withoutPrefix;
}

function confidenceLabel(confidence?: TextToken['confidence']): string {
  if (confidence === 'low') return '请确认';
  if (confidence === 'medium') return '多音';
  return '可靠';
}

function getCopyDensity(value: string): 'short' | 'regular' | 'long' {
  const length = Array.from(value.trim()).length;
  if (length <= 18) return 'short';
  if (length >= 42) return 'long';
  return 'regular';
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" />
      <path d="M3.9 12h16.2M12 3.75c2.05 2.15 3.15 4.9 3.15 8.25S14.05 18.1 12 20.25C9.95 18.1 8.85 15.35 8.85 12S9.95 5.9 12 3.75Z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
