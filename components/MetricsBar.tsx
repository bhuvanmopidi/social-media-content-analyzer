"use client";

import type { Metrics } from "@/lib/types";

export default function MetricsBar({
  metrics,
  confidence,
}: {
  metrics: Metrics;
  confidence?: number;
}) {
  const items = [
    { label: "Words", value: metrics.words.toLocaleString() },
    { label: "Characters", value: metrics.chars.toLocaleString() },
    { label: "Read time", value: `${metrics.readTimeSec}s` },
    { label: "Hashtags", value: String(metrics.hashtags.length) },
    { label: "Reading ease", value: String(metrics.readability) },
  ];

  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3 border-y border-[var(--rule)] py-4">
      {items.map((i) => (
        <div key={i.label}>
          <div className="text-[0.6875rem] uppercase tracking-wide text-[var(--ink-faint)]">
            {i.label}
          </div>
          <div className="mt-0.5 text-sm tabular-nums">{i.value}</div>
        </div>
      ))}
      {confidence !== undefined && (
        <div>
          <div className="text-[0.6875rem] uppercase tracking-wide text-[var(--ink-faint)]">
            OCR confidence
          </div>
          <div className="mt-0.5 text-sm tabular-nums">
            {Math.round(confidence * 100)}%
          </div>
        </div>
      )}
    </div>
  );
}