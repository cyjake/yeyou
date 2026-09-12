const VERSE_ENDINGS = new Set(['，', '。', '！', '？', '；', ',', '.', '!', '?', ';']);
const CLOSING_MARKS = new Set(['”', '’', '」', '』', '》', '〉']);

/**
 * Returns punctuation-preserving lines only when the text confidently resembles
 * a regular five- or seven-character Chinese poem. Prose is deliberately left
 * to the browser's normal line breaking.
 */
export function detectClassicalVerseLines(value: string): string[] | null {
  const characters = Array.from(value.replace(/\r\n?/g, '\n'));
  const lines: string[] = [];
  let buffer = '';

  const flush = () => {
    const line = buffer.trim();
    if (line) lines.push(line);
    buffer = '';
  };

  for (let index = 0; index < characters.length; index++) {
    const character = characters[index];
    if (character === '\n') {
      flush();
      continue;
    }

    buffer += character;
    if (!VERSE_ENDINGS.has(character)) continue;
    while (CLOSING_MARKS.has(characters[index + 1])) buffer += characters[++index];
    flush();
  }
  flush();

  if (lines.length < 2) return null;
  const counts = lines.map(countHanCharacters);
  const meter = counts[0];
  return (meter === 5 || meter === 7) && counts.every(count => count === meter) ? lines : null;
}

function countHanCharacters(value: string): number {
  return Array.from(value).filter(character => /\p{Script=Han}/u.test(character)).length;
}
