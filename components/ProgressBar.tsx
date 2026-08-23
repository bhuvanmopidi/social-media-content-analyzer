"use client";

import type { Progress } from "@/lib/types";

const LABELS: Record<string, string> = {
  reading: "Reading file",
  extracting: "Extracting text",
  ocr: "Recognising text",
  analyzing: "Analysing",
};

export default function ProgressBar({ progress }: { progress: Progress }) {
  return (
    <div className="rounded-lg border border-[var(--rule)] bg-white px-5 py-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">{LABELS[progress.stage] ?? "Working"}</p>
        <p className="text-xs tabular-nums text-[var(--ink-faint)]">{progress.pct}%</p>
      </div>
      {progress.detail && (
        <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{progress.detail}</p>
      )}
      <div className="mt-3 h-0.5 w-full overflow-hidden bg-[var(--rule)]">
        <div
          className="h-full bg-[var(--ink)] transition-[width] duration-300 ease-out"
          style={{ width: `${progress.pct}%` }}
        />
      </div>
    </div>
  );
}