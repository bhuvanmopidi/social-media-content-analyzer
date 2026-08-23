"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import FileCard from "@/components/FileCard";
import { extract } from "@/lib/extract";
import type { ExtractionResult, Progress } from "@/lib/types";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(f: File) {
    setFile(f);
    setResult(null);
    setError(null);
    try {
      setResult(await extract(f, setProgress));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setProgress(null);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Social Media Content Analyzer</h1>

      <div className="mt-8 space-y-4">
        {file ? (
          <FileCard file={file} onRemove={() => { setFile(null); setResult(null); setError(null); }} />
        ) : (
          <Dropzone onFile={handleFile} />
        )}

        {progress && (
          <p className="text-sm text-neutral-500">
            {progress.detail} — {progress.pct}%
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && (
          <pre className="whitespace-pre-wrap rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm">
            {result.text}
          </pre>
        )}
      </div>
    </main>
  );
}