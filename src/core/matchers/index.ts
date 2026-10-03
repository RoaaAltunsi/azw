// One Matcher per ContentKind, registered by kind. Documented in docs/ARCHITECTURE.md ("Quran matcher",
// "Hadith matcher").
import type { CorpusIndex } from "../corpus";
import type { QuoteInput } from "../types";
import { hadithMatcher } from "./hadith";
import type { MatchCandidate, Matcher } from "./matcher";
import { quranMatcher } from "./quran";

export { evidenceOf } from "./evidence";
export { hadithMatcher } from "./hadith";
export type { MatchCandidate, Matcher, ReferenceCheck } from "./matcher";
export { quranMatcher } from "./quran";
export { hasUthmaniSigns } from "./uthmani-spelling";
export { inVerseMarks } from "./verse-marks";

// A new kind adds its matcher here.
export const matchers: Readonly<Record<string, Matcher>> = {
  quran: quranMatcher,
  hadith: hadithMatcher,
};

export function getMatcher(kind: string): Matcher | undefined {
  return Object.hasOwn(matchers, kind) ? matchers[kind] : undefined;
}

// Every registered matcher, whatever the quote claims to be: a "hadith" may actually be a verse
// (AGENTS.md §6, pipeline). Candidates are in registry order, each matcher's best first.
export function matchAll(quote: QuoteInput, index: CorpusIndex, registry: Readonly<Record<string, Matcher>> = matchers): MatchCandidate[] {
  return Object.values(registry).flatMap((matcher) => matcher.match(quote, index));
}
