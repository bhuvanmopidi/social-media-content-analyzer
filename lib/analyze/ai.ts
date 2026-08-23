import type { Suggestion } from "@/lib/types";
import type { Platform } from "./platforms";

export async function fetchAiSuggestions(
  text: string,
  platform: Platform,
  signal?: AbortSignal
): Promise<{ suggestions: Suggestion[]; aiAvailable: boolean }> {
  try {
    const res = await fetch("/api/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, platform }),
      signal,
    });
    if (!res.ok) return { suggestions: [], aiAvailable: false };
    return await res.json();
  } catch {
    return { suggestions: [], aiAvailable: false };
  }
}