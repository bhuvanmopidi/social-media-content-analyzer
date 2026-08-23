import { computeMetrics } from "./metrics";
import { runRules } from "./rules";
import type { Platform } from "./platforms";
import type { AnalysisResult } from "@/lib/types";

/** Synchronous and instant — renders before any network call. */
export function analyzeRules(text: string, platform: Platform): AnalysisResult {
  const metrics = computeMetrics(text);
  return {
    metrics,
    suggestions: runRules(text, metrics, platform),
    aiAvailable: false,
  };
}

export { PLATFORMS, PLATFORM_LIST } from "./platforms";
export type { Platform } from "./platforms";