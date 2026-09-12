import { z } from 'zod';

export const TextTokenSchema = z.object({
  id: z.string().min(1),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  surface: z.string(),
  prefixKana: z.string().optional(),
  base: z.string().optional(),
  okurigana: z.string().optional(),
  reading: z.string().optional(),
  candidates: z.array(z.string()).default([]),
  readingSource: z.enum(['analyzer', 'dictionary', 'manual']).optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
  locked: z.boolean().default(false)
});

export const AttributionSchema = z.object({
  work: z.string().default(''),
  author: z.string().default(''),
  speaker: z.string().default(''),
  year: z.string().default('')
});

export const ProjectDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  locale: z.enum(['ja-JP', 'zh-Hans-CN', 'zh-Hant-TW', 'zh-Hant-HK']),
  content: z.object({
    sourceText: z.string(),
    translationZh: z.string().default(''),
    contextNoteZh: z.string().default(''),
    pronunciation: z.string().default(''),
    attribution: AttributionSchema,
    tokens: z.array(TextTokenSchema)
  }),
  layout: z.object({
    template: z.enum(['bunko', 'cinema', 'notebook', 'modern-zh', 'calligraphy']),
    direction: z.enum(['vertical', 'horizontal']),
    ratio: z.enum(['3:4', '4:5', '1:1'])
  }),
  export: z.object({
    scale: z.number().min(1).max(4),
    format: z.enum(['png', 'pdf'])
  }),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type TextToken = z.infer<typeof TextTokenSchema>;
export type ProjectDocument = z.infer<typeof ProjectDocumentSchema>;
export type Attribution = z.infer<typeof AttributionSchema>;

const initialSource = '国境の長いトンネルを抜けると雪国であった。';

export function createInitialProject(): ProjectDocument {
  const now = new Date().toISOString();

  const project = ProjectDocumentSchema.parse({
    schemaVersion: 1,
    id: 'snow-country-demo',
    locale: 'ja-JP',
    content: {
      sourceText: initialSource,
      translationZh: '穿过县界长长的隧道，便是雪国。',
      contextNoteZh: '',
      pronunciation: '',
      attribution: {
        work: '『雪国』',
        author: '川端康成',
        speaker: '',
        year: ''
      },
      tokens: [
        token(0, 2, '国境', 'こっきょう'),
        token(2, 3, 'の'),
        token(3, 5, '長い', 'なが', '長', 'い'),
        token(5, 9, 'トンネル'),
        token(9, 10, 'を'),
        token(10, 13, '抜ける', 'ぬ', '抜', 'ける'),
        token(13, 14, 'と'),
        token(14, 16, '雪国', 'ゆきぐに'),
        token(16, initialSource.length, 'であった。')
      ]
    },
    layout: {
      template: 'bunko',
      direction: 'vertical',
      ratio: '3:4'
    },
    export: {
      scale: 2,
      format: 'png'
    },
    createdAt: now,
    updatedAt: now
  });

  assertTokenInvariant(project.content.sourceText, project.content.tokens);
  return project;
}

function token(
  start: number,
  end: number,
  surface: string,
  reading?: string,
  base?: string,
  okurigana?: string
): TextToken {
  return {
    id: `initial-${start}-${end}`,
    start,
    end,
    surface,
    base,
    okurigana,
    reading,
    candidates: reading ? [reading] : [],
    readingSource: reading ? 'dictionary' : undefined,
    confidence: reading ? 'high' : undefined,
    locked: false
  };
}

export function assertTokenInvariant(sourceText: string, tokens: TextToken[]): void {
  const reconstructed = tokens.map(item => item.surface).join('');
  if (reconstructed !== sourceText) {
    throw new Error('Token surfaces no longer match the source text exactly.');
  }

  for (const item of tokens) {
    if (sourceText.slice(item.start, item.end) !== item.surface) {
      throw new Error(`Token ${item.id} has an invalid source range.`);
    }
  }
}

export function reconcileLockedTokens(previous: TextToken[], next: TextToken[]): TextToken[] {
  const lockedByRange = new Map(
    previous
      .filter(item => item.locked)
      .map(item => [`${item.start}:${item.end}:${item.surface}`, item])
  );

  return next.map(item => {
    const preserved = lockedByRange.get(`${item.start}:${item.end}:${item.surface}`);
    if (!preserved) return item;

    return {
      ...item,
      reading: preserved.reading,
      readingSource: 'manual',
      locked: true
    };
  });
}
