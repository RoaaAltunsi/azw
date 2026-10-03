// Extraction: from a draft to the spans that are quotations. An extractor is a pure function
// draft → ExtractedQuote[]; the orchestrator (src/core/review.ts) validates and merges what the
// extractors return.
//
// TEMPORARY (P6): the extractor below is the minimum the orchestrator needs to run end to end. It
// reads two forms only. P9 replaces it with the real regex extractor.
import type { ClaimedKind, ContentLevel, ExtractedBy } from "../types";

export interface ExtractedQuote {
  // text = draft.slice(start, end): the quoted words, without the quotation marks around them.
  span: { start: number; end: number; text: string };
  claimedKind: ClaimedKind;
  // Only for an interpretive claim: "D" = a ruling for a personal case (src/core/status).
  claimLevel?: Extract<ContentLevel, "C" | "D">;
  extractedBy: ExtractedBy;
}

export type Extractor = (draft: string) => ExtractedQuote[];

// ﴿…﴾: the ornate brackets are used for Quran text only.
const QURAN_BRACKETS = /﴿([^﴿﴾]+)﴾/g;
// «…» after «قال رسول الله», in the same sentence and at most 60 characters later (room for «ﷺ» or
// «صلى الله عليه وسلم» and a colon), with no other quotation mark between them.
const HADITH_AFTER_FORMULA = /قال\s+رسول\s+الله[^«»﴿﴾\n.!?؟]{0,60}?«([^«»]+)»/g;

// The inner group without the whitespace around it, as a span of the draft.
function innerSpan(match: RegExpExecArray): ExtractedQuote["span"] | undefined {
  const inner = match[1]!;
  const text = inner.trim();
  if (text === "") return undefined;
  // The group is the last thing before the closing mark, which is one character.
  const groupStart = match.index + match[0].length - 1 - inner.length;
  const start = groupStart + inner.indexOf(text);
  return { start, end: start + text.length, text };
}

export const temporaryRegexExtractor: Extractor = (draft) => {
  const quotes: ExtractedQuote[] = [];
  const forms: Array<[RegExp, ClaimedKind]> = [
    [QURAN_BRACKETS, "quran"],
    [HADITH_AFTER_FORMULA, "hadith"],
  ];
  for (const [pattern, claimedKind] of forms) {
    for (const match of draft.matchAll(pattern)) {
      const span = innerSpan(match);
      if (span) quotes.push({ span, claimedKind, extractedBy: "regex" });
    }
  }
  return quotes.sort((a, b) => a.span.start - b.span.start);
};
