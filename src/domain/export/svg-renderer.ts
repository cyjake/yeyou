import type { ProjectDocument, TextToken } from '../document/schema';
import { validateChineseScript } from '../chinese/policy';
import { detectClassicalVerseLines } from '../chinese/verse-layout';
import { isSmallKana } from '../japanese/kana-typography';
import { planVerticalCopy, type VerticalCopyPlan } from '../layout/vertical-copy-layout';

export type ExportArtifact = { svg: string; width: number; height: number; fileName: string };

const baseSizes = {
  '3:4': [600, 800],
  '4:5': [600, 750],
  '1:1': [600, 600]
} as const;

export function renderProjectSvg(project: ProjectDocument): ExportArtifact {
  const [viewWidth, viewHeight] = baseSizes[project.layout.ratio];
  const width = viewWidth * project.export.scale;
  const height = viewHeight * project.export.scale;
  const { content, layout } = project;
  const verseLines = project.locale.startsWith('zh') ? detectClassicalVerseLines(content.sourceText) : null;
  const verticalPlan = layout.direction === 'vertical' && !verseLines
    ? planVerticalCopy(content.tokens, layout.ratio, layout.template)
    : null;
  const baseMetrics = getTextMetrics(content.sourceText, layout.direction, layout.template);
  const metrics = verseLines
    ? fitVerseMetrics(verseLines, viewWidth, viewHeight, layout.template, layout.direction, baseMetrics)
    : verticalPlan
      ? metricsFromVerticalPlan(verticalPlan, viewWidth)
      : baseMetrics;
  const copy = verseLines
    ? layout.direction === 'vertical'
      ? renderVerticalVerse(verseLines, viewWidth, viewHeight, metrics)
      : renderHorizontalVerse(verseLines, viewWidth, viewHeight, metrics)
    : layout.direction === 'vertical'
      ? renderVerticalText(content.tokens, viewWidth, viewHeight, layout.template, metrics, verticalPlan!)
      : renderHorizontalText(content.tokens, viewWidth, viewHeight, layout.template, metrics);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${viewWidth} ${viewHeight}">
  <metadata>${escapeXml(content.sourceText)}</metadata>
  ${renderDefinitions()}
  ${renderBackground(layout.template, viewWidth, viewHeight)}
  <g class="copy template-${layout.template}"${verseLines ? ' data-layout="classical-verse"' : ''}>${copy}</g>
  ${renderAttribution(project, viewWidth, viewHeight)}
  ${renderSeal(layout.template, viewWidth, viewHeight)}
</svg>`;
  return { svg, width, height, fileName: `yeyou-${safeFileSegment(content.attribution.work || 'quote')}-${layout.ratio.replace(':', 'x')}.png` };
}

export function collectExportWarnings(project: ProjectDocument): string[] {
  const warnings: string[] = [];
  const uncertain = project.content.tokens.filter(token => token.confidence === 'low' && !token.locked).length;
  if (uncertain) warnings.push(`还有 ${uncertain} 处读音尚未确认`);
  const { work, author, speaker } = project.content.attribution;
  if (!work && !author && !speaker) warnings.push('尚未填写作品、作者或说话者');
  if (!project.content.sourceText.trim()) warnings.push('卡片还没有正文');
  const capacity = project.layout.direction === 'vertical'
    ? { '3:4': 42, '4:5': 38, '1:1': 28 }[project.layout.ratio]
    : { '3:4': 54, '4:5': 48, '1:1': 38 }[project.layout.ratio];
  if (project.content.sourceText.length > capacity) warnings.push('正文较长，可能超出当前画布的安全区域');
  warnings.push(...validateChineseScript(project.content.sourceText, project.locale));
  return warnings;
}

function renderDefinitions(): string {
  return `<defs>
    <linearGradient id="cinema-base" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#20292d"/><stop offset=".52" stop-color="#15191c"/><stop offset="1" stop-color="#3a2625"/></linearGradient>
    <radialGradient id="cinema-light" cx="78%" cy="18%" r="55%"><stop offset="0" stop-color="#c47b5c" stop-opacity=".4"/><stop offset="1" stop-color="#c47b5c" stop-opacity="0"/></radialGradient>
    <linearGradient id="notebook-paper" x1="0" y1="0" x2=".25" y2="1"><stop offset="0" stop-color="#f7f3e8"/><stop offset=".55" stop-color="#f2eddf"/><stop offset="1" stop-color="#eee6d6"/></linearGradient>
    <pattern id="paper-grain" width="17" height="17" patternUnits="userSpaceOnUse"><path d="M0 8.5H17M8.5 0V17" stroke="#756954" stroke-opacity=".035" stroke-width=".7"/></pattern>
    <pattern id="notebook-fiber" width="31" height="29" patternUnits="userSpaceOnUse"><path d="M2 8L13 7.4M18 22l10 .7M7 27l6-1" stroke="#675b48" stroke-opacity=".055" stroke-width=".55"/><circle cx="23" cy="9" r=".55" fill="#75684f" fill-opacity=".08"/><circle cx="8" cy="18" r=".4" fill="#75684f" fill-opacity=".07"/></pattern>
    <style>
      .main{font-family:"Yu Mincho","Hiragino Mincho ProN","Noto Serif JP",serif;font-weight:400}
      .ruby{font-family:"Yu Mincho","Hiragino Mincho ProN","Noto Serif JP",serif;fill:#8a5f54}
      .template-cinema .main{fill:#f4ede4}.template-cinema .ruby{fill:#ddb5a1}
      .template-notebook .main{fill:#263747;font-family:"Klee","Klee One","Yu Mincho",serif}.template-notebook .ruby{fill:#58758a}
      .template-modern-zh .main{fill:#302820;font-family:"Songti SC","Noto Serif SC",serif}.template-calligraphy .main{fill:#171715;font-family:"Kaiti SC","STKaiti","Songti SC",serif}
      .credit{font-family:"Songti SC","Yu Mincho",serif;letter-spacing:1.4px}
    </style>
  </defs>`;
}

function renderBackground(template: ProjectDocument['layout']['template'], width: number, height: number): string {
  if (template === 'cinema') return `<rect width="${width}" height="${height}" fill="url(#cinema-base)"/><rect width="${width}" height="${height}" fill="url(#cinema-light)"/><rect width="${width}" height="${height}" fill="url(#paper-grain)" opacity=".5"/><path d="M42 44H${width - 42}M42 ${height - 44}H${width - 42}" stroke="#f4ede4" stroke-opacity=".22"/>`;
  if (template === 'notebook') return `<rect width="${width}" height="${height}" fill="url(#notebook-paper)"/><rect width="${width}" height="${height}" fill="url(#notebook-fiber)"/><rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="#46545f" stroke-opacity=".18"/>`;
  if (template === 'modern-zh') return `<rect width="${width}" height="${height}" fill="#eee6d8"/><rect x="26" y="26" width="${width - 52}" height="${height - 52}" rx="2" fill="#f8f3e9" stroke="#9f4233" stroke-opacity=".3"/><path d="M48 64H${width - 48}" stroke="#9f4233" stroke-opacity=".3"/>`;
  if (template === 'calligraphy') return `<rect width="${width}" height="${height}" fill="#eeeade"/><circle cx="${width * .23}" cy="${height * .25}" r="${width * .22}" fill="#70706a" opacity=".08"/><path d="M0 ${height * .78} Q${width * .3} ${height * .68} ${width} ${height * .82}V${height}H0Z" fill="#30302d" opacity=".08"/><rect width="${width}" height="${height}" fill="url(#paper-grain)"/>`;
  return `<rect width="${width}" height="${height}" fill="#f5efe3"/><rect width="${width}" height="${height}" fill="url(#paper-grain)"/><rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="#554834" stroke-opacity=".16"/>`;
}

type TextMetrics = { fontSize: number; advance: number; crossAdvance: number; rubySize: number };

function metricsFromVerticalPlan(plan: VerticalCopyPlan, width: number): TextMetrics {
  const fontSize = plan.fontSizeCqw * width / 100;
  return {
    fontSize: round(fontSize),
    advance: round(fontSize * (1 + plan.letterSpacingEm)),
    crossAdvance: round(fontSize * plan.columnPitchEm),
    rubySize: round(fontSize * .38)
  };
}

function getTextMetrics(sourceText: string, direction: ProjectDocument['layout']['direction'], template: ProjectDocument['layout']['template']): TextMetrics {
  const length = Array.from(sourceText.trim()).length;
  const density = length <= 18 ? 'short' : length >= 42 ? 'long' : 'regular';
  if (direction === 'horizontal') {
    const fontSize = { short: 53, regular: 48, long: 40 }[density];
    return { fontSize, advance: Math.round(fontSize * 2.15), crossAdvance: fontSize, rubySize: Math.round(fontSize * .38) };
  }
  const calligraphic = template === 'calligraphy';
  const fontSize = calligraphic
    ? { short: 64, regular: 57, long: 47 }[density]
    : { short: 61, regular: 54, long: 44 }[density];
  return {
    fontSize,
    advance: Math.round(fontSize * 1.08),
    crossAdvance: Math.round(fontSize * (calligraphic ? 2.4 : 2.25)),
    rubySize: Math.round(fontSize * .38)
  };
}

function fitVerseMetrics(
  lines: string[], width: number, height: number,
  template: ProjectDocument['layout']['template'], direction: ProjectDocument['layout']['direction'],
  metrics: TextMetrics
): TextMetrics {
  const calligraphic = template === 'calligraphy';
  const lineHeight = direction === 'vertical' ? (calligraphic ? 2.4 : 2.25) : 2.15;
  const maxCharacters = Math.max(...lines.map(line => Array.from(line).length));
  const frameHeight = height * .74;
  const fittedSize = direction === 'vertical'
    ? Math.min(metrics.fontSize, width * .82 / (lines.length * lineHeight), frameHeight / (maxCharacters * 1.08))
    : Math.min(metrics.fontSize, width * .8 / maxCharacters, frameHeight / (lines.length * lineHeight));
  const fontSize = Math.max(20, Math.floor(fittedSize));
  return {
    fontSize,
    advance: Math.round(fontSize * (direction === 'vertical' ? 1.08 : 2.15)),
    crossAdvance: Math.round(fontSize * (calligraphic ? 2.4 : 2.25)),
    rubySize: Math.round(fontSize * .38)
  };
}

function renderVerticalVerse(lines: string[], width: number, height: number, metrics: TextMetrics): string {
  const { fontSize, advance, crossAdvance: columnGap } = metrics;
  const top = height * .1;
  const bottom = height * .1;
  const frameHeight = height - top - bottom;
  const longestLine = Math.max(...lines.map(line => Array.from(line).length));
  const blockHeight = longestLine * advance;
  const startY = top + Math.max(0, (frameHeight - blockHeight) / 2) + advance / 2;
  const rightmostX = width / 2 + (lines.length - 1) * columnGap / 2;

  return lines.map((line, column) => Array.from(line).map((character, row) =>
    `<text class="main" x="${round(rightmostX - column * columnGap)}" y="${round(startY + row * advance)}" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle">${escapeXml(character)}</text>`
  ).join('')).join('');
}

function renderHorizontalVerse(lines: string[], width: number, height: number, metrics: TextMetrics): string {
  const { fontSize, advance: lineAdvance } = metrics;
  const top = height * .14;
  const bottom = Math.max(72, height * .12);
  const frameHeight = height - top - bottom;
  const totalHeight = (lines.length - 1) * lineAdvance + fontSize;
  const firstBaseline = top + (frameHeight - totalHeight) / 2 + fontSize * .82;

  return lines.map((line, index) => {
    const lineWidth = measureText(line, fontSize);
    return `<text class="main" x="${round((width - lineWidth) / 2)}" y="${round(firstBaseline + index * lineAdvance)}" font-size="${fontSize}">${escapeXml(line)}</text>`;
  }).join('');
}

function renderVerticalText(
  tokens: TextToken[], width: number, height: number,
  template: ProjectDocument['layout']['template'], metrics: TextMetrics,
  plan: VerticalCopyPlan
): string {
  const { fontSize, advance, crossAdvance: columnGap, rubySize } = metrics;
  const top = height * .1;
  const bottom = height * .1;
  const frameHeight = height - top - bottom;
  const longestColumn = Math.max(1, ...plan.columns.map(column =>
    column.reduce((sum, item) => sum + Array.from(item.surface).length, 0)
  ));
  const blockHeight = (longestColumn - 1) * advance + fontSize;
  const startY = top + Math.max(0, (frameHeight - blockHeight) / 2) + fontSize / 2;
  const rightmostX = width / 2 + (plan.columns.length - 1) * columnGap / 2 + plan.opticalShiftCqw * width / 100;
  const output: string[] = [];

  if (template === 'notebook') {
    const guides = Array.from({ length: plan.columns.length }, (_, index) => {
      const x = rightmostX - index * columnGap - columnGap / 2;
      return `M${round(x)} ${round(top)}V${round(height - bottom)}`;
    }).join('');
    output.push(`<path d="${guides}" stroke="#4a708b" stroke-opacity=".16" stroke-width="1"/>`);
  }

  plan.columns.forEach((column, columnIndex) => {
    let row = 0;
    const tokenX = rightmostX - columnIndex * columnGap;
    for (const item of column) {
      const token = tokens[item.tokenIndex];
      const tokenStartRow = row;
      for (const character of Array.from(item.surface)) {
        const y = startY + row * advance;
        output.push(`<text class="main" x="${round(tokenX)}" y="${round(y)}" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle">${escapeXml(character)}</text>`);
        row++;
      }

      if (item.fullToken && token.reading) {
        const prefixLength = Array.from(token.prefixKana ?? '').length;
        const baseLength = Array.from(token.base ?? token.surface).length;
        const reading = Array.from(token.reading);
        const readingAdvance = Math.max(12, Math.round(rubySize * 1.05));
        const rubyStart = startY + (tokenStartRow + prefixLength) * advance - advance / 2 + (Math.max(1, baseLength) * advance - reading.length * readingAdvance) / 2 + readingAdvance / 2;
        reading.forEach((character, index) => {
          const small = isSmallKana(character);
          const displayedSize = small ? round(rubySize * .7) : rubySize;
          const x = tokenX + fontSize * .73 + (small ? rubySize * .08 : 0);
          const y = rubyStart + index * readingAdvance - (small ? rubySize * .06 : 0);
          output.push(`<text class="ruby${small ? ' ruby-small-kana' : ''}" x="${round(x)}" y="${round(y)}" font-size="${displayedSize}" text-anchor="middle" dominant-baseline="middle">${escapeXml(character)}</text>`);
        });
      }
    }
  });
  return output.join('');
}

function renderHorizontalText(tokens: TextToken[], width: number, height: number, template: ProjectDocument['layout']['template'], metrics: TextMetrics): string {
  const { fontSize, advance: lineAdvance, rubySize } = metrics;
  const maxLineWidth = width * .78;
  const lines = layoutHorizontalLines(tokens, maxLineWidth, fontSize, rubySize);
  const top = height * .14;
  const bottom = Math.max(72, height * .12);
  const frameHeight = height - top - bottom;
  const totalHeight = (lines.length - 1) * lineAdvance + fontSize;
  const firstBaseline = top + (frameHeight - totalHeight) / 2 + fontSize * .82;
  const output: string[] = [];

  if (template === 'notebook') {
    const firstRowCenter = firstBaseline - fontSize * .32;
    const guides = Array.from({ length: lines.length + 1 }, (_, index) => {
      const y = firstRowCenter - lineAdvance / 2 + index * lineAdvance;
      return `M${round((width - maxLineWidth) / 2)} ${round(y)}H${round((width + maxLineWidth) / 2)}`;
    }).join('');
    output.push(`<path d="${guides}" stroke="#4a708b" stroke-opacity=".16" stroke-width="1"/>`);
  }

  lines.forEach((line, lineIndex) => {
    let x = (width - line.width) / 2;
    const y = firstBaseline + lineIndex * lineAdvance;
    for (const item of line.items) {
      if (item.token.reading) {
        output.push(`<text class="ruby" x="${round(x + item.prefixWidth + item.baseWidth / 2)}" y="${round(y - fontSize * .9)}" font-size="${rubySize}" text-anchor="middle">${renderRubyReading(item.token.reading, rubySize)}</text>`);
        output.push(`<text class="main" x="${round(x)}" y="${round(y)}" font-size="${fontSize}">${escapeXml(item.prefixKana + item.base + item.okurigana)}</text>`);
      } else {
        output.push(`<text class="main" x="${round(x)}" y="${round(y)}" font-size="${fontSize}">${escapeXml(item.token.surface)}</text>`);
      }
      x += item.width;
    }
  });
  return output.join('');
}

function layoutHorizontalLines(tokens: TextToken[], maxWidth: number, fontSize: number, rubySize: number) {
  type Item = { token: TextToken; prefixKana: string; base: string; okurigana: string; prefixWidth: number; baseWidth: number; width: number };
  const lines: Array<{ items: Item[]; width: number }> = [{ items: [], width: 0 }];
  for (const token of tokens) {
    const prefixKana = token.prefixKana ?? '';
    const base = token.base ?? token.surface;
    const okurigana = token.okurigana ?? '';
    const prefixWidth = measureText(prefixKana, fontSize);
    const baseWidth = measureText(base, fontSize);
    const visibleWidth = token.reading
      ? prefixWidth + baseWidth + measureText(okurigana, fontSize)
      : measureText(token.surface, fontSize);
    const annotatedWidth = token.reading
      ? prefixWidth + Math.max(baseWidth, measureText(token.reading, rubySize)) + measureText(okurigana, fontSize)
      : visibleWidth;
    const item = { token, prefixKana, base, okurigana, prefixWidth, baseWidth, width: Math.max(visibleWidth, annotatedWidth) };
    let line = lines.at(-1)!;
    if (line.items.length && line.width + item.width > maxWidth) {
      line = { items: [], width: 0 };
      lines.push(line);
    }
    line.items.push(item);
    line.width += item.width;
  }
  return lines;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function renderAttribution(project: ProjectDocument, width: number, height: number): string {
  const color = project.layout.template === 'cinema' ? '#f4ede4' : project.layout.template === 'notebook' ? '#5b493f' : '#25231f';
  const muted = project.layout.template === 'cinema' ? '#b9aea5' : '#777065';
  const values = [project.content.attribution.work, project.content.attribution.speaker, project.content.attribution.author].filter(Boolean);
  if (project.layout.direction === 'vertical') {
    const rightmostX = Math.max(92, width * .187);
    return values.map((value, index) => {
      const fontSize = index ? 14 : 17;
      const advance = fontSize * 1.22;
      const characters = Array.from(value);
      const x = rightmostX - index * 24;
      const lastY = height - 62;
      const firstY = lastY - (characters.length - 1) * advance;
      return characters.map((character, characterIndex) => `<text class="credit" x="${round(x)}" y="${round(firstY + characterIndex * advance)}" font-size="${fontSize}" fill="${index ? muted : color}" text-anchor="middle" dominant-baseline="middle">${escapeXml(character)}</text>`).join('');
    }).join('');
  }
  return values.map((value, index) => `<text class="credit" x="60" y="${height - 86 + index * 21}" font-size="${index ? 14 : 17}" fill="${index ? muted : color}">${escapeXml(value)}</text>`).join('');
}

function renderSeal(template: ProjectDocument['layout']['template'], width: number, height: number): string {
  const color = template === 'cinema' ? '#d17961' : template === 'notebook' ? '#4f748c' : '#a54432';
  const x = width - 76;
  const y = height - 78;
  const shape = template === 'notebook' ? `<circle cx="${x}" cy="${y}" r="20" fill="none" stroke="${color}"/>` : `<rect x="${x - 20}" y="${y - 20}" width="40" height="40" fill="none" stroke="${color}" stroke-width="2"/>`;
  return `${shape}<text x="${x}" y="${y + 7}" fill="${color}" font-family="Songti SC,serif" font-size="20" text-anchor="middle">葉</text>`;
}

function measureText(value: string, fontSize: number): number {
  return Array.from(value).reduce((total, character) => total + (/^[\x00-\x7F]$/.test(character) ? fontSize * .56 : fontSize), 0);
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function renderRubyReading(value: string, rubySize: number): string {
  return Array.from(value).map(character => isSmallKana(character)
    ? `<tspan class="ruby-small-kana" font-size="${round(rubySize * .7)}">${escapeXml(character)}</tspan>`
    : escapeXml(character)
  ).join('');
}

function safeFileSegment(value: string): string {
  const normalized = value.normalize('NFKC').replace(/[『』「」《》〈〉\s/\\:*?"<>|]+/g, '-');
  return normalized.replace(/^-+|-+$/g, '').slice(0, 36) || 'quote';
}
