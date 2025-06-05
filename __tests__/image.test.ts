import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { downscaleImage } from '../lib/image';
import Canvas, { loadImage as canvasLoadImage, createCanvas } from 'canvas';
import { Window } from 'happy-dom';

const IMAGE_PATH = path.join(__dirname, '../public/logo.png');

const windowObj = new Window();
(global as any).window = windowObj as any;
(global as any).document = windowObj.document as any;
const blobStore = new Map<string, File>();
let blobId = 0;

class NodeImage extends Canvas.Image {
  onload: (() => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  private _src: any;
  // @ts-ignore override as accessor
  set src(value: any) {
    this._src = value;
    const file = blobStore.get(value);
    const loadTarget = file
      ? file.arrayBuffer().then((buf) => Buffer.from(buf))
      : Promise.resolve(value);
    loadTarget
      .then((data) => {
        // @ts-ignore parent class expects Buffer or string
        super.src = data;
        this.onload?.();
      })
      .catch((e) => this.onerror?.(e));
  }
  get src() {
    return this._src;
  }
}

beforeAll(() => {
  (global as any).Image = NodeImage;
  const origCreate = document.createElement.bind(document);
  // polyfill canvas using node-canvas
  // @ts-ignore
  document.createElement = (tag: string) => {
    if (tag.toLowerCase() === 'canvas') {
      const canvas = createCanvas(1, 1) as any;
      canvas.toBlob = (cb: (b: Blob) => void, type: string, quality?: number) => {
        const buf = canvas.toBuffer(type, { quality });
        // @ts-ignore Blob from happy-dom lacks bytes()
        cb(new windowObj.Blob([buf], { type }) as unknown as Blob);
      };
      return canvas;
    }
    return origCreate(tag);
  };
  (global as any).URL.createObjectURL = (file: File) => {
    const url = `blob:${blobId++}`;
    blobStore.set(url, file);
    return url;
  };
  (global as any).URL.revokeObjectURL = (url: string) => {
    blobStore.delete(url);
  };
});

function createFile(): File {
  const buffer = fs.readFileSync(IMAGE_PATH);
  return new windowObj.File([buffer], 'logo.png', { type: 'image/png' }) as unknown as File;
}

describe('downscaleImage', () => {
  it('reduces large images under 1MB', async () => {
    const file = createFile();
    expect(file.size).toBeGreaterThan(1024 * 1024);

    const result = await downscaleImage(file as any);
    expect(result.size).toBeLessThanOrEqual(1024 * 1024);
  });
});
