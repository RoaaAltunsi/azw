// From a candidate to the `evidence` entries of a ReviewItem: one entry per record, each with the
// part of the word diff that concerns it. The record is the API record: the retrieval keys
// (searchText, searchVariants, matnText) stop here and reach no ReviewItem.
import { wordDiff } from "../diff";
import { toApiRecord, type DiffOp, type Evidence } from "../types";
import type { MatchCandidate } from "./matcher";

// An op belongs to the record its source range is in. An "insert" has no source: it goes with the
// record of the op before it (the first record, when the quote starts with one), so that the ops
// of all entries, read in record order, are the whole diff in reading order.
export function evidenceOf(candidate: MatchCandidate): Evidence[] {
  const byRecord = new Map<string, DiffOp[]>(candidate.recordIds.map((id) => [id, []]));
  let current = candidate.recordIds[0]!;
  for (const op of wordDiff(candidate.alignment)) {
    current = op.source?.recordId ?? current;
    byRecord.get(current)!.push(op);
  }
  return candidate.records.map((record) => ({
    record: toApiRecord(record),
    score: candidate.score,
    diff: byRecord.get(record.id)!,
    ...(candidate.ayahRange ? { ayahRange: candidate.ayahRange } : {}),
  }));
}
