// What the LLM extractor returns, and how it becomes spans of the draft. The model's output is
// untrusted input (AGENTS.md §2 rule 9): it is schema-validated, a quote is kept only where the
// draft holds it, and its offsets are computed here, never taken from the model.
// Documented in docs/ARCHITECTURE.md ("LLM extractor").
import { z } from "zod";
import { wordCount, type ExtractedQuote } from "./index";

export const LLM_QUOTE_KINDS = ["quran", "hadith", "unclear_attribution", "interpretive_claim"] as const;

// The structured output asked of the provider. `citedReference` and `attributionPhrase` are kept
// for the evaluation only: nothing in the pipeline reads them, and the reference of an item is
// still the one attachReference finds.
export const LlmExtractionSchema = z.object({
  items: z.array(
    z.object({
      quote: z.string(),
      kind: z.enum(LLM_QUOTE_KINDS),
      claimLevel: z.enum(["C", "D"]).nullable(),
      citedReference: z.string().nullable(),
      attributionPhrase: z.string().nullable(),
    }),
  ),
  isDraft: z.boolean(),
});
export type LlmExtraction = z.infer<typeof LlmExtractionSchema>;
export type LlmExtractedItem = LlmExtraction["items"][number];

export interface ValidatedSpans {
  quotes: ExtractedQuote[]; // in the order the model returned them
  notInDraft: number; // quotes the draft does not hold: dropped
}

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Each quote is looked up in the draft; only the whitespace between its words may differ. The span
// text is the draft's own text at the place found. A quote returned twice takes the next
// occurrence; a repeat with no further occurrence is dropped without being counted, because its
// words are in the draft and already have their span.
export function validateSpans(draft: string, items: readonly LlmExtractedItem[]): ValidatedSpans {
  const searches = new Map<string, RegExp>(); // lastIndex = the end of the occurrence taken last
  const quotes: ExtractedQuote[] = [];
  let notInDraft = 0;

  for (const item of items) {
    const words = item.quote.split(/\s+/).filter((word) => word !== "");
    const key = words.join(" ");
    let search = searches.get(key);
    const repeated = search !== undefined;
    if (!search) searches.set(key, (search = new RegExp(words.map(escapeRegExp).join("\\s+"), "g")));

    const found = words.length > 0 ? search.exec(draft) : null;
    if (!found) {
      if (!repeated) notInDraft++;
      // A failed exec resets lastIndex: a third copy must not take the first occurrence again.
      search.lastIndex = draft.length;
      continue;
    }
    const claim = item.kind === "interpretive_claim";
    if (!claim && wordCount(found[0]) < 2) continue;
    quotes.push({
      span: { start: found.index, end: found.index + found[0].length, text: found[0] },
      claimedKind: item.kind,
      ...(claim ? { claimLevel: item.claimLevel ?? "C" } : {}),
      extractedBy: "llm",
    });
  }
  return { quotes, notInDraft };
}
