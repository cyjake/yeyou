const SMALL_KANA = new Set(Array.from(
  'ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ'
));

export function isSmallKana(character: string): boolean {
  return SMALL_KANA.has(character);
}
