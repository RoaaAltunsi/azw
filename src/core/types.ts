// Core data contracts (AGENTS.md §6). Defined once with zod; the types are inferred from the schemas.
// Every boundary (API, LLM output, corpus files) validates against these.
import { z } from "zod";
// Type only: src/core/references imports this file at runtime.
import type { Reference } from "./references";
// The schema file imports nothing from core, so this is not a cycle.
import { ParsedReferenceSchema } from "./references/schema";

// Open union: adding a kind means a new SourceAdapter plus a Matcher, and nothing else.
export type ContentKind = "quran" | "hadith" | (string & {});
export const ContentKindSchema: z.ZodType<ContentKind> = z.string().min(1);

export const STATUSES = ["MATCH", "DIFFERS", "NOT_FOUND", "NEEDS_SPECIALIST", "ERROR"] as const;
export const StatusSchema = z.enum(STATUSES);
export type Status = z.infer<typeof StatusSchema>;

export const CONTENT_LEVELS = ["A", "B", "C", "D"] as const;
export const ContentLevelSchema = z.enum(CONTENT_LEVELS);
export type ContentLevel = z.infer<typeof ContentLevelSchema>;

export const CitationSchema = z.strictObject({
  display: z.string().min(1),
  surah: z.number().int().positive().optional(),
  ayah: z.number().int().positive().optional(),
  // null = the source data carries no citation number for this record.
  number: z.string().min(1).nullable().optional(),
  // Full source value when `number` is only its integer part (e.g. "1907.01").
  subNumber: z.string().min(1).optional(),
  book: z.string().min(1).optional(),
  chapter: z.string().min(1).optional(),
});
export type Citation = z.infer<typeof CitationSchema>;

// Shown only when present in the source data, always with its attribution. Never produced by the model.
export const GradeSchema = z.strictObject({
  text: z.string().min(1),
  by: z.string().min(1),
  sourceRef: z.string().min(1),
});
export type Grade = z.infer<typeof GradeSchema>;

export const ReviewStatusSchema = z.enum(["reviewed", "pending"]);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const SourceRecordSchema = z.strictObject({
  // Stable: "quran:2:153", "bukhari:1", "bukhari:402.2" (split entry), "muslim:4927" (source hadithnumber).
  id: z.string().min(1),
  kind: ContentKindSchema,
  collection: z.string().min(1),
  exactText: z.string().min(1), // unmodified display text
  searchText: z.string(), // normalized, for retrieval only
  // Other normalized spellings of the same text, for retrieval only and never displayed.
  // Quran records carry one, label "uthmani" (built with UTHMANI_VARIANT_OPTIONS).
  searchVariants: z.array(z.strictObject({ label: z.string().min(1), text: z.string().min(1) })).optional(),
  matnText: z.string().min(1).optional(), // verbatim part of exactText, only when reliably separable
  citation: CitationSchema,
  sourceName: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  edition: z.string().min(1),
  license: z.string().min(1),
  reviewStatus: ReviewStatusSchema,
  grade: GradeSchema.optional(),
});
export type SourceRecord = z.infer<typeof SourceRecordSchema>;

// A source record as it leaves the API. searchText, searchVariants and matnText are retrieval keys,
// not source text: no client may receive them, so none can show them as scripture (AGENTS.md §2
// rules 1–2). The object is strict: a record that still carries one of them fails validation.
export const ApiSourceRecordSchema = SourceRecordSchema.omit({ searchText: true, searchVariants: true, matnText: true });
export type ApiSourceRecord = z.infer<typeof ApiSourceRecordSchema>;

// An allowlist, not a deletion: a field added to SourceRecord later stays inside the server until
// it is named here and in ApiSourceRecordSchema. A grade is copied only when the record has one;
// pending records have none (docs/DECISIONS.md D-5).
export function toApiRecord(record: SourceRecord): ApiSourceRecord {
  return {
    id: record.id,
    kind: record.kind,
    collection: record.collection,
    exactText: record.exactText,
    citation: record.citation,
    sourceName: record.sourceName,
    ...(record.sourceUrl !== undefined ? { sourceUrl: record.sourceUrl } : {}),
    edition: record.edition,
    license: record.license,
    reviewStatus: record.reviewStatus,
    ...(record.grade !== undefined ? { grade: record.grade } : {}),
  };
}

// Offsets into the user's draft: [start, end).
const spanShape = {
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
};
const spanIsOrdered = { check: (s: { start: number; end: number }) => s.end > s.start, message: "span is empty or reversed" };
export const SpanSchema = z.object(spanShape).refine(spanIsOrdered.check, spanIsOrdered.message);
export type Span = z.infer<typeof SpanSchema>;

// Word-level diff of a quote against the source text (src/core/diff). Ops are in reading order and
// describe the draft relative to the source: "equal" = the same words on both sides, "replace" =
// other words in the draft than in the source, "insert" = words only in the draft, "delete" = words
// only in the source. An op carries ranges, never text: `draft` is [start, end) in the user's draft,
// `source` is [start, end) in the exactText of the record `recordId`. Search-layer text never appears.
export const SourceRangeSchema = z
  .strictObject({ recordId: z.string().min(1), ...spanShape })
  .refine(spanIsOrdered.check, spanIsOrdered.message);
export type SourceRange = z.infer<typeof SourceRangeSchema>;

export const DIFF_OPS = ["equal", "replace", "insert", "delete"] as const;
export const DiffOpSchema = z
  .strictObject({
    op: z.enum(DIFF_OPS),
    draft: SpanSchema.optional(), // absent only for "delete"
    source: SourceRangeSchema.optional(), // absent only for "insert"
  })
  .refine((d) => (d.draft !== undefined) === (d.op !== "delete") && (d.source !== undefined) === (d.op !== "insert"), {
    message: "a diff op carries a draft range unless it is a delete, and a source range unless it is an insert",
  });
export type DiffOp = z.infer<typeof DiffOpSchema>;

export const ClaimedKindSchema: z.ZodType<
  ContentKind | "unclear_attribution" | "interpretive_claim"
> = z.string().min(1);
export type ClaimedKind = z.infer<typeof ClaimedKindSchema>;

// The reference the draft cites for a quote, as src/core/references read it: what the writer
// claims, not what the source says. `parsed.type` "unknown", or `partial: true`, means it was not
// read in full (docs/DECISIONS.md D-11, D-17).
export const CitedReferenceSchema = z.object({
  raw: z.string(),
  parsed: ParsedReferenceSchema.optional(),
  span: SpanSchema.optional(),
});
export type CitedReference = z.infer<typeof CitedReferenceSchema>;

// What a Matcher receives: one quoted span of the draft, what the draft presents it as, and the
// reference attached to it by src/core/references, if any. Internal to core (it crosses no
// boundary), so it has no zod schema.
export interface QuoteInput {
  span: { start: number; end: number; text: string }; // text = draft.slice(start, end)
  claimedKind: ClaimedKind;
  reference?: Reference;
  // The span stands inside ﴿…﴾ in the draft: the writer marked it as a verse.
  verseMarks?: boolean;
}

export const EvidenceSchema = z.object({
  record: ApiSourceRecordSchema,
  score: z.number(),
  diff: z.array(DiffOpSchema).optional(),
  ayahRange: z.tuple([z.number().int().positive(), z.number().int().positive()]).optional(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

// Optional LLM text. `generated: true` forces the «شرح مولّد آلياً» label in every client.
export const ExplanationSchema = z.object({
  text: z.string().min(1),
  generated: z.literal(true),
});
export type Explanation = z.infer<typeof ExplanationSchema>;

export const ExtractedBySchema = z.enum(["regex", "llm", "manual"]);
export type ExtractedBy = z.infer<typeof ExtractedBySchema>;

// The status rules decide MATCH; this is only a backstop at the boundary (AGENTS.md §2.1, §2.3, §4):
// a MATCH that does not rest on reviewed records is rejected, whoever produced it, and so is an
// ERROR item that carries evidence.
export const ReviewItemSchema = z
  .object({
    id: z.string().min(1),
    // exact span in the user's draft
    span: z.object({ ...spanShape, text: z.string().min(1) }).refine(spanIsOrdered.check, spanIsOrdered.message),
    claimedKind: ClaimedKindSchema,
    citedReference: CitedReferenceSchema.optional(),
    status: StatusSchema,
    contentLevel: ContentLevelSchema,
    reasonCode: z.string().min(1), // machine-readable reason, e.g. "REF_MISMATCH_AYAH"
    reasonAr: z.string().min(1), // deterministic Arabic sentence
    evidence: z.array(EvidenceSchema),
    explanation: ExplanationSchema.optional(),
    extractedBy: z.array(ExtractedBySchema).min(1),
  })
  .refine(
    (item) =>
      item.status !== "MATCH" ||
      (item.evidence.length > 0 && item.evidence.every((e) => e.record.reviewStatus === "reviewed")),
    { path: ["status"], message: "MATCH requires evidence, and every evidence record must be reviewed" },
  )
  .refine((item) => item.status !== "ERROR" || (item.evidence.length === 0 && item.explanation === undefined), {
    path: ["status"],
    message: "an ERROR item carries no evidence and no explanation",
  });
export type ReviewItem = z.infer<typeof ReviewItemSchema>;

export const API_VERSION = "1";

export const ReviewResultSchema = z.object({
  apiVersion: z.literal(API_VERSION),
  corpusVersion: z.string().min(1), // from data/corpus/manifest.json
  // The collections that were searched for this result: those of the corpus whose kind has a
  // registered matcher. A collection the corpus holds but nothing searches is not listed.
  coverage: z.array(z.string().min(1)),
  items: z.array(ReviewItemSchema),
  summary: z.record(StatusSchema, z.number().int().nonnegative()),
  warnings: z.array(z.string()), // e.g. "LLM_UNAVAILABLE_REGEX_ONLY"
});
export type ReviewResult = z.infer<typeof ReviewResultSchema>;

// ---------------------------------------------------------------------------------------------
// API v1 (docs/API.md is generated from the schemas below and from ReviewResultSchema)
// ---------------------------------------------------------------------------------------------

// POST /api/v1/review. The length limit (MAX_DRAFT_CHARS) is configuration, checked by the route.
export const ReviewRequestSchema = z.strictObject({
  text: z.string(), // the draft; never stored, never logged
});
export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;

export const API_ERROR_CODES = [
  "INVALID_REQUEST", // 400: the body is not JSON, or not { text: string }
  "EMPTY_DRAFT", // 400
  "DRAFT_TOO_LONG", // 413
  "ORIGIN_NOT_ALLOWED", // 403
  "RATE_LIMITED", // 429
  "INTERNAL_ERROR", // 500
] as const;

// Every response that is not a ReviewResult. It never carries items, so it cannot be taken for a
// result. `message` is a fixed Arabic sentence from src/i18n/ar.ts.
export const ApiErrorSchema = z.strictObject({
  apiVersion: z.literal(API_VERSION),
  error: z.strictObject({
    code: z.enum(API_ERROR_CODES),
    message: z.string().min(1),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

// GET /api/v1/health. `ok: false` (HTTP 503) = the corpus did not load; corpusVersion is then null.
export const HealthSchema = z.strictObject({
  ok: z.boolean(),
  corpusVersion: z.string().min(1).nullable(),
  coverage: z.array(z.string().min(1)), // as ReviewResult.coverage
  llmConfigured: z.boolean(),
});
export type Health = z.infer<typeof HealthSchema>;
