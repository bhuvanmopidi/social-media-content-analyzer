export type ExtractionSource = "pdf-text" | "pdf-ocr" | "image-ocr";

export type Stage =
  | "idle" | "reading" | "extracting" | "ocr" | "analyzing" | "done" | "error";

export interface Progress {
  stage: Stage;
  pct: number;        // 0–100
  detail?: string;    // "Page 2 of 5"
}

export interface ExtractionResult {
  filename: string;
  source: ExtractionSource;
  text: string;
  pages: number;
  confidence?: number;  // OCR only
  durationMs: number;
}

export interface Metrics {
  chars: number;
  words: number;
  sentences: number;
  paragraphs: number;
  longestParagraph: number;
  avgWordsPerSentence: number;
  hashtags: string[];
  mentions: string[];
  emojis: number;
  links: number;
  questions: number;
  allCaps: number;
  readability: number;
  hookLength: number;
  hasCTA: boolean;
  readTimeSec: number;
}

export type Severity = "high" | "medium" | "low";

export interface Suggestion {
  id: string;
  type: string;
  severity: Severity;
  message: string;
  rewrite?: string;
  source: "rule" | "ai";
}

export interface AnalysisResult {
  metrics: Metrics;
  suggestions: Suggestion[];
  aiAvailable: boolean;
}