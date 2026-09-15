import type { ProjectDocument, TextToken } from '../document/schema';

export type VerticalLayoutItem = {
  tokenIndex: number;
  surface: string;
  fullToken: boolean;
};

export type VerticalCopyPlan = {
  columns: VerticalLayoutItem[][];
  fontSizeCqw: number;
  letterSpacingEm: number;
  columnPitchEm: number;
  opticalShiftCqw: number;
};

const ratioAspect = { '3:4': 3 / 4, '4:5': 4 / 5, '1:1': 1 } as const;

// CJK line-breaking prohibition rules (禁则处理): closing punctuation stays
// with the preceding text, while opening punctuation stays with what follows.
const PROHIBITED_AT_COLUMN_START = new Set(Array.from('、。，．！？；：…‥）〕］｝〉》」』】〙〗〟’”»﹂﹄﹐﹑﹒﹔﹕﹖﹗'));
const PROHIBITED_AT_COLUMN_END = new Set(Array.from('（〔［｛〈《「『【〘〖〝‘“«﹁﹃'));
const PREFERRED_AT_COLUMN_END = new Set(Array.from('、。，．！？；：…‥）〕］｝〉》」』】〙〗〟’”»﹂﹄﹐﹑﹒﹔﹕﹖﹗'));
const NON_PUNCTUATION_BREAK_TIEBREAKER = 0.01;

export function planVerticalCopy(
  tokens: TextToken[],
  ratio: ProjectDocument['layout']['ratio'],
  template: ProjectDocument['layout']['template']
): VerticalCopyPlan {
  const items = layoutItems(tokens);
  const characterCount = items.reduce((sum, item) => sum + countCharacters(item.surface), 0);
  const density = characterCount <= 18 ? 'short' : characterCount >= 42 ? 'long' : 'regular';
  const calligraphic = template === 'calligraphy';
  const preferredSize = calligraphic
    ? { short: 10.65, regular: 9.5, long: 7.85 }[density]
    : { short: 10.2, regular: 9, long: 7.4 }[density];
  const letterSpacingEm = template === 'notebook' ? 0.1 : 0.08;
  const columnPitchEm = calligraphic ? 2.4 : 2.25;
  const frameWidth = 84;
  // Keep vertical copy inside the same taller 80%-high frame used by the
  // preview and export renderers.
  const frameHeight = 80 / ratioAspect[ratio];

  if (!items.length) {
    return { columns: [[]], fontSizeCqw: preferredSize, letterSpacingEm, columnPitchEm, opticalShiftCqw: 0 };
  }

  const idealColumnEstimate = Math.sqrt(characterCount * (1 + letterSpacingEm) * frameWidth / (columnPitchEm * frameHeight));
  const idealColumns = Math.max(1, Math.min(items.length, Math.ceil(idealColumnEstimate - 0.15)));
  const columns = balancedPartitions(items, idealColumns);
  const balancedPreferredSize = density === 'short' && columns.length >= 3
    ? preferredSize * 0.9
    : preferredSize;
  const columnLengths = columns.map(column => column.reduce((sum, item) => sum + countCharacters(item.surface), 0));
  const longestColumn = Math.max(...columnLengths);
  const inlineUnits = longestColumn + Math.max(0, longestColumn - 1) * letterSpacingEm;
  const crossUnits = 1 + Math.max(0, columns.length - 1) * columnPitchEm + 0.45;
  const fontSizeCqw = round(Math.max(4.8, Math.min(
    balancedPreferredSize,
    frameHeight * 0.94 / inlineUnits,
    frameWidth * 0.94 / crossUnits
  )));
  const weightedOffsetEm = columnLengths.reduce((sum, length, index) =>
    sum + (((columns.length - 1) / 2 - index) * columnPitchEm * length), 0
  ) / Math.max(1, characterCount);

  return {
    columns,
    fontSizeCqw,
    letterSpacingEm,
    columnPitchEm,
    opticalShiftCqw: round(-weightedOffsetEm * fontSizeCqw)
  };
}

function layoutItems(tokens: TextToken[]): VerticalLayoutItem[] {
  const splitPlainCopy = tokens.length === 1 && !tokens[0]?.reading;
  const items: VerticalLayoutItem[] = [];
  tokens.forEach((token, tokenIndex) => {
    if (!splitPlainCopy) {
      items.push({ tokenIndex, surface: token.surface, fullToken: true });
      return;
    }
    Array.from(token.surface).forEach(surface => items.push({ tokenIndex, surface, fullToken: false }));
  });
  return items;
}

function balancedPartitions(
  items: VerticalLayoutItem[],
  columnCount: number,
  enforceCjkBreaks = true
): VerticalLayoutItem[][] {
  if (columnCount <= 1) return [items];
  const count = items.length;
  const prefix = [0];
  for (const item of items) prefix.push(prefix.at(-1)! + countCharacters(item.surface));
  const target = prefix[count] / columnCount;
  const costs = Array.from({ length: columnCount + 1 }, () => Array(count + 1).fill(Number.POSITIVE_INFINITY));
  const breaks = Array.from({ length: columnCount + 1 }, () => Array(count + 1).fill(0));
  costs[0][0] = 0;

  for (let columns = 1; columns <= columnCount; columns++) {
    for (let end = columns; end <= count; end++) {
      for (let start = columns - 1; start < end; start++) {
        if (enforceCjkBreaks && !isLegalColumn(items, start, end)) continue;
        const length = prefix[end] - prefix[start];
        // Balance remains the primary objective. This tiny secondary cost only
        // resolves otherwise equivalent layouts in favor of a completed clause.
        const breakPreferenceCost = enforceCjkBreaks && end < count && !endsWithPreferredPunctuation(items[end - 1].surface)
          ? NON_PUNCTUATION_BREAK_TIEBREAKER
          : 0;
        const cost = costs[columns - 1][start] + (length - target) ** 2 + breakPreferenceCost;
        if (cost < costs[columns][end]) {
          costs[columns][end] = cost;
          breaks[columns][end] = start;
        }
      }
    }
  }

  // Malformed or punctuation-only copy can make a fully legal partition
  // impossible. Preserve all source text with the old balanced fallback.
  if (!Number.isFinite(costs[columnCount][count])) {
    return balancedPartitions(items, columnCount, false);
  }

  const result: VerticalLayoutItem[][] = [];
  let end = count;
  for (let columns = columnCount; columns > 0; columns--) {
    const start = breaks[columns][end];
    result.unshift(items.slice(start, end));
    end = start;
  }
  return result;
}

function isLegalColumn(items: VerticalLayoutItem[], start: number, end: number): boolean {
  if (start > 0 && PROHIBITED_AT_COLUMN_START.has(firstCharacter(items[start].surface))) return false;
  if (end < items.length && PROHIBITED_AT_COLUMN_END.has(lastCharacter(items[end - 1].surface))) return false;
  return true;
}

function firstCharacter(value: string): string {
  return Array.from(value)[0] ?? '';
}

function lastCharacter(value: string): string {
  return Array.from(value).at(-1) ?? '';
}

function endsWithPreferredPunctuation(value: string): boolean {
  return PREFERRED_AT_COLUMN_END.has(lastCharacter(value));
}

function countCharacters(value: string): number {
  return Array.from(value).length;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
