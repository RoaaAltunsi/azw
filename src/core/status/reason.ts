// reasonAr: the one deterministic Arabic sentence of a decision. The wording lives in
// src/i18n/ar.ts; this file only fills in the citation, the kind label and the coverage.
import { ar, format, t, type MessageKey } from "../../i18n/ar";
import { getKindMeta } from "../corpus";
import type { MatchCandidate } from "../matchers";
import type { SourceRecord } from "../types";
import type { Decision } from "./decide";

export interface ReasonContext {
  // The covered collections, as in ReviewResult.coverage: ["quran", "bukhari", "muslim"].
  coverage: readonly string[];
}

// The name a collection is shown by («collection.<id>» in src/i18n/ar.ts), or its id when it has none.
export function collectionName(id: string): string {
  const key = `collection.${id}`;
  return Object.hasOwn(ar, key) ? t(key as MessageKey) : id;
}

const cite = (record: SourceRecord): string => getKindMeta(record.kind)?.citationFormatter(record) ?? record.citation.display;

// The citation of the first candidate, as the source data gives it; never composed from numbers.
function refOf(evidence: readonly MatchCandidate[]): string {
  const best = evidence[0];
  if (!best) return "";
  const first = best.records[0]!;
  const last = best.records[best.records.length - 1]!;
  const ref = first === last ? cite(first) : format("reason.ref.range", { first: cite(first), last: cite(last) });
  return evidence.length > 1 ? format("reason.ref.more", { ref, count: evidence.length - 1 }) : ref;
}

export function reasonAr(decision: Decision, context: ReasonContext): string {
  const best = decision.evidence[0];
  return format(`reason.${decision.reasonCode}`, {
    ref: refOf(decision.evidence),
    kind: best ? (getKindMeta(best.kind)?.labelAr ?? best.kind) : "",
    coverage: context.coverage.map(collectionName).join(t("list.separator")),
  });
}
