import type { IpadicFeatures, Tokenizer } from '@faanau/kuromoji';
import type { TextToken } from '../document/schema';
import { assertTokenInvariant } from '../document/schema';
import { analyzeJapanese, type JapaneseAnalysis, type JapaneseDictionary } from './analyzer';

const kanjiPattern = /[\u4E00-\u9FFF]/;
const standaloneDictionaryWord = /^[\u4E00-\u9FFF]+[\u3040-\u309F]*$/;

export function analyzeJapaneseHybrid(
  sourceText: string,
  dictionary: JapaneseDictionary,
  tokenizer: Pick<Tokenizer, 'tokenize'>
): JapaneseAnalysis {
  if (dictionary[sourceText] && standaloneDictionaryWord.test(sourceText)) {
    return analyzeJapanese(sourceText, dictionary);
  }

  const tokens: TextToken[] = [];
  let offset = 0;

  for (const analyzed of tokenizer.tokenize(sourceText)) {
    const surface = analyzed.surface_form;
    const start = offset;
    const end = start + surface.length;
    offset = end;

    const annotation = annotationFor(analyzed, dictionary);
    tokens.push({
      id: `token-${start}-${end}-${surface.codePointAt(0) ?? 0}`,
      start,
      end,
      surface,
      candidates: [],
      locked: false,
      ...annotation
    });
  }

  assertTokenInvariant(sourceText, tokens);
  return {
    tokens,
    uncertainCount: tokens.filter(token => token.confidence === 'low').length
  };
}

function annotationFor(
  token: IpadicFeatures,
  dictionary: JapaneseDictionary
): Partial<TextToken> {
  const { surface_form: surface } = token;
  const firstKanji = findFirstKanji(surface);
  const lastKanji = findLastKanji(surface);
  if (lastKanji < 0) return {};

  const prefixKana = surface.slice(0, firstKanji) || undefined;
  const base = surface.slice(firstKanji, lastKanji + 1);
  const okurigana = surface.slice(lastKanji + 1) || undefined;
  const normalizedPrefix = toHiragana(prefixKana ?? '');
  const normalizedSuffix = toHiragana(okurigana ?? '');
  const analyzerReading = stripAffixes(toHiragana(token.reading ?? ''), normalizedPrefix, normalizedSuffix);
  const dictionaryReadings = (dictionary[surface] ?? dictionary[base] ?? [])
    .map(reading => stripAffixes(toHiragana(reading), normalizedPrefix, normalizedSuffix));
  const preferDictionary = standaloneDictionaryWord.test(surface) && dictionary[surface]?.length;
  const reading = preferDictionary ? dictionaryReadings[0] : analyzerReading || dictionaryReadings[0];
  const candidates = unique([reading, analyzerReading, ...dictionaryReadings]);

  if (!reading) {
    return { prefixKana, base, okurigana, confidence: 'low' };
  }

  const analyzerDisagrees = Boolean(analyzerReading && dictionaryReadings.length && !dictionaryReadings.includes(analyzerReading));
  return {
    prefixKana,
    base,
    okurigana,
    reading,
    candidates,
    readingSource: preferDictionary ? 'dictionary' : 'analyzer',
    confidence: token.word_type === 'UNKNOWN' ? 'low' : analyzerDisagrees || candidates.length > 1 ? 'medium' : 'high'
  };
}

function findFirstKanji(value: string): number {
  for (let index = 0; index < value.length; index++) {
    if (kanjiPattern.test(value[index])) return index;
  }
  return -1;
}

function findLastKanji(value: string): number {
  for (let index = value.length - 1; index >= 0; index--) {
    if (kanjiPattern.test(value[index])) return index;
  }
  return -1;
}

function toHiragana(value: string): string {
  return value.replace(/[ァ-ヶ]/g, character =>
    String.fromCharCode(character.charCodeAt(0) - 0x60)
  );
}

function stripAffixes(reading: string, prefix: string, suffix: string): string {
  const withoutPrefix = prefix && reading.startsWith(prefix) ? reading.slice(prefix.length) : reading;
  return suffix && withoutPrefix.endsWith(suffix)
    ? withoutPrefix.slice(0, -suffix.length)
    : withoutPrefix;
}

function unique(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}
