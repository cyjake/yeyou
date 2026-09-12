import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { isKatakanaLookupToken, RenderedToken } from './App';

describe('studio foundation', () => {
  it('keeps the exact showcase quotation', () => {
    const source = '国境の長いトンネルを抜けると雪国であった。';
    expect(source).toContain('雪国');
    expect(source).not.toContain('雪國');
  });

  it('keeps kanji and okurigana inside one interactive word', () => {
    const html = renderToStaticMarkup(
      <RenderedToken
        token={{
          id: 'meguru', start: 0, end: 2, surface: '巡る', base: '巡', okurigana: 'る',
          reading: 'めぐ', candidates: ['めぐ'], locked: false
        }}
        active={false}
        onOpen={() => undefined}
      />
    );

    expect(html).toContain('<span class="ruby-base">巡</span>');
    expect(html).toContain('<rt>めぐ</rt>');
    expect(html).toContain('<span class="okurigana">る</span></button>');
    expect(html).toContain('巡る，读音 めぐる，点击校对');
  });

  it('marks small kana so a font cannot make the reading ambiguous', () => {
    const html = renderToStaticMarkup(
      <RenderedToken
        token={{
          id: 'border', start: 0, end: 2, surface: '国境', base: '国境',
          reading: 'こっきょう', candidates: ['こっきょう'], locked: false
        }}
        active={false}
        onOpen={() => undefined}
      />
    );

    expect(html).toContain('こ<span class="small-kana">っ</span>き<span class="small-kana">ょ</span>う');
    expect(html).not.toContain('<span class="small-kana">つ</span>');
  });

  it('exposes confirmation state on uncertain ruby markup', () => {
    const token = {
      id: 'uncertain', start: 0, end: 1, surface: '閑', base: '閑',
      reading: 'しずか', candidates: ['しずか'], confidence: 'low' as const, locked: false
    };
    const uncertain = renderToStaticMarkup(
      <RenderedToken token={token} active={false} onOpen={() => undefined} />
    );
    const confirmed = renderToStaticMarkup(
      <RenderedToken token={{ ...token, locked: true }} active={false} onOpen={() => undefined} />
    );

    expect(uncertain).toContain('data-locked="false"');
    expect(confirmed).toContain('data-locked="true"');
  });

  it('renders leading kana outside ruby but highlights the complete word', () => {
    const html = renderToStaticMarkup(
      <RenderedToken
        token={{
          id: 'shimiiru', start: 0, end: 4, surface: 'しみ入る', prefixKana: 'しみ',
          base: '入', reading: 'い', okurigana: 'る', candidates: ['い'], locked: false
        }}
        active={false}
        onOpen={() => undefined}
      />
    );

    expect(html).toContain('<span class="prefix-kana">しみ</span><ruby');
    expect(html).toContain('<span class="ruby-base">入</span><rt>い</rt>');
    expect(html).toContain('<span class="okurigana">る</span>');
    expect(html).toContain('しみ入る，读音 しみいる，点击校对');
  });

  it('makes a complete katakana word available for dictionary lookup', () => {
    const html = renderToStaticMarkup(
      <RenderedToken
        token={{
          id: 'tunnel', start: 0, end: 4, surface: 'トンネル',
          candidates: [], locked: false
        }}
        active={false}
        onOpen={() => undefined}
      />
    );

    expect(isKatakanaLookupToken('トンネル')).toBe(true);
    expect(isKatakanaLookupToken('トンネルを')).toBe(false);
    expect(html).toContain('class="ruby-trigger dictionary-trigger');
    expect(html).toContain('トンネル，点击查词');
  });
});
