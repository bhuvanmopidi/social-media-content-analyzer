"use client";

import { useState } from "react";
import type { ExtractionResult } from "@/lib/types";
import { copyText } from "@/lib/files";

const SOURCE_LABELS: Record<string, string> = {
  "pdf-text": "PDF text layer",
  "pdf-ocr": "Scanned PDF, OCR",
  "image-ocr": "Image, OCR",
};

export default function TextPanel({ result }: { result: ExtractionResult }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (await copyText(result.text)) {
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  }

  function download() {
    const blob = new Blob([result.text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename.replace(/\.[^.]+$/, "") + ".txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  const lowConfidence = result.confidence !== undefined && result.confidence < 0.6;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-[0.6875rem] uppercase tracking-wide text-[var(--ink-faint)]">
          {SOURCE_LABELS[result.source]} · {result.durationMs}ms
        </p>
        <div className="flex gap-1">
          <button
            onClick={copy}
            className="rounded px-2 py-1 text-xs text-[var(--ink-muted)] transition-colors hover:bg-white hover:text-[var(--ink)]"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={download}
            className="rounded px-2 py-1 text-xs text-[var(--ink-muted)] transition-colors hover:bg-white hover:text-[var(--ink)]"
          >
            Download
          </button>
        </div>
      </div>

      {lowConfidence && (
        <p className="mb-4 border-l-2 border-[var(--medium)] bg-white py-2 pl-3 text-xs text-[var(--ink-muted)]">
          Low OCR confidence — some text may be inaccurate. A sharper image would help.
        </p>
      )}

      <div className="prose-serif whitespace-pre-wrap break-words">{result.text}</div>
    </div>
  );
}