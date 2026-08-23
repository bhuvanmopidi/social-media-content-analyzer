import { NextResponse } from "next/server";
import type { Suggestion } from "@/lib/types";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";
const MAX_INPUT_CHARS = 6000;
const TIMEOUT_MS = 15_000;

const SYSTEM_PROMPT = `You are a social media strategist. You receive the text of a post and the target platform, and you return concrete rewrite suggestions.

Rules:
- Return every meaningful improvement you can identify. Do not artificially limit the count — but do not pad with weak observations either. If the post is already strong, return few or none.
- Each suggestion must include a rewritten excerpt the user can paste directly. Never give abstract advice like "make it more engaging".
- Cover: the opening hook, emotional specificity, structure and pacing, word choice, the closing ask, and anything else that would measurably change engagement.
- One suggestion per distinct issue. Do not split a single problem across multiple entries, and do not repeat the same point in different words.
- Do not comment on hashtag counts, character limits, emoji counts, or readability scores — those are handled elsewhere.
- Preserve the author's voice and factual claims. Do not invent statistics or events.

Respond with ONLY a JSON object, no markdown fences, no preamble:
{"suggestions":[{"type":"Hook","severity":"high","message":"why this change helps, one sentence","rewrite":"the rewritten text"}]}

severity must be one of: high, medium, low.`;

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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Platform: ${platform}\n\nPost:\n"""\n${text}\n"""` },
        ],
      }),
    });

    if (!res.ok) {
      console.error("Groq error", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ suggestions: [], aiAvailable: false });
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ suggestions: parseSuggestions(raw), aiAvailable: true });
  } catch (err) {
    console.error("Groq request failed", err);
    return NextResponse.json({ suggestions: [], aiAvailable: false });
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