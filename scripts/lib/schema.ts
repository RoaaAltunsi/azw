// Corpus schemas for the data-preparation phase. These mirror the SourceRecord contract in
// AGENTS.md §6; src/core/types.ts will own the contract once the app exists.
import { z } from "zod";

export const CitationSchema = z.strictObject({
  display: z.string().min(1),
  surah: z.number().int().positive().optional(),
  ayah: z.number().int().positive().optional(),
  // null = the source data carries no approved citation number for this record.
  number: z.string().min(1).nullable().optional(),
  // Full source value when `number` is only its integer part (e.g. Muslim "8.01").
  subNumber: z.string().min(1).optional(),
  book: z.string().min(1).optional(),
  chapter: z.string().min(1).optional(),
});

export const GradeSchema = z.strictObject({
  text: z.string().min(1),
  by: z.string().min(1),
  sourceRef: z.string().min(1),
});

export const SourceRecordSchema = z.strictObject({
  id: z.string().min(1),
  kind: z.string().min(1),
  collection: z.string().min(1),
  exactText: z.string().min(1),
  searchText: z.string(), // exactText at normalization level "search"
  // Other normalized spellings of the same text, for retrieval only (Quran: label "uthmani").
  searchVariants: z.array(z.strictObject({ label: z.string().min(1), text: z.string().min(1) })).optional(),
  matnText: z.string().min(1).optional(),
  citation: CitationSchema,
  sourceName: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  edition: z.string().min(1),
  license: z.string().min(1),
  reviewStatus: z.enum(["reviewed", "pending"]),
  grade: GradeSchema.optional(),
});
export type SourceRecord = z.infer<typeof SourceRecordSchema>;

export const CorpusFileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  collection: z.string().min(1),
  kind: z.string().min(1),
  recordCount: z.number().int().nonnegative(),
  records: z.array(SourceRecordSchema),
});
export type CorpusFile = z.infer<typeof CorpusFileSchema>;

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

// data/aliases/quran-spelling-variants.json — owner-approved everyday spellings of mushaf spellings.
// A pair applies only in its listed ayat ("<surah>:<ayah>"); forms carry no diacritics.
export const QuranSpellingVariantsSchema = z.strictObject({
  note: z.string().optional(),
  approvedBy: z.string().min(1),
  approvedAt: z.string().min(1),
  reviewSheet: z.string().optional(),
  variants: z.array(
    z.strictObject({
      group: z.string().min(1),
      sourceForm: z.string().min(1),
      everydayForm: z.string().min(1),
      ayat: z.array(z.string().regex(/^\d+:\d+$/)).min(1),
    }),
  ),
});
export type QuranSpellingVariants = z.infer<typeof QuranSpellingVariantsSchema>;
