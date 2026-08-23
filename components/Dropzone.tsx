"use client";

import { useCallback, useRef, useState } from "react";
import { ACCEPT_ATTR, validateFile } from "@/lib/files";

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export default function Dropzone({ onFile, disabled = false }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragDepth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = useCallback(
    (files: FileList | null) => {
      setError(null);
      const file = files?.[0];
      if (!file) return;
      const problem = validateFile(file);
      if (problem) {
        setError(problem);
        return;
      }
      onFile(file);
    },
    [onFile]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    if (disabled) return;
    accept(e.dataTransfer.files);
  };

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current += 1;
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) setIsDragging(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={[
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors outline-none",
          disabled
            ? "cursor-not-allowed border-neutral-200 bg-neutral-50 opacity-60"
            : "cursor-pointer focus-visible:ring-2 focus-visible:ring-neutral-900",
          isDragging
            ? "border-neutral-900 bg-neutral-100"
            : "border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50",
        ].join(" ")}
      >
        <svg className="h-9 w-9 text-neutral-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V6m0 0L8.25 9.75M12 6l3.75 3.75M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5" />
        </svg>
        <div>
          <p className="font-medium text-neutral-900">
            {isDragging ? "Drop to upload" : "Drag & drop a file here"}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            or click to browse · PDF, PNG, JPG, WebP, BMP · max 10 MB
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => {
            accept(e.target.files);
            e.target.value = ""; // allow re-selecting the same file
          }}
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}