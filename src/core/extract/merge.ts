// One list from what every extractor returned: in draft order, and a place of the draft belongs
// to one item only. Documented in docs/ARCHITECTURE.md ("Orchestrator", step 3).
import { ExtractedBySchema, type ExtractedBy } from "../types";
import { weakerKind, type ExtractedQuote } from "./index";

export interface MergedQuote extends Omit<ExtractedQuote, "extractedBy"> {
  extractedBy: ExtractedBy[];
}

// Two overlapping spans are the same quote when they share at least this much (intersection over
// union): a regex span and an LLM span of one quote differ by a mark, an honorific or a few words.
export const SAME_ITEM_MIN_IOU = 0.5;

const CLAIM = "interpretive_claim";
type Span = ExtractedQuote["span"];

// Called for overlapping spans only, where the union is the stretch from the first start to the last end.
function iou(a: Span, b: Span): number {
  return (Math.min(a.end, b.end) - Math.max(a.start, b.start)) / (Math.max(a.end, b.end) - Math.min(a.start, b.start));
}

// A regex quote inside ﴿…﴾: the ornate brackets claim a verse, whatever another extractor says.
function isBracketedVerse(draft: string, quote: ExtractedQuote): boolean {
  if (quote.extractedBy !== "regex" || quote.claimedKind !== "quran") return false;
  let before = quote.span.start - 1;
  while (before >= 0 && /\s/.test(draft[before]!)) before--;
  let after = quote.span.end;
  while (after < draft.length && /\s/.test(draft[after]!)) after++;
  return draft[before] === "﴿" && draft[after] === "﴾";
}

// Not part of a claim's span once it is cut: whitespace, quotation marks, brackets, punctuation.
const CLAIM_EDGE = /[\s﴿﴾«»“”"()[\]{}:،,؛;.]/;
const LETTER = /\p{L}/u;

// A claim is a sentence of the writer about a text, and it often holds that text («يجوز لك أن
// تفطر لقوله تعالى: ﴿…﴾»). The quotation inside it stays an item of its own: the claim keeps the
// longest stretch of its span that no quotation covers (the first, of two equally long), or is
// dropped when nothing with a letter is left. So a claim never removes a quotation.
function cutAroundQuotations(draft: string, claim: ExtractedQuote, quotations: readonly ExtractedQuote[]): ExtractedQuote | undefined {
  const covered = quotations
    .map((q) => q.span)
    .filter((span) => span.start < claim.span.end && span.end > claim.span.start)
    .sort((a, b) => a.start - b.start);
  if (covered.length === 0) return claim;

  let best: Span | undefined;
  const offer = (from: number, to: number): void => {
    let [start, end] = [from, to];
    while (start < end && CLAIM_EDGE.test(draft[start]!)) start++;
    while (end > start && CLAIM_EDGE.test(draft[end - 1]!)) end--;
    const text = draft.slice(start, end);
    if (LETTER.test(text) && (!best || text.length > best.text.length)) best = { start, end, text };
  };
  let from = claim.span.start;
  for (const span of covered) {
    offer(from, span.start);
    from = Math.max(from, span.end);
  }
  offer(from, claim.span.end);
  return best && { ...claim, span: best };
}

interface Kept extends MergedQuote {
  rank: number; // of the first extractor that returned it
  verse: boolean;
}

// A claim about a text and a quotation of a text are never one item.
const sameItem = (kept: Kept, quote: ExtractedQuote): boolean =>
  (kept.claimedKind === CLAIM) === (quote.claimedKind === CLAIM) && iou(kept.span, quote.span) >= SAME_ITEM_MIN_IOU;

// `quotes` in priority order (the regex extractor before the LLM): of two kinds that are neither
// unclear nor "quran", the first one's is kept.
//
// - The same item (identical spans, or an overlap of SAME_ITEM_MIN_IOU or more): one quote that
//   names every extractor. The LLM's span is kept, since a regex quote without marks runs to the
//   sentence end. The kind is the weaker claim (docs/DECISIONS.md D-20 item 2), except that a
//   regex ﴿…﴾ quote stays "quran".
// - A claim that overlaps a quotation is cut to the part outside it: both are kept.
// - Any other overlap: one span is kept. The earlier start wins, then the longer span.
export function mergeQuotes(draft: string, quotes: readonly ExtractedQuote[]): MergedQuote[] {
  const order = ExtractedBySchema.options;
  const quotations = quotes.filter((quote) => quote.claimedKind !== CLAIM);
  const sorted = quotes
    .map((quote, rank) => ({ quote: quote.claimedKind === CLAIM ? cutAroundQuotations(draft, quote, quotations) : quote, rank }))
    .filter((entry): entry is { quote: ExtractedQuote; rank: number } => entry.quote !== undefined)
    .sort((a, b) => a.quote.span.start - b.quote.span.start || b.quote.span.end - a.quote.span.end || a.rank - b.rank);

  const kept: Kept[] = [];
  for (const { quote, rank } of sorted) {
    const last = kept[kept.length - 1];
    if (!last || quote.span.start >= last.span.end) {
      const { extractedBy, ...rest } = quote;
      kept.push({ ...rest, span: { ...quote.span }, extractedBy: [extractedBy], rank, verse: isBracketedVerse(draft, quote) });
      continue;
    }
    if (!sameItem(last, quote)) continue;

    last.verse ||= isBracketedVerse(draft, quote);
    last.claimedKind = last.verse
      ? "quran"
      : rank < last.rank
        ? weakerKind(quote.claimedKind, last.claimedKind)
        : weakerKind(last.claimedKind, quote.claimedKind);
    // Two claims: a ruling for a personal case (level D) is the more restricted reading.
    if (quote.claimLevel === "D") last.claimLevel = "D";
    if (quote.extractedBy === "llm" && !last.extractedBy.includes("llm")) last.span = { ...quote.span };
    if (!last.extractedBy.includes(quote.extractedBy)) {
      last.extractedBy = [...last.extractedBy, quote.extractedBy].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    }
    last.rank = Math.min(last.rank, rank);
  }
  return kept.map(({ span, claimedKind, claimLevel, extractedBy }) => ({ span, claimedKind, ...(claimLevel ? { claimLevel } : {}), extractedBy }));
}
