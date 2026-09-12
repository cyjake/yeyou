import type { ProjectDocument } from '../document/schema';

const simplifiedOnly = new Set(Array.from('见风画书云国后发里为无这来时说学长门东车马鸟鱼龙爱听体万与叶台岁归梦乡钟'));
const traditionalOnly = new Set(Array.from('見風畫書雲國後發裡為無這來時說學長門東車馬鳥魚龍愛聽體萬與葉臺歲歸夢鄉鐘'));

export function validateChineseScript(text: string, locale: ProjectDocument['locale']): string[] {
  if (locale === 'ja-JP') return [];
  const forbidden = locale === 'zh-Hans-CN' ? traditionalOnly : simplifiedOnly;
  const found = Array.from(new Set(Array.from(text).filter(character => forbidden.has(character))));
  if (!found.length) return [];
  const expected = locale === 'zh-Hans-CN' ? '简体' : '繁体';
  return [`检测到可能不符合${expected}策略的字：${found.join('、')}；原文不会被自动转换`];
}

export function localeLabel(locale: ProjectDocument['locale']): string {
  return {
    'ja-JP': '日本語',
    'zh-Hans-CN': '简体中文',
    'zh-Hant-TW': '繁體中文・台灣',
    'zh-Hant-HK': '繁體中文・香港'
  }[locale];
}
