// Orchestrator: draft → ReviewResult, in the fixed order of AGENTS.md §6. Core does no I/O:
// the index, the alias lists, the extractors and the LLM port are all passed in.
// Documented in docs/ARCHITECTURE.md ("Orchestrator").
import { t } from "../i18n/ar";
import type { CorpusIndex } from "./corpus";
import { buildExplainInput, validateExplanation, type ExplainDiffInput } from "./explain";
import type { ExtractedQuote, Extractor } from "./extract";
import { LlmExtractionSchema, validateSpans, type LlmExtraction } from "./extract/llm";
import { mergeQuotes, type MergedQuote } from "./extract/merge";
import { evidenceOf, inVerseMarks, matchAll, matchers, type Matcher } from "./matchers";
import { attachReference, parseReferences, type Reference, type ReferenceAliases } from "./references";
import { collectionName, decide, reasonAr } from "./status";
import { API_VERSION, ExtractedBySchema, STATUSES, type Evidence, type ReviewItem, type ReviewResult, type Status } from "./types";

export type { ExplainDiffInput, ExplainDiffOp } from "./explain";

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
  // No LLM took part (none was passed in, or its call failed or timed out): only the regex
  // extractors read the draft, and no explanation was generated.
  LLM_UNAVAILABLE_REGEX_ONLY: "LLM_UNAVAILABLE_REGEX_ONLY",
  // The LLM returned at least one quote that the draft does not hold: it was dropped.
  LLM_SPAN_NOT_IN_DRAFT: "LLM_SPAN_NOT_IN_DRAFT",
  // The input reads as a request to the tool, not as a draft, and no extractor found a quote in it.
  NOT_A_DRAFT: "NOT_A_DRAFT",
  // The draft holds more quotes than MAX_ITEMS_PER_DRAFT: the later ones were not reviewed.
  ITEM_LIMIT_REACHED: "ITEM_LIMIT_REACHED",
} as const;

export const INTERNAL_ERROR = "INTERNAL_ERROR";

// The LLM port (AGENTS.md §6: everything an LLM does goes through it), implemented in src/llm.
// Whatever it returns is untrusted input (AGENTS.md §2 rule 9): the extraction is schema-validated
// and its quotes are looked up in the draft (./extract/llm), an explanation is validated
// (./explain), and neither ever decides a status.
export interface LlmPort {
  // Quotations and claims in the draft, as text. A rejection (failure, timeout) means that no LLM
  // took part: the review goes on with the other extractors.
  extractQuotes(draft: string): Promise<LlmExtraction>;
  // A short explanation of a difference, grounded in the given input only; null when the model
  // cannot state it. A rejection (failure, timeout) means no explanation for that item. Shown as
  // `explanation: { text, generated: true }`, never as source text.
  explainDiff(input: ExplainDiffInput): Promise<string | null>;
}

export interface ReviewDeps {
  index: CorpusIndex;
  aliases: ReferenceAliases;
  corpusVersion: string;
  // The collections the corpus holds (data/corpus/manifest.json). The result reports the part of
  // it that is searched: see searchedCoverage.
  coverage: readonly string[];
  // In priority order, all before the LLM (the merge rule: ./extract/merge).
  extractors: readonly Extractor[];
  // Absent = no LLM takes part. Its time budget is the adapter's own (LLM_TIMEOUT_MS).
  llm?: LlmPort;
  // The clock. Nothing reads it: a result holds no time, so that the same draft with the same
  // extraction always gives the same result.
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

// The LLM's reading of the draft, or undefined when no LLM took part: none was passed in, the call
// failed or timed out, or what came back does not fit the schema. Never rejects.
async function extractWithLlm(draft: string, llm: LlmPort | undefined): Promise<LlmExtraction | undefined> {
  if (!llm) return undefined;
  try {
    const parsed = LlmExtractionSchema.safeParse(await llm.extractQuotes(draft));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

// The explanation of one item, or undefined: the model had none, the call failed or timed out, or
// the text did not pass validateExplanation. Never rejects.
async function explain(llm: LlmPort, input: ExplainDiffInput, bookTitles: readonly string[]): Promise<string | undefined> {
  try {
    const text = await llm.explainDiff(input);
    return (typeof text === "string" ? validateExplanation(text, input, bookTitles) : null) ?? undefined;
  } catch {
    return undefined;
  }
}

// The position in the draft: the same draft always gives the same ids.
const itemId = (quote: MergedQuote): string => `item-${quote.span.start}-${quote.span.end}`;

export async function review(draft: string, deps: ReviewDeps): Promise<ReviewResult> {
  const limits = deps.limits ?? REVIEW_LIMITS;
  const registry = deps.matchers ?? matchers;
  const coverage = searchedCoverage(deps.coverage, deps.index, registry);
  const warnings: string[] = [];

  // 1. Extract: the LLM (if one was passed in) beside the extractors. The warning is added only
  //    when no LLM took part.
  const llmCall = extractWithLlm(draft, deps.llm);
  const extracted = deps.extractors.flatMap((extract) => extract(draft));
  const extraction = await llmCall;
  if (!extraction) warnings.push(WARNINGS.LLM_UNAVAILABLE_REGEX_ONLY);

  // 2. Validate: a span that is not in the draft verbatim is dropped. The LLM returns text, not
  //    offsets: its quotes are looked up in the draft, and one the draft does not hold is dropped.
  const verbatim = extracted.filter((quote) => isVerbatim(quote, draft));
  const fromLlm = validateSpans(draft, extraction?.items ?? []);
  if (fromLlm.notInDraft > 0) warnings.push(WARNINGS.LLM_SPAN_NOT_IN_DRAFT);

  // The model's word that the input is not a draft counts only when no extractor found a quote:
  // its output never removes an item (AGENTS.md §2 rule 9).
  const notADraft = extraction?.isDraft === false && verbatim.length === 0;
  if (notADraft) warnings.push(WARNINGS.NOT_A_DRAFT);

  // 3. Merge and dedupe, then the item limit.
  let quotes = notADraft ? [] : mergeQuotes(draft, [...verbatim, ...fromLlm.quotes]);
  if (quotes.length > limits.MAX_ITEMS_PER_DRAFT) {
    quotes = quotes.slice(0, limits.MAX_ITEMS_PER_DRAFT);
    warnings.push(WARNINGS.ITEM_LIMIT_REACHED);
  }

  // 4. Cited references, deterministically.
  const references = parseReferences(draft, deps.aliases);

  // 5–7. Per item: retrieve across all kinds, score and align (the matchers), decide (the status
  //      rules), then the word diff of the occurrences the decision rests on.
  //      `occurrence`: the evidence entries of the first occurrence, which step 8 rests on.
  const reviewOne = (quote: MergedQuote): { item: ReviewItem; occurrence: Evidence[] } => {
    const reference: Reference | undefined = attachReference(quote.span, references, draft);
    const verseMarks = inVerseMarks(draft, quote.span);
    const candidates = matchAll({ span: quote.span, claimedKind: quote.claimedKind, reference, verseMarks }, deps.index, registry);
    const decision = decide({ claimedKind: quote.claimedKind, claimLevel: quote.claimLevel, candidates });
    const evidence = decision.evidence.slice(0, limits.MAX_EVIDENCE_PER_ITEM).flatMap(evidenceOf);
    const item: ReviewItem = {
      id: itemId(quote),
      span: quote.span,
      claimedKind: quote.claimedKind,
      ...(reference ? { citedReference: { raw: reference.raw, span: reference.span, parsed: reference.parsed } } : {}),
      status: decision.status,
      contentLevel: decision.contentLevel,
      reasonCode: decision.reasonCode,
      // From the whole decision, so that «وفي n من المواضع الأخرى» counts what is not shown too.
      reasonAr: reasonAr(decision, { coverage }),
      evidence,
      extractedBy: quote.extractedBy,
    };
    return { item, occurrence: evidence.slice(0, decision.evidence[0]?.records.length ?? 0) };
  };

  const reviewed = quotes.map((quote) => {
    try {
      return reviewOne(quote);
    } catch {
      // Nothing found for this item may be shown: no evidence, no reference, no badge.
      const item: ReviewItem = {
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
      return { item, occurrence: [] };
    }
  });

  // 8. Grounded explanations: for DIFFERS items only, and only when the LLM read this draft. The
  //    calls start together, so the adapter's time budget is one for all of them. An explanation
  //    is added to an item; nothing else of the item or of the result changes with it.
  const llm = extraction ? deps.llm : undefined;
  const bookTitles = coverage.map(collectionName);
  const items = await Promise.all(
    reviewed.map(async ({ item, occurrence }): Promise<ReviewItem> => {
      if (!llm || item.status !== "DIFFERS" || occurrence.length === 0) return item;
      const text = await explain(llm, buildExplainInput(draft, item, occurrence), bookTitles);
      return text === undefined ? item : { ...item, explanation: { text, generated: true } };
    }),
  );

  const summary = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<Status, number>;
  for (const item of items) summary[item.status] += 1;

  return { apiVersion: API_VERSION, corpusVersion: deps.corpusVersion, coverage, items, summary, warnings };
}
