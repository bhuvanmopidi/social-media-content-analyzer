import { NextResponse } from "next/server";
import type { Suggestion } from "@/lib/types";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";
const MAX_INPUT_CHARS = 6000;
const TIMEOUT_MS = 15_000;

const PLATFORM_BRIEFS: Record<string, string> = {
  x: `Target platform: X (Twitter). Hard limit 280 characters, so brevity is everything — every word must earn its place. There is no "see more" fold; the whole post is visible at once. Punchy, declarative, conversational. Threads are normal for longer ideas.`,

  instagram: `Target platform: Instagram. Captions truncate at ~125 characters behind "more", so the first line must stop the scroll and create a reason to expand. Warm, personal, story-led voice. Line breaks matter — dense blocks get skipped.`,

  linkedin: `Target platform: LinkedIn. Truncates at ~210 characters behind "see more". Professional but human — insight and specificity beat corporate register. Short paragraphs, often single-sentence. Opinionated takes and concrete numbers outperform generic advice. Avoid hype and emoji-heavy phrasing.`,

  generic: `Target platform: unspecified. Write for a general social feed — clear hook, scannable structure, direct closing ask.`,
};

function systemPrompt(platform: string): string {
  const brief = PLATFORM_BRIEFS[platform] ?? PLATFORM_BRIEFS.generic;

  return `You are a social media strategist. You receive the text of a post and return concrete rewrite suggestions.

${brief}

Rules:
- Return every meaningful improvement you can identify, but do not pad with weak observations. If the post is strong, return few or none.
- Each suggestion must include a rewritten excerpt the user can paste directly. Never give abstract advice like "make it more engaging".
- Tailor every rewrite to the platform described above — its length constraints, its fold, and its register.
- Cover: the opening hook, emotional specificity, structure and pacing, word choice, and the closing ask.
- One suggestion per distinct issue. Do not repeat the same point in different words.
- Do not comment on hashtag counts or placement, character limits, emoji counts, call-to-action presence, or readability scores — a separate deterministic layer handles those. Focus only on rewriting language.
- "type" must be a short human-readable label in Title Case with spaces, e.g. "Hook", "Closing ask", "Pacing".
- Preserve the author's voice and factual claims. Do not invent statistics or events.

Respond with ONLY a JSON object, no markdown fences, no preamble:
{"suggestions":[{"type":"Hook","severity":"high","message":"why this change helps, one sentence","rewrite":"the rewritten text"}]}

severity must be one of: high, medium, low.`;
}

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ suggestions: [], aiAvailable: false });
  }

  let text: string;
  let platform: string;

  try {
    const body = await req.json();
    text = typeof body.text === "string" ? body.text.slice(0, MAX_INPUT_CHARS) : "";
    platform = typeof body.platform === "string" ? body.platform : "generic";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (text.trim().length < 20) {
    return NextResponse.json({ suggestions: [], aiAvailable: true });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt(platform) },
          { role: "user", content: `Post:\n"""\n${text}\n"""` },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Groq error", res.status, body);

      return NextResponse.json({
        suggestions: [],
        aiAvailable: false,
        reason:
          res.status === 429
            ? "rate_limited"
            : res.status === 401
            ? "unauthorized"
            : "error",
      });
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ suggestions: parseSuggestions(raw), aiAvailable: true });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    console.error("Groq request failed", err);
    return NextResponse.json({
      suggestions: [],
      aiAvailable: false,
      reason: aborted ? "timeout" : "error",
    });
  } finally {
    clearTimeout(timeout);
  }
}

/** The model is instructed to return clean JSON, but never trust that. */
function parseSuggestions(raw: string): Suggestion[] {
  const cleaned = raw.replace(/```json|```/g, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return [];
  }

  const list = (parsed as { suggestions?: unknown })?.suggestions;
  if (!Array.isArray(list)) return [];

  const valid = ["high", "medium", "low"];

  return list
    .filter(
      (s): s is Record<string, string> =>
        !!s && typeof s === "object" &&
        typeof (s as Record<string, unknown>).message === "string"
    )
    .slice(0, 4)
    .map((s, i) => ({
      id: `ai-${i}`,
      type: typeof s.type === "string" ? s.type : "Rewrite",
      severity: valid.includes(s.severity) ? (s.severity as Suggestion["severity"]) : "medium",
      message: s.message,
      rewrite: typeof s.rewrite === "string" ? s.rewrite : undefined,
      source: "ai" as const,
    }));
}