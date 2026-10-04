// Extraction: from a draft to the spans that are quotations. An extractor is a pure function
// draft → ExtractedQuote[]; the orchestrator (src/core/review.ts) validates and merges what the
// extractors return.
//
// The regex extractor below is both the fallback when no LLM takes part and the baseline the LLM
// extractor is compared with. Every rule is documented in docs/ARCHITECTURE.md ("Regex extractor").
// What an LLM returns is read in ./llm (schema, span validation); ./merge makes one list of both.
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

export interface AttributionPattern {
  // In ordinary spelling, without diacritics; matched as whole words whatever the diacritics, the
  // hamza on an alef, «ى/ي» and «ة/ه», also after «و» or «ف» and a prefix «ك», «ل» or «ب».
  // «ﷺ» stands for any of PROPHET_HONORIFICS; «…» for at most MAX_PHRASE_GAP_CHARS characters of
  // the same sentence.
  phrase: string;
  claimedKind: ClaimedKind;
  // A quote without marks: "always" = the text after the phrase, up to the sentence end;
  // "afterColon" = only the text after a colon. For phrases that are not a verb of speech
  // («في الحديث عن الصبر …» is ordinary prose).
  unmarked: "always" | "afterColon";
  // «( … )» right after the phrase is a quote too.
  roundBrackets?: boolean;
}

// The attribution phrases the extractor reads. Extend the list here. A verb of speech is listed in
// the past and in the present tense («قال النبي», «يقول النبي»): docs/DECISIONS.md D-28.
export const ATTRIBUTION_PATTERNS: readonly AttributionPattern[] = [
  { phrase: "قال تعالى", claimedKind: "quran", unmarked: "always", roundBrackets: true },
  { phrase: "قال الله تعالى", claimedKind: "quran", unmarked: "always", roundBrackets: true },
  { phrase: "قال سبحانه", claimedKind: "quran", unmarked: "always", roundBrackets: true },
  { phrase: "يقول الله", claimedKind: "quran", unmarked: "always", roundBrackets: true },
  { phrase: "يقول تعالى", claimedKind: "quran", unmarked: "always", roundBrackets: true },
  { phrase: "يقول سبحانه", claimedKind: "quran", unmarked: "always", roundBrackets: true },
  { phrase: "قوله تعالى", claimedKind: "quran", unmarked: "always", roundBrackets: true },
  { phrase: "قال رسول الله", claimedKind: "hadith", unmarked: "always" },
  { phrase: "قال النبي", claimedKind: "hadith", unmarked: "always" },
  { phrase: "قال ﷺ", claimedKind: "hadith", unmarked: "always" },
  { phrase: "يقول رسول الله", claimedKind: "hadith", unmarked: "always" },
  { phrase: "يقول النبي", claimedKind: "hadith", unmarked: "always" },
  { phrase: "يقول ﷺ", claimedKind: "hadith", unmarked: "always" },
  { phrase: "عن النبي … قال", claimedKind: "hadith", unmarked: "always" },
  { phrase: "في الحديث", claimedKind: "hadith", unmarked: "afterColon" },
  { phrase: "ورد عنه", claimedKind: "hadith", unmarked: "afterColon" },
  { phrase: "في الأثر", claimedKind: "unclear_attribution", unmarked: "afterColon" },
  { phrase: "قال بعض السلف", claimedKind: "unclear_attribution", unmarked: "afterColon" },
  { phrase: "يروى", claimedKind: "unclear_attribution", unmarked: "afterColon" },
  { phrase: "يقال إن النبي", claimedKind: "unclear_attribution", unmarked: "afterColon" },
];

export interface ClaimPattern {
  // Written and matched like the phrase of an AttributionPattern.
  phrase: string;
  // "C" = a conclusion drawn from a text; "D" = a ruling addressed to the reader (src/core/status).
  claimLevel: Extract<ContentLevel, "C" | "D">;
}

// The sentences of the writer that are read as an interpretive claim: from the phrase to the
// sentence end. They are the forms the extraction prompt names (src/llm/prompts/extract.ts), so
// that a ruling is referred to a specialist also when no LLM takes part (docs/DECISIONS.md D-28).
export const CLAIM_PATTERNS: readonly ClaimPattern[] = [
  { phrase: "تدل الآية على", claimLevel: "C" },
  { phrase: "يدل الحديث على", claimLevel: "C" },
  { phrase: "يفهم من الآية", claimLevel: "C" },
  { phrase: "يفهم من الحديث", claimLevel: "C" },
  { phrase: "يجوز لك", claimLevel: "D" },
  { phrase: "لا يجوز لك", claimLevel: "D" },
  { phrase: "يجب عليك", claimLevel: "D" },
  { phrase: "يحرم عليك", claimLevel: "D" },
];

// Skipped between a phrase and its quote, and never part of a span.
export const PROPHET_HONORIFICS: readonly string[] = ["ﷺ", "صلى الله عليه وسلم", "صلى الله عليه وآله وسلم", "عليه الصلاة والسلام", "عليه السلام"];
export const DIVINE_HONORIFICS: readonly string[] = ["تعالى", "وتعالى", "سبحانه وتعالى", "تبارك وتعالى", "سبحانه", "عز وجل", "جل وعلا", "جل جلاله"];

// A quote without marks stops before one of these words (also after «و» or «ف») and before an
// opening bracket, so that a cited reference is not part of the quote.
export const REFERENCE_WORDS: readonly string[] = ["رواه", "أخرجه", "خرجه", "متفق عليه"];

// The quote must open within this many characters after the phrase, in the same sentence.
export const MAX_LEAD_CHARS = 60;
export const MAX_PHRASE_GAP_CHARS = 40;

const UNCLEAR: ClaimedKind = "unclear_attribution";
const CLAIM: ClaimedKind = "interpretive_claim";

// ---------------------------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------------------------

// Harakat, superscript alef, Quranic marks, tatweel and zero-width characters inside a word.
const MARKS = "[\\u064B-\\u065F\\u0670\\u06D6-\\u06ED\\u0640\\u200B-\\u200D]*";
// Arabic letters and marks: what a word is made of.
const WORD_CHARS = "\\u0620-\\u065F\\u066E-\\u06D3";
const NOT_AFTER_LETTER = `(?<![${WORD_CHARS}])`;
const NOT_BEFORE_LETTER = `(?![${WORD_CHARS}])`;
const ALEF = "[اأإآٱ]";
const LETTER_CLASSES: Readonly<Record<string, string>> = { "ا": ALEF, "أ": ALEF, "إ": ALEF, "آ": ALEF, "ي": "[يى]", "ى": "[يى]", "ه": "[هة]", "ة": "[هة]" };

const wordSource = (word: string): string => [...word].map((ch) => (LETTER_CLASSES[ch] ?? ch) + MARKS).join("");
const wordsSource = (phrase: string): string => phrase.split(" ").map(wordSource).join("\\s+");
// Longest first, so that «سبحانه وتعالى» is not cut down to «سبحانه».
const anyOf = (phrases: readonly string[]): string =>
  [...phrases]
    .sort((a, b) => b.length - a.length)
    .map(wordsSource)
    .join("|");

const SENTENCE_END = /[.!?؟…\n]/;
const QUOTE_CLOSERS: Readonly<Record<string, string>> = { "«": "»", "“": "”", '"': '"' };
// Inside a phrase («عن النبي … قال») no sentence end, quotation mark or colon may stand.
const PHRASE_GAP = `${NOT_BEFORE_LETTER}[^.!?؟…\\n«»“”"﴿﴾:]{0,${MAX_PHRASE_GAP_CHARS}}?${NOT_AFTER_LETTER}`;

function phraseSource(phrase: string): string {
  let source = "";
  let glue = "";
  for (const token of phrase.split(" ")) {
    if (token === "…") {
      source += PHRASE_GAP;
      glue = "";
    } else if (token === "ﷺ") {
      source += `\\s*(?:${anyOf(PROPHET_HONORIFICS)})`;
      glue = "\\s+";
    } else {
      source += glue + wordSource(token);
      glue = "\\s+";
    }
  }
  return `${NOT_AFTER_LETTER}(?<conjunction>[وف]${MARKS})?(?:[كلب]${MARKS})?${source}${NOT_BEFORE_LETTER}`;
}

// ﴿…﴾: the ornate brackets are used for Quran text only.
const QURAN_BRACKETS = /﴿([^﴿﴾]+)﴾/g;
// Whitespace, commas and honorifics after a phrase («النبيﷺ» is also written without a space).
const LEAD_IN = new RegExp(`(?:[\\s،,ﷺ]|${NOT_AFTER_LETTER}(?:${anyOf([...PROPHET_HONORIFICS, ...DIVINE_HONORIFICS])})${NOT_BEFORE_LETTER})*`, "y");
const REFERENCE_WORD = `${NOT_AFTER_LETTER}(?:[وف]${MARKS})?(?:${anyOf(REFERENCE_WORDS)})${NOT_BEFORE_LETTER}`;
const UNMARKED_END = new RegExp(`[.!?؟…\\n«»“”"﴿﴾\\[({]|${REFERENCE_WORD}`, "g");
// «(البقرة: 153)», «(رواه البخاري)»: a round bracket that holds a reference, not a quote.
const REFERENCE_IN_BRACKET = new RegExp(`[0-9\\u0660-\\u0669]|^\\s*(?:[وف]${MARKS})?(?:${anyOf([...REFERENCE_WORDS, "سورة"])})${NOT_BEFORE_LETTER}`);
const UNMARKED_EDGE = /[\s،,؛;:\-–—ـ]/;
const LETTER = /\p{L}/u;

// ---------------------------------------------------------------------------------------------
// Spans
// ---------------------------------------------------------------------------------------------

interface Range {
  start: number;
  end: number;
}

function trimmed(draft: string, start: number, end: number, edge: RegExp = /\s/): Range {
  while (start < end && edge.test(draft[start]!)) start++;
  while (end > start && edge.test(draft[end - 1]!)) end--;
  return { start, end };
}

// Words that hold a letter: what the one-word rule counts.
export const wordCount = (text: string): number => text.split(/\s+/).filter((word) => LETTER.test(word)).length;

// The quote whose opening mark stands at `at`. null = a mark stands there but gives no quote of
// this phrase (﴿, an unclosed or nested mark); undefined = no quotation mark there.
function quoteAt(draft: string, at: number, roundBrackets: boolean): Range | null | undefined {
  const open = draft[at];
  if (open === undefined) return undefined;
  // ﴿…﴾ is always a Quran quote of its own, whatever the phrase before it.
  if (open === "﴿") return null;
  const close = QUOTE_CLOSERS[open] ?? (roundBrackets && open === "(" ? ")" : undefined);
  if (close === undefined) return undefined;
  const end = draft.indexOf(close, at + 1);
  if (end < 0) return null;
  const inner = draft.slice(at + 1, end);
  if (open === "(" && REFERENCE_IN_BRACKET.test(inner)) return undefined;
  if (open !== close && inner.includes(open)) return null;
  // A straight quote or a bracket left open must not swallow the following lines.
  if ((open === '"' || open === "(") && inner.includes("\n")) return null;
  return trimmed(draft, at + 1, end);
}

interface Attribution extends Range {
  pattern: AttributionPattern;
  // Written with «و» or «ف»: a new clause, never the continuation of the phrase before it.
  conjunction: boolean;
}

interface Found {
  span: Range;
  claimedKind: ClaimedKind;
  claimLevel?: ClaimPattern["claimLevel"];
}

// Two phrases before one quote («يُروى عن النبي ﷺ أنه قال», «قال رسول الله ﷺ: قال الله تعالى»):
// the weaker claim is kept. An unclear attribution stays unclear, and words the writer gives as a
// hadith are not claimed as a verse.
export const weakerKind = (outer: ClaimedKind, inner: ClaimedKind): ClaimedKind =>
  outer === UNCLEAR || inner === UNCLEAR ? UNCLEAR : outer === "quran" ? inner : outer;

export function createRegexExtractor(patterns: readonly AttributionPattern[], claimPatterns: readonly ClaimPattern[] = CLAIM_PATTERNS): Extractor {
  const compiled = patterns.map((pattern) => ({ pattern, regex: new RegExp(phraseSource(pattern.phrase), "g") }));
  const compiledClaims = claimPatterns.map((pattern) => ({ pattern, regex: new RegExp(phraseSource(pattern.phrase), "g") }));

  return (draft) => {
    const attributions: Attribution[] = compiled
      .flatMap(({ pattern, regex }) =>
        [...draft.matchAll(regex)].map((m) => ({ start: m.index, end: m.index + m[0].length, pattern, conjunction: m.groups?.conjunction !== undefined })),
      )
      .sort((a, b) => a.start - b.start);
    const byStart = new Map<number, Attribution>();
    for (const a of attributions) if (!byStart.has(a.start)) byStart.set(a.start, a);

    // Up to the sentence end, a quotation mark, a bracket, a reference word or the next phrase.
    const unmarkedFrom = (from: number): Range => {
      UNMARKED_END.lastIndex = from;
      const stop = UNMARKED_END.exec(draft)?.index ?? draft.length;
      const next = attributions.find((a) => a.start > from)?.start ?? draft.length;
      return trimmed(draft, from, Math.min(stop, next), UNMARKED_EDGE);
    };

    const locate = (a: Attribution): Found | undefined => {
      const own = (range: Range | null): Found | undefined =>
        range && wordCount(draft.slice(range.start, range.end)) >= 2 ? { span: range, claimedKind: a.pattern.claimedKind } : undefined;
      const inherit = (next: Attribution): Found | undefined => {
        const found = locate(next);
        return found && { ...found, claimedKind: weakerKind(a.pattern.claimedKind, found.claimedKind) };
      };
      const roundBrackets = a.pattern.roundBrackets === true;

      LEAD_IN.lastIndex = a.end;
      LEAD_IN.exec(draft);
      const lead = LEAD_IN.lastIndex;
      const limit = Math.min(draft.length, a.end + MAX_LEAD_CHARS);
      for (let i = lead; i < limit; i++) {
        const ch = draft[i]!;
        if (SENTENCE_END.test(ch)) break;
        if (ch === ":") {
          // The quote starts after the colon, with marks or without.
          let start = i + 1;
          while (start < draft.length && /\s/.test(draft[start]!)) start++;
          const next = byStart.get(start);
          if (next && !next.conjunction) return inherit(next);
          const quote = quoteAt(draft, start, roundBrackets);
          return own(quote === undefined ? unmarkedFrom(start) : quote);
        }
        const next = byStart.get(i);
        // «قال النبي ﷺ ذلك، وقال تعالى: …»: the quote after the second phrase is not the first one's.
        if (next) return next.conjunction ? undefined : inherit(next);
        const quote = quoteAt(draft, i, roundBrackets && i === lead);
        if (quote !== undefined) return own(quote);
        if (ch === "(" || ch === "[") {
          // A bracket between the phrase and the quote («(البقرة: 153)») is stepped over.
          const close = draft.indexOf(ch === "(" ? ")" : "]", i);
          if (close > i && close < limit) i = close;
        } else if (ch === "»" || ch === "”" || ch === "﴾") return undefined;
      }
      return a.pattern.unmarked === "always" ? own(unmarkedFrom(lead)) : undefined;
    };

    // `order`: where the claim was made. For one span claimed twice, the earlier phrase is kept.
    const candidates: Array<Found & { order: number }> = [];
    for (const m of draft.matchAll(QURAN_BRACKETS)) {
      const span = trimmed(draft, m.index + 1, m.index + m[0].length - 1);
      if (span.end > span.start) candidates.push({ span, claimedKind: "quran", order: m.index });
    }
    for (const a of attributions) {
      const found = locate(a);
      if (found) candidates.push({ ...found, order: a.start });
    }
    // A claim: the sentence from its phrase on, as far as an unmarked quote would run, so that a
    // quotation after it stays an item of its own. It must say more than the phrase.
    for (const { pattern, regex } of compiledClaims) {
      for (const m of draft.matchAll(regex)) {
        const span = unmarkedFrom(m.index);
        if (wordCount(draft.slice(span.start, span.end)) > wordCount(pattern.phrase)) {
          candidates.push({ span, claimedKind: CLAIM, claimLevel: pattern.claimLevel, order: m.index });
        }
      }
    }

    // In draft order, without overlaps: the earlier start wins, then the longer span (the merge
    // rule of the orchestrator). A ﴿…﴾ inside a hadith quote is therefore not a separate quote.
    candidates.sort((x, y) => x.span.start - y.span.start || y.span.end - x.span.end || x.order - y.order);
    const quotes: ExtractedQuote[] = [];
    let lastEnd = 0;
    for (const { span, claimedKind, claimLevel } of candidates) {
      if (span.start < lastEnd) continue;
      quotes.push({ span: { ...span, text: draft.slice(span.start, span.end) }, claimedKind, ...(claimLevel ? { claimLevel } : {}), extractedBy: "regex" });
      lastEnd = span.end;
    }
    return quotes;
  };
}

export const regexExtractor: Extractor = createRegexExtractor(ATTRIBUTION_PATTERNS);
