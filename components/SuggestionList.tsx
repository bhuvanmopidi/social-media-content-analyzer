"use client";

import { useState } from "react";
import { copyText } from "@/lib/files";
import type { Suggestion } from "@/lib/types";

const SEVERITY_COLOR: Record<Suggestion["severity"], string> = {
  high: "var(--high)",
  medium: "var(--medium)",
  low: "var(--low)",
};

function Card({ s }: { s: Suggestion }) {
  const [copied, setCopied] = useState(false);

  return (
    <div
      className="border-l-2 bg-white px-4 py-3.5"
      style={{ borderLeftColor: SEVERITY_COLOR[s.severity], borderLeftWidth: "2px", borderLeftStyle: "solid" }}
    >
      <div className="flex items-center gap-2">
        <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-[var(--ink-muted)]">
          {s.type}
        </span>
        {s.source === "ai" && (
          <span className="rounded-sm bg-[var(--paper)] px-1.5 py-0.5 text-[0.625rem] uppercase tracking-wide text-[var(--ink-faint)]">
            AI
          </span>
        )}
      </div>

      <p className="mt-1.5 text-sm leading-relaxed">{s.message}</p>

      {s.rewrite && (
        <div className="mt-3">
          <div className="prose-serif border-l border-[var(--rule)] pl-3 text-[0.9375rem] text-[var(--ink-muted)]">
            {s.rewrite}
          </div>
          <button
            onClick={async () => {
              if (await copyText(s.rewrite!)) {
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }
        }}
            className="mt-2 text-xs text-[var(--ink-faint)] transition-colors hover:text-[var(--ink)]"
          >
            {copied ? "Copied" : "Copy rewrite"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function SuggestionList({
  suggestions,
  aiPending,
  aiReason,
}: {
  suggestions: Suggestion[];
  aiPending: boolean;
  aiReason?: string | null;
}) {
  const highCount = suggestions.filter((s) => s.severity === "high").length;

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-medium">
          {suggestions.length === 0
            ? "No issues found"
            : `${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"}`}
        </h2>
        {highCount > 0 && (
          <span className="text-xs text-[var(--high)]">{highCount} high priority</span>
        )}
      </div>

      {suggestions.length === 0 && !aiPending && (
        <p className="border-l-2 border-[var(--rule)] bg-white px-4 py-3.5 text-sm text-[var(--ink-muted)]">
          This post is solid — good length, clear structure, and an ask at the end.
        </p>
      )}

      <div className="space-y-2">
        {suggestions.map((s) => (
          <Card key={s.id} s={s} />
        ))}
      </div>

      {aiPending && (
        <p className="mt-3 animate-pulse text-xs text-[var(--ink-faint)]">
          Generating rewrites…
        </p>
      )}
      {!aiPending && aiReason === "rate_limited" && (
        <p className="mt-3 text-xs text-[var(--ink-faint)]">
          AI rewrites are rate-limited right now — rule-based analysis is unaffected.
        </p>
      )}
    </div>
  );
}