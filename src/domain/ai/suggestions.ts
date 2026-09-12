import { z } from 'zod';
import type { ProjectDocument } from '../document/schema';

export const CreativeSuggestionSchema = z.object({
  explanationZh: z.string().max(240),
  contextNoteZh: z.string().max(240),
  suggestedTemplate: z.enum(['bunko', 'cinema', 'notebook', 'modern-zh', 'calligraphy']),
  suggestedDirection: z.enum(['vertical', 'horizontal']),
  suggestedRatio: z.enum(['3:4', '4:5', '1:1']),
  textureDescription: z.string().max(120)
});

export type CreativeSuggestion = z.infer<typeof CreativeSuggestionSchema>;

export function suggestLocally(project: ProjectDocument): CreativeSuggestion {
  const isChinese = project.locale !== 'ja-JP';
  const short = project.content.sourceText.length <= 36;
  return {
    explanationZh: isChinese ? '保留原句，让出处与留白承担叙事。可在释义栏补充一行现代汉语解释。' : '让原句保持主角位置，中文释义只承担入口，不与日文争夺视觉重心。',
    contextNoteZh: isChinese ? '本地建议：核对原典、版本与异体字后再公开发布。' : '本地建议：核对作品版本、说话者与语境后再公开发布。',
    suggestedTemplate: isChinese ? short ? 'calligraphy' : 'modern-zh' : short ? 'cinema' : 'bunko',
    suggestedDirection: short ? 'vertical' : 'horizontal',
    suggestedRatio: '4:5',
    textureDescription: isChinese ? '淡墨、宣纸纤维、无文字背景' : '低对比纸纹、克制颗粒、无文字背景'
  };
}

export async function requestCloudSuggestion(project: ProjectDocument, endpoint: string): Promise<CreativeSuggestion> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceText: project.content.sourceText, locale: project.locale })
  });
  if (!response.ok) throw new Error(`智能建议服务暂时不可用（${response.status}）。`);
  return CreativeSuggestionSchema.parse(await response.json());
}
