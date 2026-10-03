// The only rule that turns a record's reviewStatus into "reviewed". Default: pending.
// Approvals come from data/review/reviewed.json: the owner's, or a documented source comparison
// made under the owner's delegation (AGENTS.md §9). Each entry says which.

export interface Approvals {
  collections: ReadonlySet<string>;
  records: ReadonlySet<string>;
}

export interface ReviewFlags {
  /** A collection-level approval never covers this record; it needs its own approval. */
  forcedPending: boolean;
  /** Cannot be approved at all, not even per record (no citation number). */
  neverApprovable: boolean;
}

export function reviewStatus(
  id: string,
  collection: string,
  approvals: Approvals,
  flags: ReviewFlags,
): "reviewed" | "pending" {
  if (flags.neverApprovable) return "pending";
  if (approvals.records.has(id)) return "reviewed";
  if (approvals.collections.has(collection) && !flags.forcedPending) return "reviewed";
  return "pending";
}
