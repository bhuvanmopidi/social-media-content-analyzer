"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import FileCard from "@/components/FileCard";
import { extract } from "@/lib/extract";
import { analyzeRules, analyzeAi } from "@/lib/analyze";
import { toUserMessage } from "@/lib/errors";
import type { AnalysisResult, ExtractionResult, Progress } from "@/lib/types";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setResult(null);
    setAnalysis(null);
    setError(null);
  }

  async function handleFile(f: File) {
    setFile(f);
    setResult(null);
    setAnalysis(null);
    setError(null);

    try {
      const extracted = await extract(f, setProgress);
      setResult(extracted);

      const analyzed = analyzeRules(extracted.text, "generic");
      setAnalysis(analyzed);
      const ai = await analyzeAi(extracted.text, "generic");
      if (ai.suggestions.length) {
        setAnalysis({
          ...analyzed,
          suggestions: [...analyzed.suggestions, ...ai.suggestions],
          aiAvailable: ai.aiAvailable,
        });
      }

      console.log("METRICS:", analyzed.metrics);
      console.log("SUGGESTIONS:", analyzed.suggestions);
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setProgress(null);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        Social Media Content Analyzer
      </h1>
      <p className="mt-2 text-neutral-600">
        Upload a post as a PDF or screenshot to extract its text and get engagement
        suggestions.
      </p>

      <div className="mt-8 space-y-4">
        {file ? (
          <FileCard file={file} onRemove={reset} busy={!!progress} />
        ) : (
          <Dropzone onFile={handleFile} />
        )}

        {progress && (
          <div className="rounded-lg border border-neutral-200 p-4">
            <p className="text-sm text-neutral-600">{progress.detail}</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full bg-neutral-900 transition-all duration-200"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
              <span>Source: {result.source}</span>
              <span>Pages: {result.pages}</span>
              {result.confidence !== undefined && (
                <span>Confidence: {Math.round(result.confidence * 100)}%</span>
              )}
              <span>{result.durationMs}ms</span>
            </div>

            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm">
              {result.text}
            </pre>
          </div>
        )}

        {analysis && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-neutral-900">
              {analysis.suggestions.length} suggestion
              {analysis.suggestions.length === 1 ? "" : "s"}
            </h2>
            {analysis.suggestions.map((s) => (
              <div
                key={s.id}
                className="rounded-lg border border-neutral-200 px-4 py-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-neutral-500">
                    {s.type}
                  </span>
                  <span className="text-xs text-neutral-400">{s.severity}</span>
                </div>
                <p className="mt-1 text-neutral-700">{s.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}