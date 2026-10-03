// From ranges to the pieces a text is rendered in. A diff op carries ranges, never text
// (docs/API.md, "Spans and diffs"): the UI slices the draft and exactText, and shows nothing else.
import type { DiffOp, Evidence, ReviewItem } from "@/core/types";

export type DiffMark = DiffOp["op"];

export interface Segment {
  text: string;
  // undefined = the text lies outside every op: punctuation in the draft, or the part of a source
  // record the quote does not reach.
  mark?: DiffMark;
}

interface MarkedRange {
  start: number;
  end: number;
  mark: DiffMark;
}

// text[from, to) cut at the ranges. A range that is out of bounds is clamped, and one that overlaps
// an earlier range is cut at it, so the pieces always add up to exactly text.slice(from, to).
export function cut(text: string, from: number, to: number, ranges: readonly MarkedRange[]): Segment[] {
  const segments: Segment[] = [];
  const end = Math.min(to, text.length);
  let at = Math.max(0, from);
  for (const range of [...ranges].sort((a, b) => a.start - b.start)) {
    const start = Math.max(range.start, at);
    const stop = Math.min(range.end, end);
    if (stop <= start) continue;
    if (start > at) segments.push({ text: text.slice(at, start) });
    segments.push({ text: text.slice(start, stop), mark: range.mark });
    at = stop;
  }
  if (end > at) segments.push({ text: text.slice(at, end) });
  return segments;
}

// The quote as written in the draft, marked by the diff against one occurrence (all its entries).
// Offsets of the ops are in the draft; span.text is draft.slice(span.start, span.end).
export function draftSegments(span: ReviewItem["span"], entries: readonly Evidence[]): Segment[] {
  const ranges = entries.flatMap((entry) =>
    (entry.diff ?? []).flatMap((op) =>
      op.draft ? [{ start: op.draft.start - span.start, end: op.draft.end - span.start, mark: op.op }] : [],
    ),
  );
  return cut(span.text, 0, span.text.length, ranges);
}

function sourceRanges(entry: Evidence): MarkedRange[] {
  return (entry.diff ?? []).flatMap((op) =>
    op.source && op.source.recordId === entry.record.id ? [{ start: op.source.start, end: op.source.end, mark: op.op }] : [],
  );
}

// The whole exactText of a record, marked by its diff.
export function sourceSegments(entry: Evidence): Segment[] {
  const text = entry.record.exactText;
  return cut(text, 0, text.length, sourceRanges(entry));
}

// Only the stretch of exactText the quote was aligned to, for the side-by-side view. A record
// without a diff is shown whole.
export function alignedSourceSegments(entry: Evidence): Segment[] {
  const ranges = sourceRanges(entry);
  if (ranges.length === 0) return sourceSegments(entry);
  const from = Math.min(...ranges.map((r) => r.start));
  const to = Math.max(...ranges.map((r) => r.end));
  return cut(entry.record.exactText, from, to, ranges);
}

export const hasDiff = (entries: readonly Evidence[]): boolean => entries.some((entry) => (entry.diff?.length ?? 0) > 0);

// Whether the diff shows a difference in wording (anything but "equal").
export const hasDifference = (entries: readonly Evidence[]): boolean =>
  entries.some((entry) => (entry.diff ?? []).some((op) => op.op !== "equal"));

export interface DraftPiece {
  text: string;
  // The item whose span this piece is, with its 1-based place in the result.
  item?: ReviewItem;
  index?: number;
}

// The reviewed draft cut at the spans of the items. A span that does not lie in the draft, or that
// overlaps an earlier one, is left unmarked rather than shown in the wrong place.
export function draftPieces(draft: string, items: readonly ReviewItem[]): DraftPiece[] {
  const pieces: DraftPiece[] = [];
  const ordered = items.map((item, i) => ({ item, index: i + 1 })).sort((a, b) => a.item.span.start - b.item.span.start);
  let at = 0;
  for (const { item, index } of ordered) {
    const { start, end } = item.span;
    if (start < at || end > draft.length) continue;
    if (start > at) pieces.push({ text: draft.slice(at, start) });
    pieces.push({ text: draft.slice(start, end), item, index });
    at = end;
  }
  if (at < draft.length) pieces.push({ text: draft.slice(at) });
  return pieces;
}
