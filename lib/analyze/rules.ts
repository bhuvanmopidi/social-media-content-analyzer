import type { Metrics, Suggestion } from "@/lib/types";
import { PLATFORMS, type Platform } from "./platforms";

export function runRules(text: string, m: Metrics, platform: Platform): Suggestion[] {
  const p = PLATFORMS[platform];
  const out: Suggestion[] = [];

  const add = (
    id: string,
    severity: Suggestion["severity"],
    type: string,
    message: string
  ) => out.push({ id, type, severity, message, source: "rule" });

  // — Length —
  if (m.chars > p.maxChars) {
    add("over-limit", "high", "Length",
      `${m.chars.toLocaleString()} characters exceeds ${p.label}'s ${p.maxChars.toLocaleString()} limit. Trim, or split into a thread.`);
  } else if (m.chars < 40) {
    add("too-short", "medium", "Length",
      "Very short posts give the algorithm little to work with. Add context or a specific detail.");
  }

  // — Hook & fold —
  if (m.hookLength > 120) {
    add("weak-hook", "high", "Hook",
      "The opening line runs long. Lead with the payoff in the first 8–10 words.");
  }

  if (p.foldAt && m.chars > p.foldAt) {
    const visible = text.slice(0, p.foldAt).trim();
    const opensLoop = /[?:—–,]$/.test(visible) || !/[.!?]$/.test(visible);
    if (!visible.includes("?") && !opensLoop) {
      add("fold-flat", "high", "Hook",
        `Nothing before ${p.label}'s "see more" cutoff (~${p.foldAt} chars) invites expansion. End the visible portion on a question or an unfinished thought.`);
    }
  }

  // — Hashtags —
  const [minTags, maxTags] = p.idealHashtags;
  if (m.hashtags.length === 0) {
    add("no-hashtags", "medium", "Discovery",
      `No hashtags. ${minTags}–${maxTags} relevant tags improve reach on ${p.label}.`);
  } else if (m.hashtags.length > maxTags * 2) {
    add("hashtag-stuffing", "medium", "Discovery",
      `${m.hashtags.length} hashtags reads as spam. ${minTags}–${maxTags} performs better.`);
  }

  const firstTwoLines = text.split("\n").slice(0, 2).join("\n");
  if (/#[\p{L}\p{N}_]+/u.test(firstTwoLines) && m.hashtags.length > 1) {
    add("hashtags-up-top", "low", "Discovery",
      "Hashtags appear in the opening lines. Move them to the end to keep the hook clean.");
  }

  // — Engagement —
  if (!m.hasCTA) {
    add("no-cta", "high", "Engagement",
      "No call to action. Close with a question or a specific ask — comments weigh heavily in ranking.");
  }
  if (m.questions === 0) {
    add("no-question", "medium", "Engagement",
      "No questions asked. Questions are the cheapest way to invite replies.");
  }

  // — Readability —
  if (m.readability > 0 && m.readability < 50) {
    add("dense", "medium", "Readability",
      `Reading ease is ${m.readability} (college level). Shorter sentences and plainer words scan better on mobile.`);
  }
  if (m.avgWordsPerSentence > 25) {
    add("long-sentences", "medium", "Readability",
      `Sentences average ${m.avgWordsPerSentence} words. Break them up.`);
  }
  if (m.longestParagraph > 400) {
    add("wall-of-text", "high", "Readability",
      "One paragraph runs past 400 characters. Add a line break every 2–3 sentences.");
  }

  // — Tone —
  if (m.emojis === 0 && platform !== "linkedin") {
    add("no-emoji", "low", "Tone",
      "No emojis. One to three used purposefully tend to lift engagement.");
  } else if (m.words > 0 && m.emojis / m.words > 0.08) {
    add("emoji-heavy", "low", "Tone",
      "Emoji density is high — it hurts readability and screen-reader output.");
  }
  if (m.allCaps > 2) {
    add("shouting", "low", "Tone",
      `${m.allCaps} words in all caps reads as shouting. Use sparingly for emphasis.`);
  }

  // — Links —
  if (p.linksHurtReach && m.links > 0) {
    add("outbound-link", "medium", "Reach",
      `${p.label} suppresses posts with outbound links. Move it to the first comment or bio.`);
  }

  // — Mentions —
  if (m.mentions.length === 0 && m.words > 30) {
    add("no-mentions", "low", "Reach",
      "No accounts tagged. Mentioning people or brands you reference can extend reach.");
  }

  const order = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}