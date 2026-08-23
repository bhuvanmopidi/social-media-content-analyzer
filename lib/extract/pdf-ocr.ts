import type * as pdfjs from "pdfjs-dist";
import { runOcr } from "./ocr";
import { normalizeCanvas } from "./preprocess";
import type { Progress } from "@/lib/types";

/** 2.0 ≈ 144 DPI — enough glyph height without wasting pixels. */
const RENDER_SCALE = 2.0;

export interface OcrPageResult {
  page: number;
  text: string;
  confidence: number;
}

/** OCRs only the given page numbers, leaving text-layer pages untouched. */
export async function ocrPages(
  doc: pdfjs.PDFDocumentProxy,
  pageNumbers: number[],
  onProgress?: (p: Progress) => void
): Promise<OcrPageResult[]> {
  const results: OcrPageResult[] = [];
  const share = 100 / pageNumbers.length;

  for (let i = 0; i < pageNumbers.length; i++) {
    const n = pageNumbers[i];
    const canvas = await renderPage(doc, n);

    try {
      const { text, confidence } = await runOcr(
        canvas,
        (p) =>
          onProgress?.({
            stage: "ocr",
            pct: Math.round(i * share + (p.pct / 100) * share),
            detail: `Scanning page ${n}`,
          }),
        `Scanning page ${n}`
      );
      results.push({ page: n, text, confidence });
    } catch {
      // A page that yields nothing readable shouldn't kill the whole document.
      results.push({ page: n, text: "", confidence: 0 });
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  return results;
}

async function renderPage(
  doc: pdfjs.PDFDocumentProxy,
  pageNumber: number
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: RENDER_SCALE });

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  // Scanned pages sometimes have transparent regions; flatten onto white.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  page.cleanup();

  normalizeCanvas(ctx, canvas.width, canvas.height);
  return canvas;
}