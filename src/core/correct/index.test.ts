// Table-driven: one row per branch of correctionOf(). The candidate and its diff are hand-made,
// so that each row states exactly what the matcher and the status rules reported. The same rules
// through the whole pipeline are tested in src/core/review.test.ts and on the real corpus in
// src/server/corrections.integration.test.ts.
import { describe, expect, test } from "vitest";
import { hadith } from "../corpus/test-fixtures";
import type { MatchCandidate, ReferenceCheck } from "../matchers";
import type { Reference } from "../references";
import type { ReasonCode } from "../status";
import { toApiRecord, type Correction, type DiffOp, type ReviewItem } from "../types";
import { correctionOf, dropSharedCorrections, type CorrectionInput } from "./index";

// Test data, not source text.
const SOURCE = "حدثنا فلان قال خرجنا في سفر طويل ثم رجعنا";
const RECORD = hadith("alpha", "1", SOURCE);
//             0         1         2         3
//             0123456789012345678901234567890123456789
const DRAFT = "قال: «خرجنا في سفر قصير ثم رجعنا» (alpha).";
const at = (text: string, part: string): { start: number; end: number } => ({ start: text.indexOf(part), end: text.indexOf(part) + part.length });
const src = (part: string) => ({ recordId: RECORD.id, ...at(SOURCE, part) });

// «قصير» in the draft stands where the source has «طويل».
const DIFF: DiffOp[] = [
  { op: "equal", draft: at(DRAFT, "خرجنا في سفر"), source: src("خرجنا في سفر") },
  { op: "replace", draft: at(DRAFT, "قصير"), source: src("طويل") },
  { op: "equal", draft: at(DRAFT, "ثم رجعنا"), source: src("ثم رجعنا") },
];

const candidate = (overrides: Partial<MatchCandidate> = {}): MatchCandidate => ({
  kind: "hadith",
  collection: "alpha",
  recordIds: [RECORD.id],
  records: [RECORD],
  score: 0.85,
  layer: "default",
  hit: "fuzzy",
  spelling: "same",
  reference: { result: "none" },
  alignment: { quote: [], source: [] },
  ...overrides,
});

const input = (overrides: Partial<CorrectionInput> = {}): CorrectionInput => ({
  draft: DRAFT,
  claimedKind: "hadith",
  decision: { status: "DIFFERS", reasonCode: "WORDING_DIFF" },
  candidate: candidate(),
  diff: DIFF,
  ...overrides,
});

const WORDING: Correction = { target: "wording", draft: at(DRAFT, "خرجنا في سفر قصير ثم رجعنا"), text: "خرجنا في سفر طويل ثم رجعنا" };

describe("a wording correction", () => {
  test("the stretch of exactText the quote was aligned to, in place of the quote's words", () => {
    const correction = correctionOf(input());
    expect(correction).toEqual(WORDING);
    expect(SOURCE).toContain(correction!.text);
    // The quotation marks and everything else of the draft lie outside the range.
    expect(DRAFT.slice(0, correction!.draft.start)).toBe("قال: «");
    expect(DRAFT.slice(correction!.draft.end)).toBe("» (alpha).");
  });

  const checks: Array<[string, ReferenceCheck, boolean]> = [
    ["no reference", { result: "none" }, true],
    ["a reference that agrees with the record", { result: "consistent" }, true],
    ["a reference that names the very place", { result: "consistent", place: true }, true],
    ["a reference that could not be compared", { result: "unchecked" }, false],
    ["a reference to another book", { result: "mismatch", reasonCode: "REF_MISMATCH_COLLECTION" }, false],
    ["a reference to another ayah", { result: "mismatch", reasonCode: "REF_MISMATCH_AYAH" }, false],
  ];
  test.each(checks)("%s", (_name, reference, offered) => {
    expect(correctionOf(input({ candidate: candidate({ reference }) })) !== undefined).toBe(offered);
  });

  test("a text of another kind than the draft claims is not put under that claim", () => {
    expect(correctionOf(input({ claimedKind: "quran" }))).toBeUndefined();
    // Unless the claim's wording is also a way of citing this kind (hadith qudsi).
    expect(correctionOf(input({ claimedKind: "quran", candidate: candidate({ claimAdmitted: true }) }))).toEqual(WORDING);
  });

  const extra = at(DRAFT, "قصير");
  const edges: Array<[string, DiffOp[]]> = [
    ["a word only the draft has at the end", [DIFF[0]!, { op: "insert", draft: extra }]],
    ["a word only the draft has at the start", [{ op: "insert", draft: extra }, DIFF[2]!]],
    ["a word only the source has at the start", [{ op: "delete", source: src("قال") }, ...DIFF]],
    ["a word only the source has at the end", [...DIFF, { op: "delete", source: src("رجعنا") }]],
    ["no diff at all", []],
  ];
  test.each(edges)("nothing is offered: %s", (_name, diff) => {
    expect(correctionOf(input({ diff }))).toBeUndefined();
  });

  test("words only one side has inside the quote are corrected with the rest", () => {
    const draft = "«خرجنا في سفر ثم ثم رجعنا»";
    const diff: DiffOp[] = [
      { op: "equal", draft: at(draft, "خرجنا في سفر"), source: src("خرجنا في سفر") },
      { op: "delete", source: src("طويل") },
      { op: "equal", draft: at(draft, "ثم"), source: src("ثم") },
      { op: "insert", draft: { start: 17, end: 19 } },
      { op: "equal", draft: at(draft, "رجعنا"), source: src("رجعنا") },
    ];
    expect(correctionOf(input({ draft, diff }))).toEqual({ target: "wording", draft: { start: 1, end: 25 }, text: "خرجنا في سفر طويل ثم رجعنا" });
  });

  test("a replace at an edge is corrected: the source has a word in that place", () => {
    const diff: DiffOp[] = [{ op: "replace", draft: at(DRAFT, "خرجنا"), source: src("خرجنا") }, { op: "equal", draft: at(DRAFT, "في سفر"), source: src("في سفر") }];
    expect(correctionOf(input({ diff }))).toBeUndefined(); // the same letters: nothing would change
    const other: DiffOp[] = [{ op: "replace", draft: at(DRAFT, "قصير"), source: src("طويل") }, DIFF[2]!];
    expect(correctionOf(input({ diff: other }))).toEqual({ target: "wording", draft: at(DRAFT, "قصير ثم رجعنا"), text: "طويل ثم رجعنا" });
  });

  test("an occurrence over several records has no single stretch", () => {
    const second = hadith("alpha", "2", "نص آخر");
    expect(correctionOf(input({ candidate: candidate({ recordIds: [RECORD.id, second.id], records: [RECORD, second] }) }))).toBeUndefined();
  });
});

describe("a reference correction", () => {
  const reference = (raw: string): Reference => ({ raw, span: { start: 100, end: 100 + raw.length }, parsed: { type: "quran", surah: 2, ayahStart: 7 } });
  const exact = (code: "REF_MISMATCH_AYAH" | "REF_MISMATCH_SURAH" | "REF_MISMATCH_NUMBER" | "REF_MISMATCH_COLLECTION" | "REF_NOT_AGREED_UPON" = "REF_MISMATCH_AYAH") =>
    candidate({ hit: "exact", score: 1, reference: { result: "mismatch", reasonCode: code } });
  const refInput = (raw: string, code: ReasonCode = "REF_MISMATCH_AYAH", overrides: Partial<CorrectionInput> = {}): CorrectionInput =>
    input({ decision: { status: "DIFFERS", reasonCode: code }, candidate: exact(), diff: [], reference: reference(raw), ...overrides });

  const CITATION = RECORD.citation.display;
  const forms: Array<[string, string]> = [
    ["[البقرة: 7]", `[${CITATION}]`],
    ["(سورة البقرة: 7)", `(${CITATION})`],
    ["سورة البقرة آية 7", CITATION],
    ["[البقرة: 7", CITATION], // an unclosed bracket is not a pair
  ];
  test.each(forms)("%s → %s: the record's citation, inside the writer's own brackets", (raw, text) => {
    expect(correctionOf(refInput(raw))).toEqual({ target: "reference", draft: { start: 100, end: 100 + raw.length }, text });
  });

  test("a wrong surah is corrected like a wrong ayah", () => {
    const wrongSurah = refInput("[البقرة: 7]", "REF_MISMATCH_SURAH", { candidate: exact("REF_MISMATCH_SURAH") });
    expect(correctionOf(wrongSurah)?.text).toBe(`[${CITATION}]`);
  });

  // Their own sentences say the cited reference may still be right.
  test.each(["REF_MISMATCH_NUMBER", "REF_MISMATCH_COLLECTION", "REF_NOT_AGREED_UPON"] as const)("nothing is offered for %s", (code) => {
    expect(correctionOf(refInput("(alpha 9)", code, { candidate: exact(code) }))).toBeUndefined();
    // Nor for an occurrence with that check under an item whose first occurrence is correctable.
    expect(correctionOf(refInput("(alpha 9)", "REF_MISMATCH_AYAH", { candidate: exact(code) }))).toBeUndefined();
  });

  test("nothing is offered without a reference in the draft, or when it already reads as the citation", () => {
    expect(correctionOf(refInput("[البقرة: 7]", "REF_MISMATCH_AYAH", { reference: undefined }))).toBeUndefined();
    expect(correctionOf(refInput(`[${CITATION}]`))).toBeUndefined();
  });

  test("an occurrence over several records has no single citation", () => {
    const second = hadith("alpha", "2", "نص آخر");
    const two = { ...exact(), recordIds: [RECORD.id, second.id], records: [RECORD, second] };
    expect(correctionOf(refInput("[البقرة: 7]", "REF_MISMATCH_AYAH", { candidate: two }))).toBeUndefined();
  });
});

describe("no correction outside DIFFERS", () => {
  const others: Array<[CorrectionInput["decision"]["status"], ReasonCode]> = [
    ["MATCH", "MATCH_REF_OK"],
    ["MATCH", "MATCH_NO_REFERENCE"],
    ["DIFFERS", "KIND_MISMATCH"],
    ["NOT_FOUND", "NO_RECORD_IN_COVERED_SOURCES"],
    ["NEEDS_SPECIALIST", "LOW_CONFIDENCE_MATCH"],
    ["NEEDS_SPECIALIST", "AMBIGUOUS_CANDIDATES"],
    ["NEEDS_SPECIALIST", "SOURCE_NOT_REVIEWED"],
    ["NEEDS_SPECIALIST", "REF_NOT_CHECKED"],
  ];
  test.each(others)("%s / %s", (status, reasonCode) => {
    expect(correctionOf(input({ decision: { status, reasonCode } }))).toBeUndefined();
  });

  test("a status the code does not belong to is not trusted", () => {
    expect(correctionOf(input({ decision: { status: "NEEDS_SPECIALIST", reasonCode: "WORDING_DIFF" } }))).toBeUndefined();
  });
});

describe("dropSharedCorrections", () => {
  const item = (start: number, end: number, correction?: Correction): ReviewItem => ({
    id: `item-${start}-${end}`,
    span: { start, end, text: "x".repeat(end - start) },
    claimedKind: "quran",
    status: "DIFFERS",
    contentLevel: "A",
    reasonCode: "REF_MISMATCH_AYAH",
    reasonAr: "جملة",
    evidence: [
      { record: toApiRecord(RECORD), score: 1, ...(correction ? { correction } : {}) },
      { record: toApiRecord(RECORD), score: 1 },
    ],
    extractedBy: ["regex"],
  });
  const ref = (start: number, end: number): Correction => ({ target: "reference", draft: { start, end }, text: "[مرجع]" });
  const corrections = (items: ReviewItem[]) => items.map((i) => i.evidence.map((e) => e.correction?.draft.start ?? null));

  test("corrections that touch different parts of the draft are kept, and the items are the same objects", () => {
    const items = [item(0, 10, ref(12, 20)), item(30, 40, ref(42, 50)), item(60, 70)];
    const kept = dropSharedCorrections(items);
    expect(corrections(kept)).toEqual([[12, null], [42, null], [null, null]]);
    expect(kept.every((k, i) => k === items[i])).toBe(true);
  });

  test("one reference cited for two quotes: neither item may change it", () => {
    const kept = dropSharedCorrections([item(0, 10, ref(25, 35)), item(12, 22, ref(25, 35)), item(60, 70, ref(72, 80))]);
    expect(corrections(kept)).toEqual([[null, null], [null, null], [72, null]]);
    // Nothing else of the items changes.
    expect(kept[0]!.evidence).toHaveLength(2);
    expect(kept[0]!.evidence[0]).not.toHaveProperty("correction");
  });

  test("a correction that reaches into another item's quote is dropped; the other keeps its own", () => {
    const kept = dropSharedCorrections([item(0, 10, ref(35, 45)), item(30, 50, { target: "wording", draft: { start: 52, end: 55 }, text: "نص" })]);
    expect(corrections(kept)).toEqual([[null, null], [52, null]]);
  });

  test("ranges that only touch do not overlap", () => {
    expect(corrections(dropSharedCorrections([item(0, 10, ref(10, 20)), item(20, 30)]))).toEqual([[10, null], [null, null]]);
  });
});
