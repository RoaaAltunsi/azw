// Orchestrator: draft → ReviewResult, in the fixed order of AGENTS.md §6. Core does no I/O:
// the index, the alias lists, the extractors and the LLM port are all passed in.
// Documented in docs/ARCHITECTURE.md ("Orchestrator").
import { t } from "../i18n/ar";
import type { CorpusIndex } from "./corpus";
import type { ExtractedQuote, Extractor } from "./extract";
import { evidenceOf, matchAll, matchers, type Matcher } from "./matchers";
import { attachReference, parseReferences, type Reference, type ReferenceAliases } from "./references";
import { decide, reasonAr } from "./status";
import { API_VERSION, ExtractedBySchema, STATUSES, type DiffOp, type ExtractedBy, type ReviewItem, type ReviewResult, type Status } from "./types";

// The bounds of one review. A one- or two-word quote can be an exact hit in thousands of ayat, and
// a draft can hold any number of quotes; neither may decide the size of a response.
export const REVIEW_LIMITS = {
  // Occurrences shown as evidence per item. One occurrence may run over several records (a quote
  // over two ayat), and all of its records are shown. The reason sentence still counts the rest.
  MAX_EVIDENCE_PER_ITEM: 5,
  // Items per draft, in draft order. Beyond it the result carries the warning ITEM_LIMIT_REACHED.
  MAX_ITEMS_PER_DRAFT: 40,
} as const;
export type ReviewLimits = Readonly<Record<keyof typeof REVIEW_LIMITS, number>>;

export const WARNINGS = {
  // No LLM took part: only the regex extractors read the draft, and no explanation was generated.
  LLM_UNAVAILABLE_REGEX_ONLY: "LLM_UNAVAILABLE_REGEX_ONLY",
  // The draft holds more quotes than MAX_ITEMS_PER_DRAFT: the later ones were not reviewed.
  ITEM_LIMIT_REACHED: "ITEM_LIMIT_REACHED",
} as const;

export const INTERNAL_ERROR = "INTERNAL_ERROR";

// The LLM port (AGENTS.md §6: everything an LLM does goes through it). Declared for P10, which
// implements it in src/llm; nothing calls it yet. Whatever it returns is untrusted input
// (AGENTS.md §2 rule 9): spans are validated against the draft, text is schema-validated, and
// neither ever decides a status.
export interface ExplainDiffInput {
  quote: string; // the span of the draft
  sourceText: string; // exactText of the record the item rests on
  citation: string;
  diff: DiffOp[];
  reasonCode: string;
}

export interface LlmPort {
  // Quotations and claims in the draft. Each span must exist verbatim in the draft, or it is dropped.
  extractQuotes(draft: string): Promise<ExtractedQuote[]>;
  // A short explanation of a difference, grounded in the given source text only. Shown as
  // `explanation: { text, generated: true }`, never as source text.
  explainDiff(input: ExplainDiffInput): Promise<string>;
}

export interface ReviewDeps {
  index: CorpusIndex;
  aliases: ReferenceAliases;
  corpusVersion: string;
  // The collections the corpus holds (data/corpus/manifest.json). The result reports the part of
  // it that is searched: see searchedCoverage.
  coverage: readonly string[];
  // In priority order: when two extractors return the same span, the first one's kind is kept.
  extractors: readonly Extractor[];
  llm?: LlmPort;
  // The clock, for the time budget of the LLM calls (P10). Nothing reads it yet: a result holds no
  // time, so that the same draft always gives the same result.
  now: () => number;
  // The matcher registry. Defaults to the registered matchers; a test passes its own.
  matchers?: Readonly<Record<string, Matcher>>;
  limits?: ReviewLimits;
}

// The collections that are really searched: those whose kind has a registered matcher. A corpus
// file with no matcher for its kind is loaded and indexed but nothing looks in it, so naming it in
// a result ("we did not find this text in …") would be untrue (AGENTS.md §2 rules 1 and 3).
// Registering a matcher widens the coverage; nothing here names a kind or a collection.
export function searchedCoverage(
  coverage: readonly string[],
  index: CorpusIndex,
  registry: Readonly<Record<string, Matcher>> = matchers,
): string[] {
  const searchedKinds = new Set(Object.values(registry).map((matcher) => matcher.kind));
  const searched = new Set(index.layers.filter((layer) => searchedKinds.has(layer.kind)).map((layer) => layer.collection));
  return coverage.filter((collection) => searched.has(collection));
}

// An extractor's output is trusted no further than the draft confirms it: the span must lie in the
// draft and its text must be the draft's text at that place. Anything else is dropped.
function isVerbatim(quote: ExtractedQuote, draft: string): boolean {
  const { start, end, text } = quote.span;
  return (
    Number.isInteger(start) &&
    Number.isInteger(end) &&
    start >= 0 &&
    end > start &&
    end <= draft.length &&
    draft.slice(start, end) === text &&
    typeof quote.claimedKind === "string" &&
    quote.claimedKind !== "" &&
    ExtractedBySchema.safeParse(quote.extractedBy).success
  );
}

interface MergedQuote extends Omit<ExtractedQuote, "extractedBy"> {
  extractedBy: ExtractedBy[];
}

// In draft order. The same span from two extractors is one quote that names both. A span that
// overlaps one already kept is dropped: the earlier start wins, then the longer span, then the
// earlier extractor. Every place of the draft therefore belongs to at most one item.
function merge(quotes: readonly ExtractedQuote[]): MergedQuote[] {
  const order = ExtractedBySchema.options;
  const sorted = quotes
    .map((quote, rank) => ({ quote, rank }))
    .sort((a, b) => a.quote.span.start - b.quote.span.start || b.quote.span.end - a.quote.span.end || a.rank - b.rank);
  const merged: MergedQuote[] = [];
  for (const { quote } of sorted) {
    const last = merged[merged.length - 1];
    if (last && last.span.start === quote.span.start && last.span.end === quote.span.end) {
      if (!last.extractedBy.includes(quote.extractedBy)) {
        last.extractedBy = [...last.extractedBy, quote.extractedBy].sort((a, b) => order.indexOf(a) - order.indexOf(b));
      }
    } else if (!last || quote.span.start >= last.span.end) {
      const { extractedBy, ...rest } = quote;
      merged.push({ ...rest, span: { ...quote.span }, extractedBy: [extractedBy] });
    }
  }
  return merged;
}

// The position in the draft: the same draft always gives the same ids.
const itemId = (quote: MergedQuote): string => `item-${quote.span.start}-${quote.span.end}`;

export async function review(draft: string, deps: ReviewDeps): Promise<ReviewResult> {
  const limits = deps.limits ?? REVIEW_LIMITS;
  const registry = deps.matchers ?? matchers;
  const coverage = searchedCoverage(deps.coverage, deps.index, registry);
  const warnings: string[] = [];

  // 1. Extract. P10 runs deps.llm.extractQuotes beside the extractors here; until then no LLM takes
  //    part, whether or not one was passed, and the result says so.
  const extracted = deps.extractors.flatMap((extract) => extract(draft));
  warnings.push(WARNINGS.LLM_UNAVAILABLE_REGEX_ONLY);

  // 2. Validate: a span that is not in the draft verbatim is dropped.
  const verbatim = extracted.filter((quote) => isVerbatim(quote, draft));

  // 3. Merge and dedupe.
  let quotes = merge(verbatim);
  if (quotes.length > limits.MAX_ITEMS_PER_DRAFT) {
    quotes = quotes.slice(0, limits.MAX_ITEMS_PER_DRAFT);
    warnings.push(WARNINGS.ITEM_LIMIT_REACHED);
  }

  // 4. Cited references, deterministically.
  const references = parseReferences(draft, deps.aliases);

  // 5–7. Per item: retrieve across all kinds, score and align (the matchers), decide (the status
  //      rules), then the word diff of the occurrences the decision rests on.
  const reviewOne = (quote: MergedQuote): ReviewItem => {
    const reference: Reference | undefined = attachReference(quote.span, references, draft);
    const candidates = matchAll({ span: quote.span, claimedKind: quote.claimedKind, reference }, deps.index, registry);
    const decision = decide({ claimedKind: quote.claimedKind, claimLevel: quote.claimLevel, candidates });
    return {
      id: itemId(quote),
      span: quote.span,
      claimedKind: quote.claimedKind,
      ...(reference ? { citedReference: { raw: reference.raw, span: reference.span, parsed: reference.parsed } } : {}),
      status: decision.status,
      contentLevel: decision.contentLevel,
      reasonCode: decision.reasonCode,
      // From the whole decision, so that «وفي n من المواضع الأخرى» counts what is not shown too.
      reasonAr: reasonAr(decision, { coverage }),
      evidence: decision.evidence.slice(0, limits.MAX_EVIDENCE_PER_ITEM).flatMap(evidenceOf),
      extractedBy: quote.extractedBy,
    };
  };

  const items = quotes.map((quote): ReviewItem => {
    try {
      return reviewOne(quote);
    } catch {
      // Nothing found for this item may be shown: no evidence, no reference, no badge.
      return {
        id: itemId(quote),
        span: quote.span,
        claimedKind: quote.claimedKind,
        status: "ERROR",
        contentLevel: "A",
        reasonCode: INTERNAL_ERROR,
        reasonAr: t("item.error.INTERNAL_ERROR"),
        evidence: [],
        extractedBy: quote.extractedBy,
      };
    }
  });

  // 8. Grounded explanations (deps.llm.explainDiff): P12.

  const summary = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<Status, number>;
  for (const item of items) summary[item.status] += 1;

  return { apiVersion: API_VERSION, corpusVersion: deps.corpusVersion, coverage, items, summary, warnings };
}
