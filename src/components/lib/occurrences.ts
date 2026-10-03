// An item's evidence, grouped into the places the quote stands in. The API sends one entry per
// source record; the entries of one occurrence follow each other and share the same ayahRange
// (docs/API.md, "Evidence"). A ReviewItem has no occurrence index (docs/BACKLOG.md), so the grouping
// is read from the order and the range.
import type { Evidence } from "@/core/types";
import { format } from "@/i18n/ar";
import { kindUi } from "./kind-ui";

export interface Occurrence {
  entries: Evidence[]; // never empty
}

const sameRange = (a: Evidence, b: Evidence): boolean =>
  a.ayahRange !== undefined && b.ayahRange !== undefined && a.ayahRange[0] === b.ayahRange[0] && a.ayahRange[1] === b.ayahRange[1];

// How many records an occurrence that starts with this entry runs over.
const recordCount = (entry: Evidence): number => (entry.ayahRange ? entry.ayahRange[1] - entry.ayahRange[0] + 1 : 1);

export function groupOccurrences(evidence: readonly Evidence[]): Occurrence[] {
  const occurrences: Occurrence[] = [];
  let current: Evidence[] = [];
  for (const entry of evidence) {
    const first = current[0];
    const belongs =
      first !== undefined &&
      current.length < recordCount(first) &&
      sameRange(first, entry) &&
      first.record.collection === entry.record.collection;
    if (belongs) {
      current.push(entry);
    } else {
      current = [entry];
      occurrences.push({ entries: current });
    }
  }
  return occurrences;
}

// The reference of an occurrence, from citation.display as the source data gives it; never composed
// from numbers. Several records: «من … إلى …», the form the reason sentences use.
export function occurrenceCitation(occurrence: Occurrence): string {
  const first = occurrence.entries[0]!.record.citation.display;
  const last = occurrence.entries[occurrence.entries.length - 1]!.record.citation.display;
  return first === last ? first : format("reason.ref.range", { first, last });
}

// What «انسخ نص المصدر مع المرجع» puts on the clipboard: exactText and citation.display, nothing else.
export function sourceCopyText(occurrence: Occurrence): string {
  const text = occurrence.entries
    .map(({ record }) => {
      const { open, close } = kindUi(record.kind);
      return `${open}${record.exactText}${close}`;
    })
    .join(" ");
  return `${text}\n${occurrenceCitation(occurrence)}`;
}
