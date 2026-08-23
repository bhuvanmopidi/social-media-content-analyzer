"use client";

import { formatBytes, isPdf } from "@/lib/files";

interface Props {
  file: File;
  onRemove: () => void;
  busy?: boolean;
}

export default function FileCard({ file, onRemove, busy = false }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3">
      <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-600">
        {isPdf(file) ? "PDF" : "IMG"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900">{file.name}</p>
        <p className="text-xs text-neutral-500">{formatBytes(file.size)}</p>
      </div>
      <button
        onClick={onRemove}
        disabled={busy}
        className="rounded px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40"
      >
        Remove
      </button>
    </div>
  );
}