import { createWorker, type Worker } from "tesseract.js";
import type { Progress } from "@/lib/types";

let workerPromise: Promise<Worker> | null = null;
let progressSink: ((p: Progress) => void) | null = null;
let progressLabel = "";

/** Single cached worker — loading the WASM + traineddata is expensive. */
function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("eng", 1, {
      logger: (m) => {
        if (m.status === "recognizing text" && progressSink) {
          progressSink({
            stage: "ocr",
            pct: Math.round(m.progress * 100),
            detail: progressLabel || "Reading text",
          });
        }
      },
    });
  }
  return workerPromise;
}

export interface OcrResult {
  text: string;
  confidence: number;
}

export async function runOcr(
  source: HTMLCanvasElement | File,
  onProgress?: (p: Progress) => void,
  label = "Reading text"
): Promise<OcrResult> {
  progressSink = onProgress ?? null;
  progressLabel = label;

    try {
    const worker = await getWorker();

    let { data } = await worker.recognize(source);
    console.log("RAW OCR:", { confidence: data.confidence, text: data.text });

    // Default PSM assumes a single uniform text block. On scattered layouts
    // sparse mode does better — retry only when the first pass looks unreliable.
    if (data.confidence < 60) {
      await worker.setParameters({ tessedit_pageseg_mode: "11" as never });
      const retry = await worker.recognize(source);
      await worker.setParameters({ tessedit_pageseg_mode: "3" as never });
      if (retry.data.confidence > data.confidence) data = retry.data;
    }

    const text = cleanOcrText(data.text);
    const confidence = Math.round(data.confidence) / 100;

    if (!looksLikeText(text, confidence)) {
      throw new Error("NO_TEXT_FOUND");
    }

    return { text, confidence };
  } finally {
    progressSink = null;
  }
}

export async function terminateOcr(): Promise<void> {
  if (!workerPromise) return;
  const worker = await workerPromise;
  await worker.terminate();
  workerPromise = null;
}

/** OCR output is noisy: stray single chars, broken spacing, excess blank lines. */
function cleanOcrText(raw: string): string {
  return raw
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line, i, arr) => {
      if (line.length === 0) return arr[i - 1]?.length !== 0;
      if (line.length === 1 && !/[a-zA-Z0-9?!.]/.test(line)) return false;
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
/** OCR noise on non-text images produces long strings with few real words. */
function looksLikeText(text: string, confidence: number): boolean {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;

  const wordish = words.filter((w) => /^[A-Za-z][A-Za-z'’-]{2,}$/.test(w));
  const ratio = wordish.length / words.length;

  // High-confidence output is trustworthy even when very short (logos, headlines).
  if (confidence > 0.65 && wordish.length >= 1) return true;

  return words.length >= 3 && confidence > 0.35 && ratio > 0.4;
}