import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import {
  DiffOpSchema,
  ReviewItemSchema,
  ReviewResultSchema,
  SourceRecordSchema,
  type ReviewItem,
  type ReviewResult,
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
      record,
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
  ["MATCH on a pending record", { ...item, evidence: [{ record: { ...record, reviewStatus: "pending" }, score: 1 }] }],
  [
    "MATCH mixing reviewed and pending records",
    { ...item, evidence: [{ record, score: 1 }, { record: { ...record, reviewStatus: "pending" }, score: 1 }] },
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

test.each(["DIFFERS", "NOT_FOUND", "NEEDS_SPECIALIST", "ERROR"])("%s does not need reviewed evidence", (status) => {
  expect(ReviewItemSchema.safeParse({ ...item, status, evidence: [] }).success).toBe(true);
  const pending = [{ record: { ...record, reviewStatus: "pending" }, score: 0.8 }];
  expect(ReviewItemSchema.safeParse({ ...item, status, evidence: pending }).success).toBe(true);
});

test.each(["quran", "bukhari", "muslim"])("the built %s corpus conforms to SourceRecordSchema", (collection) => {
  const corpus = JSON.parse(readFileSync(`data/corpus/${collection}.json`, "utf8")) as { records: unknown[] };
  expect(corpus.records.length).toBeGreaterThan(0);
  for (const r of corpus.records) SourceRecordSchema.parse(r);
});
