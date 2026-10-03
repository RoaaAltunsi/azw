// Schemas of the files under data/corpus and data/aliases: one schema per file format, used by
// the build scripts (through scripts/lib/schema.ts) and by the runtime loader (src/server).
import { z } from "zod";
import { CollectionAliasSchema, SurahAliasSchema } from "../references";
import { ContentKindSchema, SourceRecordSchema } from "../types";

// data/corpus/<collection>.json
export const CorpusFileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  collection: z.string().min(1),
  kind: ContentKindSchema,
  recordCount: z.number().int().nonnegative(),
  records: z.array(SourceRecordSchema),
});
export type CorpusFile = z.infer<typeof CorpusFileSchema>;

// data/corpus/manifest.json — the part the runtime relies on. The register fields written by
// scripts/build-corpus.ts (source, license, raw files …) are documentation and pass through unread.
export const CorpusManifestSchema = z.object({
  manifestVersion: z.literal(1),
  corpusVersion: z.string().min(1),
  coverage: z.array(z.string().min(1)),
  sources: z.array(
    z.object({
      collection: z.string().min(1),
      kind: ContentKindSchema,
      file: z.object({
        path: z.string().min(1), // relative to the repository root
        bytes: z.number().int().nonnegative(),
        sha256: z.string().regex(/^[0-9a-f]{64}$/),
      }),
      counts: z.object({ records: z.number().int().nonnegative() }),
    }),
  ),
});
export type CorpusManifest = z.infer<typeof CorpusManifestSchema>;

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
export type QuranSpellingVariant = QuranSpellingVariants["variants"][number];

// data/aliases/surahs.json and data/aliases/collections.json. Extra keys (note, source) are ignored.
export const SurahAliasFileSchema = z.object({ surahs: z.array(SurahAliasSchema) });
export const CollectionAliasFileSchema = z.object({ entries: z.array(CollectionAliasSchema) });
