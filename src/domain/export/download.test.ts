import { describe, expect, it } from 'vitest';
import { buildImagePdf } from './download';

describe('PDF export', () => {
  it('embeds a JPEG in a single-page PDF with a valid cross-reference table', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const pdf = buildImagePdf(jpeg, 1200, 1600, 600, 800);
    const text = new TextDecoder('latin1').decode(pdf);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('/Subtype /Image /Width 1200 /Height 1600');
    expect(text).toContain('/Filter /DCTDecode');
    expect(text.endsWith('%%EOF')).toBe(true);
  });
});
