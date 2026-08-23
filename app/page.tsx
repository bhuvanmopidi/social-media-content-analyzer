"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import FileCard from "@/components/FileCard";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        Social Media Content Analyzer
      </h1>
      <p className="mt-2 text-neutral-600">
        Upload a post as a PDF or screenshot to extract its text and get engagement suggestions.
      </p>

      <div className="mt-8 space-y-4">
        {file ? (
          <FileCard file={file} onRemove={() => setFile(null)} />
        ) : (
          <Dropzone onFile={setFile} />
        )}
      </div>
    </main>
  );
}