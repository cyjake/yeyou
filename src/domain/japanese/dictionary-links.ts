export type DictionaryLink = { label: string; href: string };

export function dictionaryLinksFor(surface: string): DictionaryLink[] {
  const term = encodeURIComponent(surface);
  return [
    { label: 'MOJi辞書', href: `https://www.mojidict.com/searchText/${term}` },
    { label: 'Jisho', href: `https://jisho.org/search/${term}` }
  ];
}
