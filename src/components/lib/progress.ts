// The progress shown while a review runs. The API answers once, at the end, so the percentage is
// an estimate from the time that has passed, and the UI says so. It rises fast at first, slows
// down, and never reaches 100: only the answer itself ends the wait.
import type { MessageKey } from "@/i18n/ar";

const PACE_MS = 8000; // about 63% of the way after this long
const CEILING = 95;

export function estimatedProgress(elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return Math.floor(CEILING * (1 - Math.exp(-elapsedMs / PACE_MS)));
}

// The steps of a review, in the fixed order of the pipeline (AGENTS.md §6), by estimated progress.
const STAGES: ReadonlyArray<{ from: number; label: MessageKey }> = [
  { from: 70, label: "progress.stage.compare" },
  { from: 30, label: "progress.stage.match" },
  { from: 0, label: "progress.stage.extract" },
];

export function progressStage(percent: number): MessageKey {
  return STAGES.find((stage) => percent >= stage.from)!.label;
}
