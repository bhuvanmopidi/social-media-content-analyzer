"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import FileCard from "@/components/FileCard";
import ProgressBar from "@/components/ProgressBar";
import MetricsBar from "@/components/MetricsBar";
import TextPanel from "@/components/TextPanel";
import SuggestionList from "@/components/SuggestionList";
import { extract } from "@/lib/extract";
import { analyzeRules, analyzeAi, PLATFORM_LIST, type Platform } from "@/lib/analyze";
import { toUserMessage } from "@/lib/errors";
import type { AnalysisResult, ExtractionResult, Progress, Suggestion } from "@/lib/types";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [platform, setPlatform] = useState<Platform>("generic");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [aiPending, setAiPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiCache, setAiCache] = useState<Record<string, Suggestion[]>>({});
  const [aiReason, setAiReason] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setResult(null);
    setAnalysis(null);
    setError(null);
    setAiCache({});
  }

  /** Rules render instantly; AI suggestions arrive after and append. */
    /** Rules render instantly; AI rewrites are fetched once per platform and cached. */
  async function analyze(text: string, target: Platform) {
    const rules = analyzeRules(text, target);
    const order = { high: 0, medium: 1, low: 2 };

    const merge = (ai: Suggestion[]) => ({
      ...rules,
      suggestions: [...rules.suggestions, ...ai].sort(
        (a, b) => order[a.severity] - order[b.severity]
      ),
      aiAvailable: true,
    });

    const cached = aiCache[target];
    if (cached) {
      setAnalysis(merge(cached));
      return;
    }

    setAnalysis(rules);

    setAiPending(true);
    const ai = await analyzeAi(text, target);
    setAiPending(false);
    setAiReason(ai.reason ?? null);

    if (ai.suggestions.length) {
      setAiCache((c) => ({ ...c, [target]: ai.suggestions }));
      setAnalysis(merge(ai.suggestions));
    }
  }

  async function handleFile(f: File) {
    setFile(f);
    setResult(null);
    setAnalysis(null);
    setError(null);
    setAiCache({});

    try {
      const extracted = await extract(f, setProgress);
      setResult(extracted);
      await analyze(extracted.text, platform);
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setProgress(null);
    }
  }

  // Re-runs analysis on the already-extracted text — no re-extraction needed.
  function changePlatform(next: Platform) {
    setPlatform(next);
    if (result) analyze(result.text, next);
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-16 md:px-10">
      <header className="max-w-xl">
        <h1 className="text-[1.75rem] font-medium tracking-tight">
          Social Media Content Analyzer
        </h1>
        <p className="mt-2 leading-relaxed text-[var(--ink-muted)]">
          Upload a post as a PDF or a screenshot. The text is extracted in your
          browser — nothing is uploaded or stored — and analysed for engagement.
        </p>
      </header>

      <div className="mt-10 max-w-xl space-y-4">
        {file ? (
          <FileCard file={file} onRemove={reset} busy={!!progress} />
        ) : (
          <Dropzone onFile={handleFile} />
        )}

        {progress && <ProgressBar progress={progress} />}

        {error && (
          <p
            role="alert"
            className="border-l-2 border-[var(--high)] bg-white px-4 py-3 text-sm"
          >
            {error}
          </p>
        )}
      </div>

      {result && analysis && (
        <div className="mt-12">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.6875rem] uppercase tracking-wide text-[var(--ink-faint)]">
              Analysing for
            </span>
            {PLATFORM_LIST.map((p) => (
              <button
                key={p.id}
                onClick={() => changePlatform(p.id)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  platform === p.id
                    ? "bg-[var(--ink)] text-white"
                    : "bg-white text-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-5">
            <MetricsBar metrics={analysis.metrics} confidence={result.confidence} />
          </div>

          <div className="mt-10 grid gap-12 md:grid-cols-[1fr_22rem]">
            <TextPanel result={result} />
            <aside>
              <SuggestionList
                suggestions={analysis.suggestions}
                aiPending={aiPending}
                aiReason={aiReason}
              />
            </aside>
          </div>
        </div>
      )}
    </main>
  );
}