import type { TextToken } from '../document/schema';
import { assertTokenInvariant } from '../document/schema';

export type JapaneseDictionary = Record<string, string[]>;

export type JapaneseAnalysis = {
  tokens: TextToken[];
  uncertainCount: number;
};

const scriptPattern = /([\u4E00-\u9FFF]+|[\u3040-\u309F]+|[\u30A0-\u30FF]+|[^\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]+)/g;

export function splitJapaneseScripts(text: string): string[] {
  return text.match(scriptPattern) ?? [];
}

export function buildOkuriganaSet(dictionary: JapaneseDictionary): Set<string> {
  const result = new Set<string>();
  for (const word of Object.keys(dictionary)) {
    if (/^[\u4E00-\u9FFF]+[\u3040-\u309F]+$/.test(word)) {
      result.add(word[0]);
    }
  }
  return result;
}

export function analyzeJapanese(
  sourceText: string,
  dictionary: JapaneseDictionary,
  suppliedOkuriganaSet?: Set<string>
): JapaneseAnalysis {
  const okuriganaSet = suppliedOkuriganaSet ?? buildOkuriganaSet(dictionary);
  const segments = splitJapaneseScripts(sourceText);
  const tokens: TextToken[] = [];
  let offset = 0;

  const pushToken = (
    surface: string,
    options: Partial<Omit<TextToken, 'id' | 'start' | 'end' | 'surface'>> = {}
  ) => {
    const start = offset;
    const end = start + surface.length;
    tokens.push({
      id: `token-${start}-${end}-${surface.codePointAt(0) ?? 0}`,
      start,
      end,
      surface,
      candidates: [],
      locked: false,
      ...options
    });
    offset = end;
  };

  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    const nextSegment = segments[index + 1];

    if (
      okuriganaSet.has(segment[0]) &&
      /^[\u4E00-\u9FFF]+$/.test(segment) &&
      nextSegment &&
      /^[\u3040-\u309F]+$/.test(nextSegment)
    ) {
      let match: { surface: string; okurigana: string; readings: string[] } | undefined;

      for (let length = nextSegment.length; length >= 1; length--) {
        const okurigana = nextSegment.slice(0, length);
        const surface = segment + okurigana;
        if (dictionary[surface]) {
          match = { surface, okurigana, readings: dictionary[surface] };
          break;
        }
      }

      if (match) {
        const candidates = unique(match.readings.map(reading => stripOkurigana(reading, match.okurigana)));
        pushToken(match.surface, {
          base: segment,
          okurigana: match.okurigana,
          reading: candidates[0],
          candidates,
          readingSource: 'dictionary',
          confidence: confidenceFor(candidates)
        });

        const remainder = nextSegment.slice(match.okurigana.length);
        if (remainder) pushToken(remainder);
        index++;
        continue;
      }
    }

    if (dictionary[segment] && segment.length > 1) {
      const candidates = unique(dictionary[segment]);
      pushToken(segment, {
        base: segment,
        reading: candidates[0],
        candidates,
        readingSource: 'dictionary',
        confidence: confidenceFor(candidates)
      });
      continue;
    }

    if (/^[\u4E00-\u9FFF]+$/.test(segment)) {
      for (const character of segment) {
        const candidates = unique(dictionary[character] ?? []);
        pushToken(character, candidates.length ? {
          base: character,
          reading: candidates[0],
          candidates,
          readingSource: 'dictionary',
          confidence: candidates.length === 1 ? 'medium' : 'low'
        } : { confidence: 'low' });
      }
      continue;
    }

    pushToken(segment);
  }

  assertTokenInvariant(sourceText, tokens);

  return {
    tokens,
    uncertainCount: tokens.filter(item => item.confidence === 'low').length
  };
}

function stripOkurigana(reading: string, okurigana: string): string {
  return reading.endsWith(okurigana) ? reading.slice(0, -okurigana.length) : reading;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function confidenceFor(candidates: string[]): 'high' | 'medium' | 'low' {
  if (candidates.length <= 1) return 'high';
  if (candidates.length <= 3) return 'medium';
  return 'low';
}
