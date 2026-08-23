import type { Metrics } from "@/lib/types";

const HASHTAG_RE = /#[\p{L}\p{N}_]+/gu;
const MENTION_RE = /@[\p{L}\p{N}_.]+/gu;
const EMOJI_RE = /\p{Extended_Pictographic}/gu;
const URL_RE = /https?:\/\/\S+|\bwww\.\S+|\b[\w-]+\.(com|org|net|io|co|ly)\b\S*/gi;

const CTA_PATTERNS = [
  /\bcomment\b/i, /\bshare\b/i, /\bfollow\b/i, /\btag (someone|a friend)\b/i,
  /\bsave (this|it)\b/i, /\bdm\b/i, /\blink in bio\b/i, /\bsign up\b/i,
  /\bwhat do you think\b/i, /\btell me\b/i, /\bdrop a\b/i, /\blet me know\b/i,
  /\bthoughts\?/i, /\bcheck (it )?out\b/i,
];

export function computeMetrics(text: string): Metrics {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const sentences = trimmed.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 0);
  const paragraphs = trimmed.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  const firstLine = trimmed.split("\n")[0] ?? "";

  // CTAs almost always live at the end — check the tail, not the whole body.
  const tail = trimmed.slice(Math.floor(trimmed.length * 0.7));
  const hasCTA = CTA_PATTERNS.some((re) => re.test(tail)) || /\?/.test(trimmed);

  return {
    chars: trimmed.length,
    words: words.length,
    sentences: sentences.length,
    paragraphs: paragraphs.length,
    longestParagraph: paragraphs.length
      ? Math.max(...paragraphs.map((p) => p.length))
      : 0,
    avgWordsPerSentence: sentences.length
      ? Math.round(words.length / sentences.length)
      : 0,
    hashtags: trimmed.match(HASHTAG_RE) ?? [],
    mentions: trimmed.match(MENTION_RE) ?? [],
    emojis: (trimmed.match(EMOJI_RE) ?? []).length,
    links: (trimmed.match(URL_RE) ?? []).length,
    questions: (trimmed.match(/\?/g) ?? []).length,
    allCaps: words.filter(
      (w) => w.length >= 3 && w === w.toUpperCase() && /[A-Z]/.test(w)
    ).length,
    readability: fleschReadingEase(words, sentences.length),
    hookLength: firstLine.length,
    hasCTA,
    readTimeSec: Math.max(1, Math.round((words.length / 225) * 60)),
  };
}

function fleschReadingEase(words: string[], sentenceCount: number): number {
  if (!words.length || !sentenceCount) return 0;
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const score =
    206.835 - 1.015 * (words.length / sentenceCount) - 84.6 * (syllables / words.length);
  return Math.round(Math.max(0, Math.min(100, score)));
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return w.length ? 1 : 0;
  const groups = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}