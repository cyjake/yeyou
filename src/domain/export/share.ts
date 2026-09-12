import type { ProjectPng } from './download';

export function canCopyPng(): boolean {
  return typeof ClipboardItem !== 'undefined' && Boolean(navigator.clipboard?.write);
}

export function copyPngToClipboard(png: ProjectPng): Promise<void> {
  if (!canCopyPng()) return Promise.reject(new Error('当前浏览器不支持复制图片，请使用导出 PNG。'));
  return navigator.clipboard.write([new ClipboardItem({ 'image/png': png.blob })]);
}

export function canSharePng(png?: ProjectPng): boolean {
  if (!png || typeof navigator.share !== 'function') return false;
  const file = toFile(png);
  return typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] });
}

export function sharePng(png: ProjectPng): Promise<void> {
  if (!canSharePng(png)) return Promise.reject(new Error('当前浏览器不支持分享图片，请使用复制图片或导出 PNG。'));
  const file = toFile(png);
  return navigator.share({ files: [file], title: '葉遊文字卡片' });
}

function toFile(png: ProjectPng): File {
  return new File([png.blob], png.fileName, { type: 'image/png' });
}
