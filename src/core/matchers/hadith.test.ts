// HadithMatcher on small fixture records: plain sentences written for the tests, not hadith text.
// The same rules on the real corpus: src/server/hadith-review.integration.test.ts.
import { describe, expect, test } from "vitest";
import { buildCorpusIndex, createHadithAdapter, createQuranAdapter } from "../corpus";
import { hadith, QURAN_FIXTURE, SPELLING_FIXTURE } from "../corpus/test-fixtures";
import type { ParsedReference, Reference } from "../references";
import { decide } from "../status";
import type { ClaimedKind, QuoteInput } from "../types";
import { evidenceOf, getMatcher, hadithMatcher, inVerseMarks, matchAll, type MatchCandidate } from "./index";

const pending = { reviewStatus: "pending" } as const;
// "alpha" and "beta" stand for two books. What each sentence is there for:
const ALPHA = [
  hadith("alpha", "1", "حَدَّثَنَا فلانٌ قال: خرجنا في سفرٍ طويلٍ، ثم رجعنا إلى المدينة بعد شهر"), // in alpha only
  hadith("alpha", "2", "أخبرنا فلان أن الماء كان قليلا في تلك السنة"), // in alpha twice and in beta
  hadith("alpha", "3", "أخبرنا فلان أن الماء كان قليلا في تلك السنة"),
  hadith("alpha", "4", "سمعت فلانا يقول الصدق نجاة والصدق نجاة لمن لزمه"), // the same words twice in one record
  hadith("alpha", "5", "حدثنا فلان قال الجار قبل الدار والرفيق قبل الطريق"), // reviewed here, pending in beta
  hadith("alpha", "6", "وقال فلان من زرع حصد ومن سار وصل", pending), // pending only
  hadith("alpha", "7", "حدثنا فلان قال الله تعالى يا عبادي كلكم محتاج إلى الهدى"),
];
const BETA = [
  hadith("beta", "10", "حدثنا آخر قال أخبرنا فلان أن الماء كان قليلا في تلك السنة فصبرنا"),
  hadith("beta", "11", "حدثنا آخر قال الجار قبل الدار والرفيق قبل الطريق", pending),
  hadith("beta", null, "حدثنا آخر قال العلم يؤتى ولا يأتي", pending), // no citation number
];
const index = buildCorpusIndex([createQuranAdapter(QURAN_FIXTURE, SPELLING_FIXTURE), createHadithAdapter("alpha", ALPHA), createHadithAdapter("beta", BETA)]);

const OFFSET = 5; // the quote does not start the draft
function quoteOf(text: string, parsed?: ParsedReference, claimedKind: ClaimedKind = "hadith", verseMarks = false): QuoteInput {
  const reference: Reference | undefined = parsed && { raw: "(…)", span: { start: 0, end: 3 }, parsed };
  return { span: { start: OFFSET, end: OFFSET + text.length, text }, claimedKind, reference, verseMarks };
}
const cite = (collections: string[], rest: Partial<Extract<ParsedReference, { type: "hadith" }>> = {}): ParsedReference => ({ type: "hadith", collections, ...rest });
const match = (text: string, parsed?: ParsedReference): MatchCandidate[] => hadithMatcher.match(quoteOf(text, parsed), index);

const check = (c: MatchCandidate): string => (c.reference.result === "mismatch" ? c.reference.reasonCode : c.reference.result);
const checks = (candidates: MatchCandidate[]): string[] => candidates.map((c) => `${c.recordIds[0]} ${check(c)}`);
// The outcome of the status rules for a quote: status/reason [evidence].
function outcome(text: string, parsed?: ParsedReference, claimedKind: ClaimedKind = "hadith", verseMarks = false): string {
  const d = decide({ claimedKind, candidates: matchAll(quoteOf(text, parsed, claimedKind, verseMarks), index) });
  return `${d.status}/${d.reasonCode} [${d.evidence.map((c) => c.recordIds[0]).join(",")}]`;
}

const WATER = "الماء كان قليلا في تلك السنة";
const TRAVEL = "خرجنا في سفر طويل ثم رجعنا إلى المدينة";
const NEIGHBOUR = "الجار قبل الدار والرفيق قبل الطريق";

describe("registration", () => {
  test("the matcher of kind \"hadith\" is registered", () => {
    expect(getMatcher("hadith")).toBe(hadithMatcher);
  });

  test("an index without a hadith collection gives nothing", () => {
    const quranOnly = buildCorpusIndex([createQuranAdapter(QURAN_FIXTURE, SPELLING_FIXTURE)]);
    expect(hadithMatcher.match(quoteOf(WATER), quranOnly)).toEqual([]);
  });

  test("a quote with no word left gives nothing", () => {
    expect(match("«…»")).toEqual([]);
    expect(match("قال رسول الله ﷺ")).toEqual([]);
  });
});

describe("exact hits", () => {
  test("one candidate per record that holds the quote, collections in corpus order", () => {
    const found = match(WATER);
    expect(found.map((c) => c.recordIds)).toEqual([["alpha:2"], ["alpha:3"], ["beta:10"]]);
    for (const c of found) {
      expect([c.kind, c.hit, c.spelling, c.score, c.layer]).toEqual(["hadith", "exact", "same", 1, "default"]);
      expect(c.collection).toBe(c.records[0]!.collection);
      expect(c.ayahRange).toBeUndefined();
      expect(c.claimAdmitted).toBeUndefined();
    }
  });

  test("the chain is searched like the rest of the text", () => {
    expect(match("حدثنا آخر قال أخبرنا فلان").map((c) => c.recordIds[0])).toEqual(["beta:10"]);
  });

  test("the quote twice in one record is one candidate, at its first place", () => {
    const [candidate, ...rest] = match("الصدق نجاة");
    expect(rest).toEqual([]);
    expect(candidate!.recordIds).toEqual(["alpha:4"]);
    const source = candidate!.alignment.source;
    expect(candidate!.records[0]!.exactText.slice(source[0]!.start, source[source.length - 1]!.end)).toBe("الصدق نجاة");
    expect(source[0]!.start).toBe(candidate!.records[0]!.exactText.indexOf("الصدق"));
  });

  test("diacritics, punctuation and a leading attribution formula do not count; display and diff use exactText", () => {
    const text = "قال رسول الله ﷺ: خرجنا في سفر طويل ثم رجعنا";
    const [candidate] = match(text);
    expect(candidate!.recordIds).toEqual(["alpha:1"]);
    expect(candidate!.hit).toBe("exact");
    const { quote, source } = candidate!.alignment;
    expect(text.slice(quote[0]!.start - OFFSET, quote[quote.length - 1]!.end - OFFSET)).toBe("خرجنا في سفر طويل ثم رجعنا");
    expect(candidate!.records[0]!.exactText.slice(source[0]!.start, source[source.length - 1]!.end)).toBe("خرجنا في سفرٍ طويلٍ، ثم رجعنا");
    const [evidence] = evidenceOf(candidate!);
    expect(evidence!.diff!.map((op) => op.op)).toEqual(["equal"]);
    expect(evidence!.record).not.toHaveProperty("searchText");
  });

  test("whole words only", () => {
    expect(match("رجنا في سفر طويل").every((c) => c.hit === "fuzzy")).toBe(true);
  });
});

describe("close candidates", () => {
  test("one changed word: fuzzy, scored by the quote's words, aligned to the stretch of the record", () => {
    const [candidate, ...rest] = match("خرجنا في سفر قصير ثم رجعنا إلى المدينة");
    expect(rest).toEqual([]);
    expect([candidate!.recordIds[0], candidate!.hit, candidate!.spelling]).toEqual(["alpha:1", "fuzzy", "same"]);
    expect(candidate!.score).toBeCloseTo(7 / 8);
    expect(candidate!.alignment.source.map((w) => w.key).join(" ")).toBe("خرجنا في سفر طويل ثم رجعنا الي المدينه");
    expect(evidenceOf(candidate!)[0]!.diff!.map((op) => op.op)).toEqual(["equal", "replace", "equal"]);
    expect(outcome("خرجنا في سفر قصير ثم رجعنا إلى المدينة")).toBe("DIFFERS/WORDING_DIFF [alpha:1]");
  });

  test("the same wording close in two books is one result, best first", () => {
    const found = match("أن الماء كان كثيرا في تلك السنة");
    expect(found.map((c) => c.recordIds[0])).toEqual(["alpha:2", "alpha:3", "beta:10"]);
    expect(new Set(found.map((c) => c.score)).size).toBe(1);
    expect(outcome("أن الماء كان كثيرا في تلك السنة")).toBe("DIFFERS/WORDING_DIFF [alpha:2,alpha:3,beta:10]");
  });

  test("fewer than three words of the quote in a record → not a close candidate", () => {
    // «في سفر» stands in alpha:1: two words of three.
    expect(match("مكثنا في سفر")).toEqual([]);
    expect(outcome("مكثنا في سفر")).toBe("NOT_FOUND/NO_RECORD_IN_COVERED_SOURCES []");
    // Three words of four do count.
    expect(match("مكثنا في سفر طويل").map((c) => `${c.recordIds[0]} ${c.hit} ${c.score}`)).toEqual(["alpha:1 fuzzy 0.75"]);
  });

  test("nothing close → no candidate; a one-word quote has no close candidate", () => {
    expect(match("كلام آخر لا يشبه شيئا مما في السجلات")).toEqual([]);
    expect(match("خرجناا")).toEqual([]);
    expect(outcome("كلام آخر لا يشبه شيئا مما في السجلات")).toBe("NOT_FOUND/NO_RECORD_IN_COVERED_SOURCES []");
  });

  test("a book cited beside the one that holds a close text is not reported as missing", () => {
    expect(checks(match("خرجنا في سفر قصير ثم رجعنا إلى المدينة", cite(["alpha", "beta"])))).toEqual(["alpha:1 unchecked"]);
  });
});

describe("the cited reference", () => {
  test("no reference → none", () => {
    expect(checks(match(TRAVEL))).toEqual(["alpha:1 none"]);
  });

  test("a reference of another kind, or one that was not read → unchecked", () => {
    expect(checks(match(TRAVEL, { type: "quran", surah: 2, ayahStart: 153 }))).toEqual(["alpha:1 unchecked"]);
    expect(checks(match(TRAVEL, { type: "unknown" }))).toEqual(["alpha:1 unchecked"]);
    expect(outcome(TRAVEL, { type: "unknown" })).toBe("NEEDS_SPECIALIST/REF_NOT_CHECKED [alpha:1]");
  });

  test("the cited book holds the record → consistent, and those records come first", () => {
    expect(checks(match(WATER, cite(["beta"])))).toEqual(["beta:10 consistent", "alpha:2 REF_MISMATCH_COLLECTION", "alpha:3 REF_MISMATCH_COLLECTION"]);
    expect(outcome(WATER, cite(["beta"]))).toBe("MATCH/MATCH_REF_OK [beta:10]");
  });

  test("another book → REF_MISMATCH_COLLECTION", () => {
    expect(checks(match(TRAVEL, cite(["beta"])))).toEqual(["alpha:1 REF_MISMATCH_COLLECTION"]);
    expect(outcome(TRAVEL, cite(["beta"]))).toBe("DIFFERS/REF_MISMATCH_COLLECTION [alpha:1]");
  });

  test("a book the tool has no copy of → unchecked, never a wrong reference", () => {
    expect(checks(match(TRAVEL, cite(["gamma"])))).toEqual(["alpha:1 unchecked"]);
    expect(checks(match(TRAVEL, cite(["alpha", "gamma"])))).toEqual(["alpha:1 unchecked"]);
    expect(outcome(TRAVEL, cite(["gamma"]))).toBe("NEEDS_SPECIALIST/REF_NOT_CHECKED [alpha:1]");
  });

  test("a cited number is compared with citation.number", () => {
    expect(checks(match(WATER, cite(["alpha"], { number: "3" })))).toEqual(["alpha:3 consistent", "alpha:2 REF_MISMATCH_NUMBER", "beta:10 REF_MISMATCH_COLLECTION"]);
    expect(checks(match(TRAVEL, cite(["alpha"], { number: "01" })))).toEqual(["alpha:1 consistent"]);
    expect(outcome(WATER, cite(["alpha"], { number: "3" }))).toBe("MATCH/MATCH_REF_OK [alpha:3]");
    // The nearest miss gives the reason: the right book with another number, before another book.
    expect(outcome(WATER, cite(["beta"], { number: "99" }))).toBe("DIFFERS/REF_MISMATCH_NUMBER [beta:10,alpha:2,alpha:3]");
  });

  test("a number cited for a record that has none → unchecked", () => {
    expect(checks(match("العلم يؤتى ولا يأتي", cite(["beta"], { number: "12" })))).toEqual(["beta:x unchecked"]);
  });

  test("several books («متفق عليه»): every one must hold the quote", () => {
    expect(checks(match(WATER, cite(["alpha", "beta"])))).toEqual(["alpha:2 consistent", "alpha:3 consistent", "beta:10 consistent"]);
    expect(outcome(WATER, cite(["alpha", "beta"]))).toBe("MATCH/MATCH_REF_OK [alpha:2,alpha:3,beta:10]");
    expect(checks(match(TRAVEL, cite(["alpha", "beta"])))).toEqual(["alpha:1 REF_NOT_AGREED_UPON"]);
    expect(outcome(TRAVEL, cite(["alpha", "beta"]))).toBe("DIFFERS/REF_NOT_AGREED_UPON [alpha:1]");
  });

  test("several books, each with its number", () => {
    const numbers = { alpha: "2", beta: "10" };
    expect(checks(match(WATER, cite(["alpha", "beta"], { numbers })))).toEqual(["alpha:2 consistent", "beta:10 consistent", "alpha:3 REF_MISMATCH_NUMBER"]);
  });

  test("a partial reference: another book is still another book; otherwise unchecked", () => {
    expect(checks(match(TRAVEL, cite(["beta"], { partial: true })))).toEqual(["alpha:1 REF_MISMATCH_COLLECTION"]);
    expect(checks(match(TRAVEL, cite(["alpha"], { partial: true })))).toEqual(["alpha:1 unchecked"]);
    expect(checks(match(TRAVEL, cite(["alpha", "beta"], { partial: true })))).toEqual(["alpha:1 unchecked"]);
  });
});

describe("pending records and the reference", () => {
  test("a text found only in a pending record → SOURCE_NOT_REVIEWED, with or without a reference", () => {
    const text = "من زرع حصد ومن سار وصل";
    expect(outcome(text)).toBe("NEEDS_SPECIALIST/SOURCE_NOT_REVIEWED [alpha:6]");
    expect(checks(match(text, cite(["alpha"])))).toEqual(["alpha:6 unchecked"]);
    expect(outcome(text, cite(["alpha"]))).toBe("NEEDS_SPECIALIST/SOURCE_NOT_REVIEWED [alpha:6]");
    expect(outcome(text, cite(["beta"]))).toBe("NEEDS_SPECIALIST/SOURCE_NOT_REVIEWED [alpha:6]");
  });

  test("several books, one of them holds the text in a pending record only: neither confirmed nor wrong", () => {
    expect(checks(match(NEIGHBOUR, cite(["alpha", "beta"])))).toEqual(["alpha:5 unchecked", "beta:11 unchecked"]);
    expect(outcome(NEIGHBOUR, cite(["alpha", "beta"]))).toBe("NEEDS_SPECIALIST/REF_NOT_CHECKED [alpha:5]");
  });

  test("the cited book holds the text in a pending record only: not MATCH, and not a wrong book", () => {
    expect(checks(match(NEIGHBOUR, cite(["beta"])))).toEqual(["beta:11 unchecked", "alpha:5 REF_MISMATCH_COLLECTION"]);
    expect(outcome(NEIGHBOUR, cite(["beta"]))).toBe("NEEDS_SPECIALIST/SOURCE_NOT_REVIEWED [beta:11]");
    expect(outcome(NEIGHBOUR, cite(["alpha"]))).toBe("MATCH/MATCH_REF_OK [alpha:5]");
    expect(outcome(NEIGHBOUR)).toBe("MATCH/MATCH_NO_REFERENCE [alpha:5]");
  });
});

describe("kind", () => {
  test("a verse claimed as a hadith is found by the Quran matcher only → KIND_MISMATCH", () => {
    expect(outcome("قل أعوذ برب الفلق")).toBe("DIFFERS/KIND_MISMATCH [quran:113:1]");
  });

  test("a hadith text claimed as a verse inside ﴿…﴾ → KIND_MISMATCH", () => {
    expect(hadithMatcher.match(quoteOf(TRAVEL, undefined, "quran", true), index)[0]!.claimAdmitted).toBeUndefined();
    expect(outcome(TRAVEL, undefined, "quran", true)).toBe("DIFFERS/KIND_MISMATCH [alpha:1]");
  });

  test("hadith qudsi: claimed \"quran\" through a phrase and found only in a hadith record → read as a hadith claim", () => {
    const text = "يا عبادي كلكم محتاج إلى الهدى";
    expect(hadithMatcher.match(quoteOf(text, undefined, "quran"), index)[0]!.claimAdmitted).toBe(true);
    expect(outcome(text, undefined, "quran")).toBe("MATCH/MATCH_NO_REFERENCE [alpha:7]");
    expect(outcome(text, cite(["alpha"], { number: "7" }), "quran")).toBe("MATCH/MATCH_REF_OK [alpha:7]");
    expect(outcome(text, cite(["beta"]), "quran")).toBe("DIFFERS/REF_MISMATCH_COLLECTION [alpha:7]");
    expect(outcome(text, undefined, "quran", true)).toBe("DIFFERS/KIND_MISMATCH [alpha:7]");
  });

  test("a verse after such a phrase is still answered by the Quran record alone", () => {
    const both = buildCorpusIndex([createQuranAdapter(QURAN_FIXTURE, SPELLING_FIXTURE), createHadithAdapter("alpha", [hadith("alpha", "1", "حدثنا فلان أنه قرأ قل أعوذ برب الفلق")])]);
    const d = decide({ claimedKind: "quran", candidates: matchAll(quoteOf("قل أعوذ برب الفلق", undefined, "quran"), both) });
    expect([d.status, d.reasonCode, d.evidence.map((c) => c.recordIds[0])]).toEqual(["MATCH", "MATCH_NO_REFERENCE", ["quran:113:1"]]);
  });
});

describe("inVerseMarks", () => {
  test.each([
    ["﴿نص﴾", true],
    ["﴿ نص ﴾", true],
    ["«نص»", false],
    ["﴿نص»", false],
    ["نص", false],
  ])("%s → %s", (draft, expected) => {
    const start = draft.indexOf("نص");
    expect(inVerseMarks(draft, { start, end: start + 2 })).toBe(expected);
  });
});

describe("the matcher adds no grade", () => {
  test("a record's grade reaches the evidence as it is, and a record without one gets none", () => {
    const grade = { text: "درجة", by: "كتاب", sourceRef: "كتاب، رقم 1" };
    const graded = buildCorpusIndex([createHadithAdapter("alpha", [hadith("alpha", "1", "حدثنا فلان قال نص له درجة في السجل", { grade }), hadith("alpha", "2", "حدثنا فلان قال نص بلا درجة في السجل")])]);
    const evidence = (text: string) => evidenceOf(hadithMatcher.match(quoteOf(text), graded)[0]!)[0]!.record;
    expect(evidence("نص له درجة في السجل").grade).toEqual(grade);
    expect(evidence("نص بلا درجة في السجل")).not.toHaveProperty("grade");
  });
});
