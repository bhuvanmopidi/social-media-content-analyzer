import { isPdf } from "@/lib/files";
import type { ExtractionResult, Progress } from "@/lib/types";

export async function extract(
  file: File,
  onProgress?: (p: Progress) => void
): Promise<ExtractionResult> {
  const started = performance.now();

  if (isPdf(file)) {
    // Imported lazily — pdf.js touches DOMMatrix at module scope, which
    // doesn't exist during server-side evaluation.
    const { extractPdfText } = await import("./pdf");

    const parsed = await extractPdfText(file, onProgress);
    try {
      if (!parsed.needsOcr) {
        return {
          filename: file.name,
          source: "pdf-text",
          text: parsed.text,
          pages: parsed.pages,
          durationMs: Math.round(performance.now() - started),
        };
      }
      throw new Error("SCANNED_PDF"); // Phase 4 replaces this
    } finally {
      await parsed.loadingTask.destroy();
    }
  }

  onProgress?.({ stage: "reading", pct: 0, detail: "Preparing image" });

  const { preprocessImage } = await import("./preprocess");
  const { runOcr } = await import("./ocr");

  const { canvas } = await preprocessImage(file);
  const { text, confidence } = await runOcr(canvas, onProgress);

  if (!text.trim()) throw new Error("NO_TEXT_FOUND");

  return {
    filename: file.name,
    source: "image-ocr",
    text,
    pages: 1,
    confidence,
    durationMs: Math.round(performance.now() - started),
  };
}