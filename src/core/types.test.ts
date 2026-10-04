import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  ApiSourceRecordSchema,
  EvidenceSchema,
  DiffOpSchema,
  ReviewItemSchema,
  ReviewResultSchema,
  SourceRecordSchema,
  type ReviewItem,
  type ReviewResult,
  toApiRecord,
  type SourceRecord,
} from "./types";

const record: SourceRecord = {
  id: "quran:2:153",
  kind: "quran",
  collection: "quran",
  exactText: "نص المصدر",
  searchText: "نص المصدر",
  citation: { display: "البقرة: 153", surah: 2, ayah: 153 },
  sourceName: "Quranpedia.net",
  edition: "Hafs",
  license: "see docs/SOURCES.md",
  reviewStatus: "reviewed",
};

const item: ReviewItem = {
  id: "item-1",
  span: { start: 0, end: 9, text: "نص المصدر" },
  claimedKind: "quran",
  status: "MATCH",
  contentLevel: "A",
  reasonCode: "EXACT_MATCH",
  reasonAr: "النص مطابق لنص المصدر.",
  evidence: [
    {
      record: toApiRecord(record),
      score: 1,
      diff: [{ op: "equal", draft: { start: 0, end: 9 }, source: { recordId: "quran:2:153", start: 0, end: 9 } }],
      ayahRange: [153, 153],
    },
  ],
  extractedBy: ["regex"],
};

const result: ReviewResult = {
  apiVersion: "1",
  corpusVersion: "p0-test",
  coverage: ["quran", "bukhari", "muslim"],
  items: [item],
  summary: { MATCH: 1, DIFFERS: 0, NOT_FOUND: 0, NEEDS_SPECIALIST: 0, ERROR: 0 },
  warnings: [],
};

test("a valid ReviewResult parses unchanged", () => {
  expect(ReviewResultSchema.parse(result)).toEqual(result);
});

test("ContentKind is open: an unknown kind is accepted", () => {
  expect(SourceRecordSchema.safeParse({ ...record, kind: "dua" }).success).toBe(true);
});

const invalid: Array<[string, unknown]> = [
  ["unknown status", { ...item, status: "VERIFIED" }],
  ["unknown content level", { ...item, contentLevel: "E" }],
  ["explanation not marked as generated", { ...item, explanation: { text: "شرح", generated: false } }],
  ["unknown extractor", { ...item, extractedBy: ["memory"] }],
  ["negative span offset", { ...item, span: { start: -1, end: 2, text: "نص" } }],
  ["reversed span", { ...item, span: { start: 5, end: 2, text: "نص" } }],
  ["empty span", { ...item, span: { start: 3, end: 3, text: "" } }],
  ["no extractor", { ...item, extractedBy: [] }],
  ["MATCH without evidence", { ...item, evidence: [] }],
  ["MATCH on a pending record", { ...item, evidence: [{ record: toApiRecord({ ...record, reviewStatus: "pending" }), score: 1 }] }],
  [
    "MATCH mixing reviewed and pending records",
    { ...item, evidence: [{ record: toApiRecord(record), score: 1 }, { record: toApiRecord({ ...record, reviewStatus: "pending" }), score: 1 }] },
  ],
];

test.each(invalid)("ReviewItem rejects %s", (_name, value) => {
  expect(ReviewItemSchema.safeParse(value).success).toBe(false);
});

const source = { recordId: "quran:2:153", start: 0, end: 2 };
const draft = { start: 0, end: 2 };
const diffOps: Array<[string, unknown, boolean]> = [
  ["equal with both ranges", { op: "equal", draft, source }, true],
  ["replace with both ranges", { op: "replace", draft, source }, true],
  ["insert with a draft range only", { op: "insert", draft }, true],
  ["delete with a source range only", { op: "delete", source }, true],
  ["equal without a source range", { op: "equal", draft }, false],
  ["insert with a source range", { op: "insert", draft, source }, false],
  ["delete with a draft range", { op: "delete", draft, source }, false],
  ["an op that carries text", { op: "equal", draft, source, text: "نص" }, false],
  ["an empty source range", { op: "delete", source: { ...source, end: 0 } }, false],
  ["an unknown op", { op: "move", draft, source }, false],
];

test.each(diffOps)("DiffOp: %s", (_name, value, valid) => {
  expect(DiffOpSchema.safeParse(value).success).toBe(valid);
});

test("summary must count every status", () => {
  const summary = { MATCH: 1, DIFFERS: 0, NOT_FOUND: 0, NEEDS_SPECIALIST: 0 };
  expect(ReviewResultSchema.safeParse({ ...result, summary }).success).toBe(false);
});

test("apiVersion is pinned to 1", () => {
  expect(ReviewResultSchema.safeParse({ ...result, apiVersion: "2" }).success).toBe(false);
});

test("SourceRecord accepts labeled search variants and rejects malformed ones", () => {
  expect(SourceRecordSchema.safeParse({ ...record, searchVariants: [{ label: "uthmani", text: "نص" }] }).success).toBe(true);
  expect(SourceRecordSchema.safeParse({ ...record, searchVariants: [{ label: "uthmani", text: "" }] }).success).toBe(false);
  expect(SourceRecordSchema.safeParse({ ...record, searchVariants: ["نص"] }).success).toBe(false);
});

test("SourceRecord rejects unknown fields and an invalid review status", () => {
  expect(SourceRecordSchema.safeParse({ ...record, confidence: 0.9 }).success).toBe(false);
  expect(SourceRecordSchema.safeParse({ ...record, reviewStatus: "approved" }).success).toBe(false);
});

test("an ERROR item carries no evidence and no explanation", () => {
  const error = { ...item, status: "ERROR", evidence: [] };
  expect(ReviewItemSchema.safeParse(error).success).toBe(true);
  expect(ReviewItemSchema.safeParse({ ...error, evidence: item.evidence }).success).toBe(false);
  expect(ReviewItemSchema.safeParse({ ...error, explanation: { text: "شرح", generated: true } }).success).toBe(false);
});

describe("the API record", () => {
  const full: SourceRecord = {
    ...record,
    searchVariants: [{ label: "uthmani", text: "نص" }],
    matnText: "نص",
    sourceUrl: "https://example.org/source",
    grade: { text: "درجة", by: "المصدر", sourceRef: "المصدر، رقم 1" },
  };

  test("toApiRecord keeps the source fields and drops the retrieval keys", () => {
    const api = toApiRecord(full);
    expect(api).toEqual({
      id: full.id,
      kind: full.kind,
      collection: full.collection,
      exactText: full.exactText,
      citation: full.citation,
      sourceName: full.sourceName,
      sourceUrl: full.sourceUrl,
      edition: full.edition,
      license: full.license,
      reviewStatus: full.reviewStatus,
      grade: full.grade,
    });
    expect(ApiSourceRecordSchema.safeParse(api).success).toBe(true);
  });

  test("a record without a grade or a URL gets none", () => {
    expect(Object.keys(toApiRecord(record))).not.toContain("grade");
    expect(Object.keys(toApiRecord({ ...record, reviewStatus: "pending" }))).toEqual(
      ["id", "kind", "collection", "exactText", "citation", "sourceName", "edition", "license", "reviewStatus"],
    );
  });

  test.each(["searchText", "searchVariants", "matnText"])("the API schema rejects a record that carries %s", (key) => {
    expect(ApiSourceRecordSchema.safeParse({ ...toApiRecord(full), [key]: full[key as keyof SourceRecord] }).success).toBe(false);
  });

  test("a ReviewItem whose evidence holds a full SourceRecord is rejected", () => {
    expect(ReviewItemSchema.safeParse({ ...item, evidence: [{ record, score: 1 }] }).success).toBe(false);
  });

  test("citedReference.parsed must be a parsed reference", () => {
    const cited = (parsed: unknown): boolean => ReviewItemSchema.safeParse({ ...item, citedReference: { raw: "[البقرة: 153]", parsed } }).success;
    expect(cited({ type: "quran", surah: 2, ayahStart: 153 })).toBe(true);
    expect(cited({ type: "unknown" })).toBe(true);
    expect(cited({ type: "quran", surah: 115 })).toBe(false);
    expect(cited("البقرة 153")).toBe(false);
    expect(ReviewItemSchema.safeParse({ ...item, citedReference: { raw: "[البقرة: 153]" } }).success).toBe(true);
  });
});

test.each(["DIFFERS", "NOT_FOUND", "NEEDS_SPECIALIST"])("%s does not need reviewed evidence", (status) => {
  expect(ReviewItemSchema.safeParse({ ...item, status, evidence: [] }).success).toBe(true);
  const pending = [{ record: toApiRecord({ ...record, reviewStatus: "pending" }), score: 0.8 }];
  expect(ReviewItemSchema.safeParse({ ...item, status, evidence: pending }).success).toBe(true);
});

test.each(["quran", "bukhari", "muslim"])("the built %s corpus conforms to SourceRecordSchema", (collection) => {
  const corpus = JSON.parse(readFileSync(`data/corpus/${collection}.json`, "utf8")) as { records: unknown[] };
  expect(corpus.records.length).toBeGreaterThan(0);
  for (const r of corpus.records) SourceRecordSchema.parse(r);
});

// The backstop of AGENTS.md §2 rule 1 for corrections: only the record's own text or citation.
describe("EvidenceSchema: a correction", () => {
  const entry = (correction: unknown) => ({ record: toApiRecord(record), score: 1, correction });
  const draft = { start: 0, end: 4 };
  const rows: Array<[string, unknown, boolean]> = [
    ["a stretch of exactText", { target: "wording", draft, text: "المصدر" }, true],
    ["the whole of exactText", { target: "wording", draft, text: "نص المصدر" }, true],
    ["words that are not in exactText", { target: "wording", draft, text: "نص آخر" }, false],
    ["the citation as a wording", { target: "wording", draft, text: "البقرة: 153" }, false],
    ["the citation", { target: "reference", draft, text: "البقرة: 153" }, true],
    ["the citation in brackets", { target: "reference", draft, text: "[البقرة: 153]" }, true],
    ["another citation", { target: "reference", draft, text: "[البقرة: 154]" }, false],
    ["an empty text", { target: "wording", draft, text: "" }, false],
    ["an empty range", { target: "wording", draft: { start: 3, end: 3 }, text: "المصدر" }, false],
    ["an unknown target", { target: "explanation", draft, text: "المصدر" }, false],
    ["an extra field", { target: "wording", draft, text: "المصدر", by: "llm" }, false],
  ];
  test.each(rows)("%s", (_name, correction, valid) => {
    expect(EvidenceSchema.safeParse(entry(correction)).success).toBe(valid);
  });

  test("an entry without a correction is valid, and a result that carries a foreign one is not", () => {
    expect(EvidenceSchema.safeParse({ record: toApiRecord(record), score: 1 }).success).toBe(true);
    const foreign = { ...item, status: "DIFFERS", evidence: [entry({ target: "wording", draft, text: "نص من خارج المصدر" })] };
    expect(ReviewItemSchema.safeParse(foreign).success).toBe(false);
  });
});
