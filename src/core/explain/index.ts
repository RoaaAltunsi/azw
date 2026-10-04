// The grounded explanation of a DIFFERS item: what the model is given, and the check its answer
// must pass before it is shown. Pure. The answer is untrusted input (AGENTS.md §2 rule 9): it is
// shown only as `explanation: { text, generated: true }` and never changes a status, a reason or
// the evidence. Documented in docs/ARCHITECTURE.md ("Explanation"); choices: docs/DECISIONS.md D-23.
import { format } from "../../i18n/ar";
import { normalizeWithMap } from "../normalize";
import type { Evidence, ReviewItem } from "../types";

// A difference as words: `draft` cut from the user's draft, `source` from exactText.
export interface ExplainDiffOp {
  op: "replace" | "insert" | "delete";
  draft?: string; // absent only for "delete"
  source?: string; // absent only for "insert"
}

// The names of the explanation prompt (src/llm/prompts/explain.ts).
export interface ExplainDiffInput {
  draftExcerpt: string; // the span of the draft
  sourceText: string; // exactText of the records of the occurrence the item rests on
  sourceCitation: string; // citation.display of those records
  draftCitation: string | null; // the reference as the draft writes it
  reasonCode: string;
  diffOps: ExplainDiffOp[];
}

export const EXPLANATION_LIMITS = { MAX_CHARS: 240, MAX_SENTENCES: 2 } as const;

// Words the tool's generated text may not hold: each reads as a grade or a ruling (AGENTS.md §2
// rule 4). Compared without diacritics, anywhere in a word.
export const FORBIDDEN_WORDS: readonly string[] = ["صحيح", "ضعيف", "موضوع", "حكم", "يجب", "يحرم", "فتوى"];

// `occurrence`: the evidence entries of one occurrence, in record order (never empty).
export function buildExplainInput(draft: string, item: ReviewItem, occurrence: readonly Evidence[]): ExplainDiffInput {
  const exactText = new Map(occurrence.map(({ record }) => [record.id, record.exactText]));
  const diffOps = occurrence.flatMap(({ diff }) =>
    (diff ?? []).flatMap((d): ExplainDiffOp[] => {
      if (d.op === "equal") return [];
      const source = d.source && exactText.get(d.source.recordId)?.slice(d.source.start, d.source.end);
      return [{ op: d.op, ...(d.draft ? { draft: draft.slice(d.draft.start, d.draft.end) } : {}), ...(source ? { source } : {}) }];
    }),
  );
  const first = occurrence[0]!.record.citation.display;
  const last = occurrence[occurrence.length - 1]!.record.citation.display;
  return {
    draftExcerpt: item.span.text,
    sourceText: occurrence.map(({ record }) => record.exactText).join(" "),
    sourceCitation: first === last ? first : format("reason.ref.range", { first, last }),
    draftCitation: item.citedReference?.raw || null,
    reasonCode: item.reasonCode,
    diffOps,
  };
}

const QUOTED = /«([^«»]*)»|﴿([^﴿﴾]*)﴾/g;
// A quotation mark outside a matched «…» or ﴿…﴾: words quoted this way could not be checked.
const STRAY_QUOTE_MARK = /[«»﴿﴾"“”„‘’]/;
const SENTENCE_END = /[.!?؟\n]+/;
const HAS_WORD = /[\p{L}\p{N}]/u;

// Arabic-Indic and Extended Arabic-Indic digits as ASCII digits.
const asciiDigits = (text: string): string => text.replace(/[٠-٩۰-۹]/g, (d) => String(d.charCodeAt(0) & 0xf));
const numbersOf = (text: string): string[] => asciiDigits(text).match(/\d+/g) ?? [];

// Without diacritics, punctuation as spaces.
const fold = (text: string): string => ` ${normalizeWithMap(text, "search", { keepHonorificPhrases: true }).norm} `;

// The note as it may be shown, or null. `bookTitles`: the names of the covered collections
// («صحيح البخاري»); a title is a name, not a grade, so it is taken out before the word check.
export function validateExplanation(text: string, input: ExplainDiffInput, bookTitles: readonly string[]): string | null {
  const note = text.trim();
  if (note === "" || note.length > EXPLANATION_LIMITS.MAX_CHARS) return null;

  // Every quoted segment stands verbatim in what the model was given.
  const citations = [input.sourceCitation, input.draftCitation ?? ""];
  const grounds = [input.draftExcerpt, input.sourceText, ...citations];
  for (const match of note.matchAll(QUOTED)) {
    const segment = (match[1] ?? match[2] ?? "").trim();
    if (segment === "" || !grounds.some((ground) => ground.includes(segment))) return null;
  }
  const outsideQuotes = note.replace(QUOTED, " ");
  if (STRAY_QUOTE_MARK.test(outsideQuotes)) return null;

  // A full stop inside a quoted segment ends no sentence of the note.
  if (outsideQuotes.split(SENTENCE_END).filter((part) => HAS_WORD.test(part)).length > EXPLANATION_LIMITS.MAX_SENTENCES) return null;

  const cited = new Set(citations.flatMap(numbersOf));
  if (!numbersOf(note).every((n) => cited.has(n))) return null;

  const withoutTitles = bookTitles.reduce((rest, title) => rest.replaceAll(fold(title), " "), fold(note));
  if (FORBIDDEN_WORDS.some((word) => withoutTitles.includes(fold(word).trim()))) return null;

  return note;
}
