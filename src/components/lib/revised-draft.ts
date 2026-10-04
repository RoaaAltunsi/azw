// The reviewed draft, and the same draft with the corrections the writer chose to apply. A
// correction comes from the API as it is (docs/API.md, "Corrections"): its text is the record's own
// exactText or citation. Nothing here writes a word of its own, and every character outside an
// applied correction is the writer's, in its place (docs/DECISIONS.md D-25).
import type { Correction, ReviewItem } from "@/core/types";

// Item id → the id of the evidence record whose correction the writer applied. One per item at
// most: the entries of an item are other places of the same quote.
export type Applied = Readonly<Record<string, string>>;

export function appliedCorrection(item: ReviewItem, applied: Applied): Correction | undefined {
  if (!Object.hasOwn(applied, item.id)) return undefined;
  return item.evidence.find((entry) => entry.record.id === applied[item.id])?.correction;
}

export interface DraftPiece {
  text: string;
  // The item this piece belongs to, with its 1-based place in the result.
  item?: ReviewItem;
  index?: number;
  // The text is an applied correction: it stands in place of the writer's words there.
  corrected?: boolean;
}

interface Mark {
  start: number;
  end: number;
  item: ReviewItem;
  index: number;
  text?: string; // the replacement, for an applied correction
}

// The marks of one item: its span, cut around an applied correction that lies inside it (the
// wording), or beside one that lies outside it (the cited reference).
function marksOf(item: ReviewItem, index: number, correction: Correction | undefined): Mark[] {
  const { start, end } = item.span;
  if (!correction) return [{ start, end, item, index }];
  const replaced: Mark = { ...correction.draft, item, index, text: correction.text };
  if (replaced.start < start || replaced.end > end) return [{ start, end, item, index }, replaced];
  return [{ start, end: replaced.start, item, index }, replaced, { start: replaced.end, end, item, index }].filter((m) => m.end > m.start);
}

// The draft cut at the spans of the items, with every applied correction in its place. A range that
// does not lie in the draft, or that overlaps an earlier one, is left as the writer wrote it rather
// than shown or changed in the wrong place.
export function draftPieces(draft: string, items: readonly ReviewItem[], applied: Applied = {}): DraftPiece[] {
  const marks = items.flatMap((item, i) => marksOf(item, i + 1, appliedCorrection(item, applied))).sort((a, b) => a.start - b.start);
  const pieces: DraftPiece[] = [];
  let at = 0;
  for (const { start, end, item, index, text } of marks) {
    if (start < at || end > draft.length) continue;
    if (start > at) pieces.push({ text: draft.slice(at, start) });
    pieces.push(text === undefined ? { text: draft.slice(start, end), item, index } : { text, item, index, corrected: true });
    at = end;
  }
  if (at < draft.length) pieces.push({ text: draft.slice(at) });
  return pieces;
}

// What «انسخ المسودة المعدّلة» puts on the clipboard.
export const revisedDraft = (draft: string, items: readonly ReviewItem[], applied: Applied = {}): string =>
  draftPieces(draft, items, applied)
    .map((piece) => piece.text)
    .join("");

// Whether the result offers any correction the writer could apply.
export const hasCorrections = (items: readonly ReviewItem[]): boolean =>
  items.some((item) => item.evidence.some((entry) => entry.correction !== undefined));

// How many corrections are in the revised draft.
export const appliedCount = (draft: string, items: readonly ReviewItem[], applied: Applied): number =>
  draftPieces(draft, items, applied).filter((piece) => piece.corrected).length;

// The items the revised draft still holds as the tool found them: not a match, and not corrected.
export const openItems = (items: readonly ReviewItem[], applied: Applied): number =>
  items.filter((item) => item.status !== "MATCH" && appliedCorrection(item, applied) === undefined).length;
