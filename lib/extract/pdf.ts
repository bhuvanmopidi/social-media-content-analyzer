import * as pdfjs from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import type { Progress } from "@/lib/types";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

/** Below this many chars, we assume a page has no text layer. */
const TEXT_LAYER_THRESHOLD = 50;

export interface PdfPage {
  page: number;
  text: string;
  needsOcr: boolean;
}

export interface PdfTextResult {
  pages: PdfPage[];
  pageCount: number;
  /** True when at least one page has no usable text layer. */
  needsOcr: boolean;
  doc: pdfjs.PDFDocumentProxy;
  loadingTask: pdfjs.PDFDocumentLoadingTask;
}

export async function extractPdfText(
  file: File,
  onProgress?: (p: Progress) => void
): Promise<PdfTextResult> {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: buffer });
  const doc = await loadingTask.promise;

  const pageTexts: string[] = [];

  for (let n = 1; n <= doc.numPages; n++) {
    onProgress?.({
      stage: "extracting",
      pct: Math.round(((n - 1) / doc.numPages) * 100),
      detail: `Page ${n} of ${doc.numPages}`,
    });

    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    pageTexts.push(reconstructLayout(content.items as TextItem[]));
    page.cleanup();
  }

    const pages: PdfPage[] = pageTexts.map((text, i) => ({
    page: i + 1,
    text,
    needsOcr: text.trim().length < TEXT_LAYER_THRESHOLD,
  }));

  return {
    pages,
    pageCount: doc.numPages,
    needsOcr: pages.some((p) => p.needsOcr),
    doc,
    loadingTask,
  };
}

/**
 * pdf.js returns positioned glyph runs, not lines. Group items by their
 * y-coordinate to rebuild lines, then use vertical gaps to infer paragraphs.
 */
function reconstructLayout(items: TextItem[]): string {
  const glyphs = items.filter((i) => i.str.trim().length > 0);
  if (glyphs.length === 0) return "";

  // Group into lines by y-position (transform[5]), tolerating sub-pixel drift.
  const lines: { y: number; height: number; items: TextItem[] }[] = [];

  for (const item of glyphs) {
    const y = item.transform[5];
    const height = item.height || 10;
    const line = lines.find((l) => Math.abs(l.y - y) < height * 0.5);
    if (line) {
      line.items.push(item);
      line.height = Math.max(line.height, height);
    } else {
      lines.push({ y, height, items: [item] });
    }
  }

  // PDF origin is bottom-left, so descending y is reading order.
  lines.sort((a, b) => b.y - a.y);
  for (const line of lines) {
    line.items.sort((a, b) => a.transform[4] - b.transform[4]);
  }

  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    out.push(joinWithGaps(line.items));

    const next = lines[i + 1];
    if (!next) continue;

    // A vertical gap noticeably larger than the line height = paragraph break.
    const gap = line.y - next.y;
    if (gap > line.height * 1.6) out.push("");
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Insert spaces where horizontal gaps imply them (PDFs often omit space glyphs). */
function joinWithGaps(items: TextItem[]): string {
  let line = "";

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    line += item.str;

    const next = items[i + 1];
    if (!next) continue;

    const endX = item.transform[4] + item.width;
    const gap = next.transform[4] - endX;
    const spaceWidth = (item.height || 10) * 0.25;

    if (gap > spaceWidth && !item.str.endsWith(" ") && !next.str.startsWith(" ")) {
      line += " ";
    }
  }

  return line.replace(/\s+/g, " ").trim();
}