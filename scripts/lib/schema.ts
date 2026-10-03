// Schemas for the data-preparation scripts. The corpus and alias file formats are owned by src/core
// (one schema per file format) and re-exported here; the data/review formats are script-only.
import { z } from "zod";

export { CitationSchema, GradeSchema, SourceRecordSchema, type SourceRecord } from "../../src/core/types.js";
export { CorpusFileSchema, QuranSpellingVariantsSchema, type CorpusFile } from "../../src/core/corpus/schema.js";

// data/review/reviewed.json — the only place approvals live. Edited by the human reviewer.
export const ReviewedFileSchema = z.strictObject({
  note: z.string().optional(),
  collections: z.array(
    z.strictObject({
      collection: z.string().min(1),
      approvedBy: z.string().min(1),
      approvedAt: z.string().min(1),
      scope: z.string().optional(),
      // How the reviewer checked, and which records they compared by hand.
      method: z.string().optional(),
      comparedRecords: z.array(z.string().min(1)).optional(),
      openIssues: z.array(z.string().min(1)).optional(),
    }),
  ),
  records: z.array(
    z.strictObject({
      id: z.string().min(1),
      approvedBy: z.string().min(1),
      approvedAt: z.string().min(1),
      note: z.string().optional(),
    }),
  ),
});
export type ReviewedFile = z.infer<typeof ReviewedFileSchema>;

// data/review/held-records.json — records a collection approval must not cover.
export const HeldFileSchema = z.strictObject({
  note: z.string().optional(),
  records: z.array(
    z.strictObject({
      id: z.string().min(1),
      heldAt: z.string().min(1),
      category: z.string().min(1),
      reason: z.string().min(1),
    }),
  ),
});
