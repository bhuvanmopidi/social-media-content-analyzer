import { isPdf } from "@/lib/files";
import type { ExtractionResult, Progress } from "@/lib/types";

export async function extract(
  file: File,
  onProgress?: (p: Progress) => void
): Promise<ExtractionResult> {
  const started = performance.now();

  if (isPdf(file)) {
    // Lazy — pdf.js touches DOMMatrix at module scope, absent during SSR.
    const { extractPdfText } = await import("./pdf");
    const parsed = await extractPdfText(file, onProgress);

    try {
      const texts = parsed.pages.map((p) => p.text);
      let confidence: number | undefined;
      let source: ExtractionResult["source"] = "pdf-text";

      if (parsed.needsOcr) {
        const scanned = parsed.pages.filter((p) => p.needsOcr).map((p) => p.page);

        onProgress?.({
          stage: "ocr",
          pct: 0,
          detail:
            scanned.length === parsed.pageCount
              ? "No text layer found — scanning pages"
              : `Scanning ${scanned.length} image-only page${scanned.length > 1 ? "s" : ""}`,
        });

        const { ocrPages } = await import("./pdf-ocr");
        const ocrResults = await ocrPages(parsed.doc, scanned, onProgress);

        // Slot OCR output back into original page order.
        for (const r of ocrResults) texts[r.page - 1] = r.text;

        const scored = ocrResults.filter((r) => r.confidence > 0);
        confidence = scored.length
          ? Math.round((scored.reduce((s, r) => s + r.confidence, 0) / scored.length) * 100) / 100
          : 0;

        // Mixed documents keep the pdf-text label; fully scanned ones don't.
        source = scanned.length === parsed.pageCount ? "pdf-ocr" : "pdf-text";
      }

      const text = texts.filter((t) => t.trim()).join("\n\n").trim();
      if (!text) throw new Error("NO_TEXT_FOUND");

      return {
        filename: file.name,
        source,
        text,
        pages: parsed.pageCount,
        confidence,
        durationMs: Math.round(performance.now() - started),
      };
    } finally {
      await parsed.loadingTask.destroy();
    }
  }

  onProgress?.({ stage: "reading", pct: 0, detail: "Preparing image" });

  const { preprocessImage } = await import("./preprocess");
  const { runOcr } = await import("./ocr");

  const { canvas } = await preprocessImage(file);
  const { text, confidence } = await runOcr(canvas, onProgress);

  return {
    filename: file.name,
    source: "image-ocr",
    text,
    pages: 1,
    confidence,
    durationMs: Math.round(performance.now() - started),
  };
}