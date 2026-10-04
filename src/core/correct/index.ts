// The correction a writer may choose to apply to the draft: the source's wording in place of the
// quote's words, or the source's citation in place of the cited reference. Pure, and made of
// source text only: a stretch of exactText or citation.display, never a model's words. It is
// offered only where the status rules already say which record is meant and what differs; in
// every other case nothing is offered (AGENTS.md §2 rule 3).
// Documented in docs/ARCHITECTURE.md ("Corrections"); choices: docs/DECISIONS.md D-25.
import type { MatchCandidate } from "../matchers";
import type { Reference } from "../references";
import type { Decision, ReasonCode } from "../status";
import type { ClaimedKind, Correction, DiffOp, ReviewItem } from "../types";

// The reference mismatches a correction is offered for. The hadith ones are left out: their own
// sentences say the cited reference may still be right (another edition's number, a book the
// tool's copy has gaps in).
const CORRECTABLE_REFERENCE_CODES: ReadonlySet<ReasonCode> = new Set<ReasonCode>(["REF_MISMATCH_AYAH", "REF_MISMATCH_SURAH"]);

// A citation is written inside the pair the writer's own reference stands in.
const BRACKETS: Readonly<Record<string, string>> = { "[": "]", "(": ")" };

export interface CorrectionInput {
  draft: string;
  claimedKind: ClaimedKind;
  decision: Pick<Decision, "status" | "reasonCode">;
  // One of the candidates the decision rests on, and its word diff (evidenceOf).
  candidate: MatchCandidate;
  diff: readonly DiffOp[];
  // The reference attached to the quote, if any.
  reference?: Reference;
}

// The stretch of exactText the quote was aligned to, in place of the quote's words.
function wordingCorrection({ draft, claimedKind, candidate, diff }: CorrectionInput): Correction | undefined {
  // A reference that contradicts this record, or that could not be compared with it, would stand
  // beside the new wording as it is: the tool would have written an attribution it cannot support.
  if (candidate.reference.result !== "none" && candidate.reference.result !== "consistent") return undefined;
  // The same for the kind: a verse's wording under «قال رسول الله ﷺ» stays a wrong attribution.
  if (candidate.kind !== claimedKind && !candidate.claimAdmitted) return undefined;
  // The quote must begin and end on a word the source has in that place. A word only one side has
  // at an edge may be an added word, a changed one, or the writer's own sentence going on: the
  // tool cannot tell which (docs/BACKLOG.md, "Fuzzy alignment").
  const first = diff[0];
  const last = diff[diff.length - 1];
  if (!first?.draft || !first.source || !last?.draft || !last.source) return undefined;

  const span = { start: first.draft.start, end: last.draft.end };
  const text = candidate.records[0]!.exactText.slice(first.source.start, last.source.end);
  if (text === "" || text === draft.slice(span.start, span.end)) return undefined;
  return { target: "wording", draft: span, text };
}

// The record's citation in place of the reference the draft cites.
function referenceCorrection({ candidate, reference }: CorrectionInput): Correction | undefined {
  const check = candidate.reference;
  if (!reference || check.result !== "mismatch" || !CORRECTABLE_REFERENCE_CODES.has(check.reasonCode)) return undefined;
  const citation = candidate.records[0]!.citation.display;
  const open = reference.raw[0]!;
  const close = BRACKETS[open];
  const text = close !== undefined && reference.raw.endsWith(close) ? `${open}${citation}${close}` : citation;
  if (text === reference.raw) return undefined;
  return { target: "reference", draft: reference.span, text };
}

export function correctionOf(input: CorrectionInput): Correction | undefined {
  const { decision, candidate } = input;
  // An occurrence over several records has no single stretch and no single citation.
  if (decision.status !== "DIFFERS" || candidate.records.length !== 1) return undefined;
  if (decision.reasonCode === "WORDING_DIFF") return wordingCorrection(input);
  if (CORRECTABLE_REFERENCE_CODES.has(decision.reasonCode)) return referenceCorrection(input);
  return undefined;
}

type Range = { start: number; end: number };
const overlaps = (a: Range, b: Range): boolean => a.start < b.end && b.start < a.end;

// A correction may touch only its own item's part of the draft. One that reaches into another
// item's quote, or into the stretch another item's correction would change (one reference cited
// for two quotes), is dropped: applying it would change what the other item was reviewed on.
export function dropSharedCorrections(items: readonly ReviewItem[]): ReviewItem[] {
  const claims = items.map((item) => [item.span, ...item.evidence.flatMap((e) => (e.correction ? [e.correction.draft] : []))]);
  return items.map((item, i) => {
    const foreign = claims.flatMap((ranges, j) => (j === i ? [] : ranges));
    const shared = (range: Range): boolean => foreign.some((other) => overlaps(range, other));
    if (!item.evidence.some((e) => e.correction && shared(e.correction.draft))) return item;
    return {
      ...item,
      evidence: item.evidence.map(({ correction, ...entry }) => (correction && !shared(correction.draft) ? { ...entry, correction } : entry)),
    };
  });
}
