import { computeMetrics } from "./metrics";
import { runRules } from "./rules";
import { fetchAiSuggestions, type AiReason } from "./ai";
import type { Platform } from "./platforms";
import type { AnalysisResult, Suggestion } from "@/lib/types";

/** Synchronous and instant — renders before any network call. */
export function analyzeRules(text: string, platform: Platform): AnalysisResult {
  const metrics = computeMetrics(text);
  return {
    metrics,
    suggestions: runRules(text, metrics, platform),
    aiAvailable: false,
  };
}

/** Async, layered on top of the rule output. */
export async function analyzeAi(
  text: string,
  platform: Platform,
  signal?: AbortSignal
): Promise<{ suggestions: Suggestion[]; aiAvailable: boolean; reason?: AiReason }> {
  return fetchAiSuggestions(text, platform, signal);
}

export { PLATFORMS, PLATFORM_LIST } from "./platforms";
export type { Platform } from "./platforms";
export type { AiReason } from "./ai";