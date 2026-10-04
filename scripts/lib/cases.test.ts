import assert from "node:assert/strict";
import { test } from "vitest";
import { checkCases, parseCases, type EvalCase, type ExpectedItem } from "./cases.js";
import type { SourceRecord } from "./schema.js";

const record = (id: string, kind: string, exactText: string, extra: Partial<SourceRecord> = {}): SourceRecord => ({
  id,
  kind,
  collection: id.split(":")[0] ?? "",
  exactText,
  searchText: "",
  citation: { display: id },
  sourceName: "test",
  edition: "test",
  license: "test",
  reviewStatus: "reviewed",
  ...extra,
});

const RECORDS = new Map(
  [
    record("quran:1:1", "quran", "ألف باء", { citation: { display: "1:1", surah: 1, ayah: 1 } }),
    record("quran:1:2", "quran", "جيم دال", { citation: { display: "1:2", surah: 1, ayah: 2 } }),
    record("quran:1:4", "quran", "هاء واو", { citation: { display: "1:4", surah: 1, ayah: 4 } }),
    record("bukhari:1", "hadith", "حدثنا فلان قال نص الحديث"),
    record("bukhari:2", "hadith", "رواية أخرى"),
    record("muslim:9", "hadith", "نص معلق", { reviewStatus: "pending" }),
  ].map((r) => [r.id, r]),
);

const item = (over: Partial<ExpectedItem> = {}): ExpectedItem => ({
  quote: "ألف باء",
  kind: "quran",
  status: "MATCH",
  recordIds: ["quran:1:1"],
  reasonCode: "MATCH_NO_REFERENCE",
  ...over,
});

const evalCase = (over: Partial<EvalCase> = {}): EvalCase => ({
  id: "T-001",
  split: "tune",
  category: "EXACT",
  critical: false,
  draft: "قال تعالى: ألف باء جيم دال. وفي الحديث: نص الحديث.",
  expected: [item()],
  notes: "test",
  ...over,
});

// Quotas only hold for the full case set, so they are checked separately.
const problems = (cases: EvalCase[]): string[] => checkCases(cases, RECORDS).filter((e) => !e.startsWith("quota:"));

const table: Array<[string, EvalCase, RegExp | null]> = [
  ["a consistent case passes", evalCase(), null],
  ["a multi-ayah quote passes", evalCase({ expected: [item({ quote: "ألف باء جيم دال", recordIds: ["quran:1:1", "quran:1:2"] })] }), null],
  ["quote not in the draft", evalCase({ expected: [item({ quote: "ألف  باء" })] }), /not an exact substring/],
  ["quote twice in the draft", evalCase({ draft: "ألف باء ثم ألف باء" }), /occurs 2 times/],
  ["unknown recordId", evalCase({ expected: [item({ recordIds: ["quran:9:999"] })] }), /does not exist in data\/corpus/],
  ["MATCH without a record", evalCase({ expected: [item({ recordIds: [] })] }), /needs at least one recordId/],
  [
    "NOT_FOUND with a record",
    evalCase({ category: "NOT_IN_SOURCES", expected: [item({ status: "NOT_FOUND", reasonCode: "NO_RECORD_IN_COVERED_SOURCES" })] }),
    /must not list recordIds/,
  ],
  ["reason code of another status", evalCase({ expected: [item({ reasonCode: "WORDING_DIFF" })] }), /is not a MATCH code/],
  ["a MIXED case with one item", evalCase({ category: "MIXED", critical: true }), /MIXED expects at least three items/],
  [
    "MATCH on a pending record",
    evalCase({ category: "ORTHOGRAPHIC", expected: [item({ quote: "نص الحديث", kind: "hadith", recordIds: ["muslim:9"] })] }),
    /not reviewed/,
  ],
  [
    "MATCH with one pending record among reviewed ones",
    evalCase({ category: "ORTHOGRAPHIC", expected: [item({ quote: "نص الحديث", kind: "hadith", recordIds: ["bukhari:1", "muslim:9"] })] }),
    /not reviewed: muslim:9/,
  ],
  ["EXACT quote that is not verbatim", evalCase({ expected: [item({ quote: "جيم دال" })] }), /not a verbatim part/],
  [
    "EXACT hadith quote verbatim in the first record passes",
    evalCase({ expected: [item({ quote: "نص الحديث", kind: "hadith", recordIds: ["bukhari:1", "bukhari:2"] })] }),
    null,
  ],
  [
    "EXACT hadith quote verbatim only in a later record",
    evalCase({ expected: [item({ quote: "نص الحديث", kind: "hadith", recordIds: ["bukhari:2", "bukhari:1"] })] }),
    /not a verbatim part/,
  ],
  ["quote with trailing whitespace", evalCase({ expected: [item({ quote: "ألف باء " })] }), /leading or trailing whitespace/],
  ["recordId listed twice", evalCase({ expected: [item({ recordIds: ["quran:1:1", "quran:1:1"] })] }), /lists a recordId twice/],
  [
    "Quran and hadith records mixed",
    evalCase({ category: "ORTHOGRAPHIC", expected: [item({ recordIds: ["quran:1:1", "bukhari:1"] })] }),
    /mixes Quran and other records/,
  ],
  [
    "MATCH with a claim kind",
    evalCase({ category: "ORTHOGRAPHIC", expected: [item({ kind: "interpretive_claim" })] }),
    /MATCH needs kind quran or hadith/,
  ],
  [
    "claim kind with another status than NEEDS_SPECIALIST",
    evalCase({ category: "NOT_IN_SOURCES", expected: [item({ kind: "unclear_attribution", status: "NOT_FOUND", recordIds: [], reasonCode: "NO_RECORD_IN_COVERED_SOURCES" })] }),
    /must be NEEDS_SPECIALIST/,
  ],
  [
    "PERSONAL_RULING without level D",
    evalCase({ category: "AMBIGUOUS", expected: [item({ kind: "interpretive_claim", status: "NEEDS_SPECIALIST", recordIds: [], reasonCode: "PERSONAL_RULING", contentLevel: "C" })] }),
    /PERSONAL_RULING needs contentLevel D/,
  ],
  [
    "INTERPRETIVE_CLAIM without a level",
    evalCase({ category: "AMBIGUOUS", expected: [item({ kind: "interpretive_claim", status: "NEEDS_SPECIALIST", recordIds: [], reasonCode: "INTERPRETIVE_CLAIM" })] }),
    /INTERPRETIVE_CLAIM needs contentLevel C/,
  ],
  [
    "an interpretive claim at level C passes",
    evalCase({ category: "AMBIGUOUS", expected: [item({ kind: "interpretive_claim", status: "NEEDS_SPECIALIST", recordIds: [], reasonCode: "INTERPRETIVE_CLAIM", contentLevel: "C" })] }),
    null,
  ],
  ["AMBIGUOUS without a NEEDS_SPECIALIST item", evalCase({ category: "AMBIGUOUS" }), /at least one NEEDS_SPECIALIST/],
  ["NOT_IN_SOURCES with a MATCH item", evalCase({ category: "NOT_IN_SOURCES" }), /expects NOT_FOUND/],
  [
    "WRONG_REFERENCE with a wording reason",
    evalCase({ category: "WRONG_REFERENCE", critical: true, expected: [item({ status: "DIFFERS", reasonCode: "WORDING_DIFF" })] }),
    /reasonCode does not fit WRONG_REFERENCE/,
  ],
  [
    "WORDING_ERROR with a reference reason",
    evalCase({ category: "WORDING_ERROR", critical: true, expected: [item({ status: "DIFFERS", reasonCode: "REF_MISMATCH_AYAH" })] }),
    /reasonCode does not fit WORDING_ERROR/,
  ],
  ["scope flag together with items", evalCase({ expectScopeMessage: true }), /goes with zero expected items/],
  ["non-consecutive ayat", evalCase({ expected: [item({ recordIds: ["quran:1:1", "quran:1:4"] })] }), /consecutive ayat/],
  ["record kind differs from the claimed kind", evalCase({ expected: [item({ kind: "hadith" })] }), /not of the claimed kind/],
  [
    "KIND_MISMATCH with a record of the claimed kind",
    evalCase({ category: "WRONG_REFERENCE", critical: true, expected: [item({ status: "DIFFERS", reasonCode: "KIND_MISMATCH" })] }),
    /KIND_MISMATCH needs records of another kind/,
  ],
  [
    "KIND_MISMATCH with a record of another kind passes",
    evalCase({ category: "WRONG_REFERENCE", critical: true, expected: [item({ kind: "hadith", status: "DIFFERS", reasonCode: "KIND_MISMATCH" })] }),
    null,
  ],
  ["wrong critical flag", evalCase({ critical: true }), /critical must be false/],
  ["category expects another status", evalCase({ category: "WORDING_ERROR", critical: true }), /expects DIFFERS/],
  ["id prefix of another split", evalCase({ id: "H-001" }), /id prefix/],
  ["zero items without the scope flag", evalCase({ category: "ADVERSARIAL", critical: true, expected: [] }), /expectScopeMessage/],
  ["zero items with the scope flag passes", evalCase({ category: "ADVERSARIAL", critical: true, expected: [], expectScopeMessage: true }), null],
  [
    "overlapping quotes",
    evalCase({ expected: [item({ quote: "ألف باء جيم دال", recordIds: ["quran:1:1", "quran:1:2"] }), item({ quote: "جيم", status: "NEEDS_SPECIALIST", kind: "unclear_attribution", recordIds: [], reasonCode: "UNCLEAR_ATTRIBUTION" })], category: "AMBIGUOUS" }),
    /overlap/,
  ],
];

for (const [name, c, expected] of table) {
  test(`checkCases: ${name}`, () => {
    const errors = problems([c]);
    if (expected === null) assert.deepEqual(errors, []);
    else assert.ok(errors.some((e) => expected.test(e)), `expected ${expected}, got: ${errors.join(" | ") || "no errors"}`);
  });
}

test("checkCases: duplicate ids and a record shared by both splits are reported", () => {
  const errors = problems([evalCase(), evalCase(), evalCase({ id: "H-001", split: "heldout" })]);
  assert.ok(errors.some((e) => /duplicate id/.test(e)));
  assert.ok(errors.some((e) => /used in both splits/.test(e)));
});

test("checkCases: quotas are reported per category and split", () => {
  const errors = checkCases([evalCase()], RECORDS).filter((e) => e.startsWith("quota:"));
  assert.ok(errors.includes("quota: EXACT/tune has 1 case(s), expected 7"));
  assert.ok(errors.includes("quota: ADVERSARIAL/heldout has 0 case(s), expected 5"));
});

test("parseCases: reports bad JSON, schema errors and a wrong split by line", () => {
  const good = JSON.stringify(evalCase());
  const { cases, errors } = parseCases(`${good}\n{bad\n${JSON.stringify({ id: "T-002" })}\n\n`, "heldout", "f.jsonl");
  assert.equal(cases.length, 1);
  assert.ok(errors.some((e) => e.startsWith("f.jsonl:1:") && /split tune/.test(e)));
  assert.ok(errors.includes("f.jsonl:2: not valid JSON"));
  assert.ok(errors.some((e) => e.startsWith("f.jsonl:3:")));
});
