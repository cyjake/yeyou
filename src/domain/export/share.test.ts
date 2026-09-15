import { afterEach, describe, expect, it, vi } from 'vitest';
import { canCopyPng, canSharePng, prefersNativePngShare, supportsPngShare } from './share';

describe('image sharing capabilities', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('fails capability checks safely outside a supporting browser', () => {
    expect(canCopyPng()).toBe(false);
    expect(canSharePng()).toBe(false);
    expect(supportsPngShare()).toBe(false);
  });

  it('detects native file sharing before the rendered PNG is ready', () => {
    const canShare = vi.fn(() => true);
    vi.stubGlobal('navigator', { share: vi.fn(), canShare });
    vi.stubGlobal('File', class FileProbe {
      constructor(public parts: BlobPart[], public name: string, public options?: FilePropertyBag) {}
    });

    expect(supportsPngShare()).toBe(true);
    expect(canShare).toHaveBeenCalledWith({ files: [expect.objectContaining({ name: 'yeyou-share-probe.png' })] });
  });

  it('does not prefer native sharing when the browser cannot share files', () => {
    vi.stubGlobal('navigator', { share: vi.fn(), canShare: vi.fn(() => false) });
    vi.stubGlobal('File', class FileProbe {});

    expect(supportsPngShare()).toBe(false);
  });

  it('falls back to downloads when a browser throws during the capability check', () => {
    vi.stubGlobal('navigator', { share: vi.fn(), canShare: vi.fn(() => { throw new TypeError('unsupported'); }) });
    vi.stubGlobal('File', class FileProbe {});

    expect(supportsPngShare()).toBe(false);
  });

  it('keeps download as the primary desktop action even when native sharing exists', () => {
    vi.stubGlobal('navigator', {
      share: vi.fn(), canShare: vi.fn(() => true), userAgent: 'Mozilla/5.0 (Macintosh)',
      platform: 'MacIntel', maxTouchPoints: 0
    });
    vi.stubGlobal('File', class FileProbe {});

    expect(supportsPngShare()).toBe(true);
    expect(prefersNativePngShare()).toBe(false);
  });

  it('prefers the system share sheet on phones and tablets', () => {
    vi.stubGlobal('navigator', {
      share: vi.fn(), canShare: vi.fn(() => true), userAgent: 'Mozilla/5.0 (iPhone; Mobile)',
      platform: 'iPhone', maxTouchPoints: 5
    });
    vi.stubGlobal('File', class FileProbe {});

    expect(prefersNativePngShare()).toBe(true);
  });

  it('recognizes iPadOS when it presents a desktop-style user agent', () => {
    vi.stubGlobal('navigator', {
      share: vi.fn(), canShare: vi.fn(() => true), userAgent: 'Mozilla/5.0 (Macintosh)',
      platform: 'MacIntel', maxTouchPoints: 5
    });
    vi.stubGlobal('File', class FileProbe {});

    expect(prefersNativePngShare()).toBe(true);
  });
});
