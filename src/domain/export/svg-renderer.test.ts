import { describe, expect, it } from 'vitest';
import { createInitialProject } from '../document/schema';
import { planVerticalCopy } from '../layout/vertical-copy-layout';
import { collectExportWarnings, renderProjectSvg } from './svg-renderer';

describe('SVG export renderer', () => {
  it('renders structured ruby at the requested high-resolution ratio', () => {
    const project = createInitialProject();
    project.layout.ratio = '4:5';
    project.layout.template = 'cinema';
    const artifact = renderProjectSvg(project);

    expect(artifact.width).toBe(1200);
    expect(artifact.height).toBe(1500);
    expect(artifact.svg).toContain('class="copy template-cinema"');
    expect(artifact.svg).toContain('<metadata>国境の長いトンネルを抜けると雪国であった。</metadata>');
    expect(artifact.svg).toContain('class="ruby"');
    const plan = planVerticalCopy(project.content.tokens, project.layout.ratio, project.layout.template);
    const expectedFontSize = Math.round(plan.fontSizeCqw * 60) / 10;
    const expectedRubySize = Math.round(expectedFontSize * .38 * 10) / 10;
    expect(artifact.svg).toContain(`font-size="${expectedFontSize}"`);
    expect(artifact.svg).toContain(`font-size="${expectedRubySize}"`);
    expect(artifact.svg).toContain('class="ruby ruby-small-kana"');
    expect(artifact.svg).toContain('>っ</text>');
    expect(artifact.svg).toContain('>ょ</text>');
    expect(artifact.svg).not.toContain('foreignObject');
  });

  it('escapes user text and creates a safe filename', () => {
    const project = createInitialProject();
    project.layout.direction = 'horizontal';
    project.content.attribution.work = '『A/B & <C>』';
    project.content.attribution.author = '<script>alert(1)</script>';
    const artifact = renderProjectSvg(project);
    expect(artifact.svg).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(artifact.svg).toContain('A/B &amp; &lt;C&gt;');
    expect(artifact.fileName).not.toContain('/');
  });

  it('places notebook rules around writing lanes instead of through the characters', () => {
    const project = createInitialProject();
    project.layout.template = 'notebook';
    project.content.sourceText = '日本';
    project.content.tokens = [{ id: 'short', start: 0, end: 2, surface: '日本', candidates: [], locked: false }];

    const vertical = renderProjectSvg(project).svg;
    expect(vertical).toMatch(/<path d="M[^\"]+ 80V720M[^\"]+ 80V720" stroke="#4a708b"/);
    expect(vertical).not.toContain('stroke="#b75b53"');

    project.layout.direction = 'horizontal';
    const horizontal = renderProjectSvg(project).svg;
    expect(horizontal).toContain('M66 351H534M66 465H534');
  });

  it('positions ruby over only the kanji in a leading-kana compound', () => {
    const project = createInitialProject();
    project.layout.direction = 'horizontal';
    project.content.sourceText = 'しみ入る';
    project.content.tokens = [{
      id: 'shimiiru', start: 0, end: 4, surface: 'しみ入る', prefixKana: 'しみ',
      base: '入', reading: 'い', okurigana: 'る', candidates: ['い'], locked: false
    }];

    const horizontal = renderProjectSvg(project).svg;
    expect(horizontal).toContain('>しみ入る</text>');
    expect(horizontal).toMatch(/<text class="ruby"[^>]+>い<\/text>/);
    expect(horizontal).not.toContain('>しみいる</text>');

    project.layout.direction = 'vertical';
    const vertical = renderProjectSvg(project).svg;
    expect(vertical).toMatch(/<text class="ruby"[^>]+>い<\/text>/);
  });

  it('vertically centers the copy block and renders its attribution vertically', () => {
    const project = createInitialProject();
    project.content.sourceText = '日本';
    project.content.tokens = [{ id: 'short', start: 0, end: 2, surface: '日本', candidates: [], locked: false }];

    const svg = renderProjectSvg(project).svg;
    const firstCharacter = svg.match(/<text class="main" x="300" y="([^"]+)" font-size="([^"]+)"/);
    expect(firstCharacter).toBeTruthy();
    expect(Number(firstCharacter?.[1])).toBeGreaterThan(300);
    expect(Number(firstCharacter?.[1])).toBeLessThan(400);
    expect(Number(firstCharacter?.[2])).toBeGreaterThan(61);
    expect(svg).toContain('x="112.2" y="675.8" font-size="17"');
    expect(svg).not.toContain('>『雪国』</text>');
  });

  it('blocks silent export omissions through review warnings', () => {
    const project = createInitialProject();
    project.content.attribution.work = '';
    project.content.attribution.author = '';
    project.content.tokens[0].confidence = 'low';
    expect(collectExportWarnings(project)).toEqual([
      '还有 1 处读音尚未确认',
      '尚未填写作品、作者或说话者'
    ]);
  });

  it('keeps every supported template, direction and ratio deterministic', () => {
    const templates = ['bunko', 'cinema', 'notebook', 'modern-zh', 'calligraphy'] as const;
    const directions = ['vertical', 'horizontal'] as const;
    const ratios = ['3:4', '4:5', '1:1'] as const;

    for (const template of templates) {
      for (const direction of directions) {
        for (const ratio of ratios) {
          const project = createInitialProject();
          project.layout = { template, direction, ratio };
          if (template === 'modern-zh' || template === 'calligraphy') {
            project.locale = 'zh-Hant-HK';
            project.content.sourceText = '人生若只如初見，何事秋風悲畫扇。';
            project.content.tokens = [{
              id: 'zh-fixture', start: 0, end: project.content.sourceText.length,
              surface: project.content.sourceText, candidates: [], locked: false
            }];
          }

          const first = renderProjectSvg(project);
          const second = renderProjectSvg(project);
          expect(first).toEqual(second);
          expect(first.svg, `${template}/${direction}/${ratio}`).toContain(project.content.sourceText);
          expect(first.svg, `${template}/${direction}/${ratio}`).not.toContain('foreignObject');
          expect(first.width / first.height).toBeCloseTo(Number(ratio.split(':')[0]) / Number(ratio.split(':')[1]));
        }
      }
    }
  });

  it('uses punctuation-delimited columns for regular Chinese verse', () => {
    const project = createInitialProject();
    project.locale = 'zh-Hant-TW';
    project.layout.template = 'modern-zh';
    project.content.sourceText = '床前明月光，疑是地上霜。举头望明月，低头思故乡。';
    project.content.tokens = [{
      id: 'verse', start: 0, end: project.content.sourceText.length,
      surface: project.content.sourceText, candidates: [], locked: false
    }];

    const vertical = renderProjectSvg(project).svg;
    expect(vertical).toContain('data-layout="classical-verse"');
    const firstCharacters = ['床', '疑', '举', '低'].map(character =>
      vertical.match(new RegExp(`<text class="main" x="([^"]+)" y="([^"]+)"[^>]*>${character}</text>`))
    );
    expect(firstCharacters.every(Boolean)).toBe(true);
    expect(new Set(firstCharacters.map(match => match?.[2])).size).toBe(1);
    expect(new Set(firstCharacters.map(match => match?.[1])).size).toBe(4);

    project.layout.direction = 'horizontal';
    const horizontal = renderProjectSvg(project).svg;
    expect(horizontal).toContain('>床前明月光，</text>');
    expect(horizontal).toContain('>低头思故乡。</text>');
  });
});
