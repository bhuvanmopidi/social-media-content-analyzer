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

  throw new Error("IMAGE_OCR_NOT_IMPLEMENTED"); // Phase 3
}