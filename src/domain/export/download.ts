import type { ProjectDocument } from '../document/schema';
import { renderProjectSvg } from './svg-renderer';

export type ProjectPng = { blob: Blob; fileName: string };

export async function downloadProjectPng(project: ProjectDocument): Promise<void> {
  const png = await createProjectPng(project);
  triggerDownload(png.blob, png.fileName);
}

export async function createProjectPng(project: ProjectDocument): Promise<ProjectPng> {
  const { artifact, canvas } = await renderProjectCanvas(project);
  return { blob: await canvasToBlob(canvas, 'image/png'), fileName: artifact.fileName };
}

export async function downloadProjectPdf(project: ProjectDocument): Promise<void> {
  const { artifact, canvas } = await renderProjectCanvas(project);
  const jpeg = await canvasToBlob(canvas, 'image/jpeg', .97);
  const bytes = buildImagePdf(new Uint8Array(await jpeg.arrayBuffer()), artifact.width, artifact.height, artifact.width / 2, artifact.height / 2);
  triggerDownload(new Blob([new Uint8Array(bytes).buffer], { type: 'application/pdf' }), artifact.fileName.replace(/\.png$/, '.pdf'));
}

async function renderProjectCanvas(project: ProjectDocument) {
  if ('fonts' in document) await document.fonts.ready;
  const artifact = renderProjectSvg(project);
  const svgUrl = URL.createObjectURL(new Blob([artifact.svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement('canvas');
    canvas.width = artifact.width;
    canvas.height = artifact.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('当前浏览器无法创建导出画布。');
    context.drawImage(image, 0, 0, artifact.width, artifact.height);
    return { artifact, canvas };
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('浏览器无法渲染导出卡片。'));
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: 'image/png' | 'image/jpeg', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('PNG 编码失败。'));
    }, type, quality);
  });
}

export function buildImagePdf(jpeg: Uint8Array, pixelWidth: number, pixelHeight: number, pageWidth: number, pageHeight: number): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let length = 0;
  const append = (value: string | Uint8Array) => {
    const bytes = typeof value === 'string' ? encoder.encode(value) : value;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (id: number, body: string | Uint8Array, suffix = '') => {
    offsets[id] = length;
    append(`${id} 0 obj\n`);
    append(body);
    append(`${suffix}\nendobj\n`);
  };

  append(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4] = length;
  append(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  append(jpeg);
  append('\nendstream\nendobj\n');
  const drawing = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im0 Do Q`;
  object(5, `<< /Length ${encoder.encode(drawing).length} >>\nstream\n${drawing}\nendstream`);
  const xref = length;
  append('xref\n0 6\n0000000000 65535 f \n');
  for (let id = 1; id <= 5; id++) append(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);

  const output = new Uint8Array(length);
  let cursor = 0;
  for (const chunk of chunks) { output.set(chunk, cursor); cursor += chunk.length; }
  return output;
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
