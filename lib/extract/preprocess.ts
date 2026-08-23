/** Tesseract needs reasonable glyph height; below this we upscale. */
const TARGET_MIN_WIDTH = 1400;
const MAX_DIMENSION = 4000;

export interface PreprocessResult {
  canvas: HTMLCanvasElement;
  inverted: boolean;
  scale: number;
}

export async function preprocessImage(file: File): Promise<PreprocessResult> {
  const bitmap = await createImageBitmap(file);

  let scale = 1;
  if (bitmap.width < TARGET_MIN_WIDTH) {
    scale = Math.min(TARGET_MIN_WIDTH / bitmap.width, 4);
  }
  if (bitmap.width * scale > MAX_DIMENSION) {
    scale = MAX_DIMENSION / bitmap.width;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const inverted = normalizeCanvas(ctx, canvas.width, canvas.height);
  return { canvas, inverted, scale };
}

/** Grayscale, invert if dark-mode, then stretch contrast. Returns whether it inverted. */
export function normalizeCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): boolean {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  let sum = 0;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = gray;
    sum += gray;
  }

  const mean = sum / (d.length / 4);
  const inverted = mean < 110; // dark background -> light text

  // Percentile-based contrast stretch, ignoring outliers.
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) hist[d[i]]++;

  const total = d.length / 4;
  const lo = percentile(hist, total, 0.02);
  const hi = percentile(hist, total, 0.98);
  const range = Math.max(hi - lo, 1);

  for (let i = 0; i < d.length; i += 4) {
    let v = ((d[i] - lo) / range) * 255;
    v = Math.max(0, Math.min(255, v));
    if (inverted) v = 255 - v;
    d[i] = d[i + 1] = d[i + 2] = v;
  }

  ctx.putImageData(img, 0, 0);
  return inverted;
}

function percentile(hist: Uint32Array, total: number, p: number): number {
  const target = total * p;
  let acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= target) return v;
  }
  return 255;
}