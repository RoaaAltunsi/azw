import { describe, expect, test } from "vitest";
import type { Correction, ReviewItem } from "@/core/types";
import { appliedCorrection, appliedCount, draftPieces, openItems, revisedDraft, type Applied } from "./revised-draft";
import { AYAH_153, evidence, item } from "./test-fixtures";

test("draftPieces: every span marked once, in draft order, the text whole", () => {
  const draft = "قال: ﴿أ ب﴾ ثم «ج د» انتهى";
  const a = item({ span: { start: 6, end: 9, text: "أ ب" } });
  const b = item({ span: { start: 15, end: 18, text: "ج د" }, status: "NOT_FOUND" });
  const pieces = draftPieces(draft, [b, a]);
  expect(pieces.map((p) => p.text).join("")).toBe(draft);
  // `index` is the place in the result, not in the draft.
  expect(pieces.filter((p) => p.item).map((p) => [p.text, p.index])).toEqual([
    ["أ ب", 2],
    ["ج د", 1],
  ]);
  expect(pieces.some((p) => p.corrected)).toBe(false);
});

test("draftPieces: a span outside the draft or over an earlier one is left unmarked", () => {
  const draft = "0123456789";
  const pieces = draftPieces(draft, [
    item({ span: { start: 2, end: 6, text: "2345" } }),
    item({ span: { start: 4, end: 8, text: "4567" } }),
    item({ span: { start: 8, end: 40, text: "89" } }),
  ]);
  expect(pieces.map((p) => p.text).join("")).toBe(draft);
  expect(pieces.filter((p) => p.item).map((p) => p.text)).toEqual(["2345"]);
});

// A post as a writer pastes it: an emoji, a line break, a hashtag, quotation marks around the whole.
const DRAFT = "“تذكير 🌿\nقال تعالى: «إن الله مع الشاكرين» [البقرة: 154].\nوقال: ﴿قل هو الله أحد﴾ (الفلق: 1)\n#تذكير”";
const at = (part: string) => ({ start: DRAFT.indexOf(part), end: DRAFT.indexOf(part) + part.length });
const span = (part: string) => ({ ...at(part), text: part });

const SOURCE_STRETCH = AYAH_153.slice(AYAH_153.indexOf("إِنَّ"));
const wording: Correction = { target: "wording", draft: at("إن الله مع الشاكرين"), text: SOURCE_STRETCH };
const reference: Correction = { target: "reference", draft: at("(الفلق: 1)"), text: "(سورة الإخلاص، الآية 1)" };
const otherPlace: Correction = { target: "reference", draft: at("(الفلق: 1)"), text: "(موضع آخر)" };

const first = item({
  span: span("إن الله مع الشاكرين"),
  status: "DIFFERS",
  reasonCode: "WORDING_DIFF",
  evidence: [evidence({ id: "quran:2:153", correction: wording })],
});
const second = item({
  span: span("قل هو الله أحد"),
  status: "DIFFERS",
  reasonCode: "REF_MISMATCH_SURAH",
  evidence: [
    evidence({ id: "quran:112:1", display: "سورة الإخلاص، الآية 1", correction: reference }),
    evidence({ id: "other:1", display: "موضع آخر", correction: otherPlace }),
    evidence({ id: "bare:1" }),
  ],
});
const items = [first, second];

describe("nothing applied", () => {
  test("the revised draft is the draft, character for character", () => {
    expect(revisedDraft(DRAFT, items)).toBe(DRAFT);
    expect(revisedDraft(DRAFT, items, {})).toBe(DRAFT);
    expect(appliedCount(DRAFT, items, {})).toBe(0);
  });

  test("an id that names no item, no record, or a record without a correction applies nothing", () => {
    const stray: Applied[] = [{ "no-such-item": "quran:2:153" }, { [first.id]: "no-such-record" }, { [second.id]: "bare:1" }];
    for (const applied of stray) {
      expect(revisedDraft(DRAFT, items, applied)).toBe(DRAFT);
      expect(appliedCount(DRAFT, items, applied)).toBe(0);
    }
    // A name every object has is not an applied correction.
    expect(appliedCorrection(first, { constructor: "x" } as Applied)).toBeUndefined();
  });
});

describe("a wording correction", () => {
  const applied: Applied = { [first.id]: "quran:2:153" };

  test("the source's stretch stands in place of the quote's words, and nothing else changes", () => {
    const revised = revisedDraft(DRAFT, items, applied);
    expect(revised).toBe(DRAFT.replace("إن الله مع الشاكرين", SOURCE_STRETCH));
    const { start, end } = wording.draft;
    expect(revised.slice(0, start)).toBe(DRAFT.slice(0, start));
    expect(revised.slice(start + SOURCE_STRETCH.length)).toBe(DRAFT.slice(end));
    // The writer's marks around the quote, the emoji, the line breaks and the hashtag are kept.
    expect(revised).toContain(`«${SOURCE_STRETCH}» [البقرة: 154]`);
    expect(revised.startsWith("“تذكير 🌿\n")).toBe(true);
    expect(revised.endsWith("\n#تذكير”")).toBe(true);
  });

  test("the piece is marked as corrected and belongs to its item", () => {
    const corrected = draftPieces(DRAFT, items, applied).filter((p) => p.corrected);
    expect(corrected).toEqual([{ text: SOURCE_STRETCH, item: first, index: 1, corrected: true }]);
    expect(appliedCount(DRAFT, items, applied)).toBe(1);
  });

  test("a correction of part of the span leaves the rest of the span as written, still marked", () => {
    const inner: Correction = { target: "wording", draft: at("الله مع الشاكرين"), text: "X" };
    const partly = item({ ...first, evidence: [evidence({ id: "r", correction: inner })] });
    const pieces = draftPieces(DRAFT, [partly], { [partly.id]: "r" }).filter((p) => p.item);
    expect(pieces.map((p) => [p.text, p.corrected ?? false])).toEqual([
      ["إن ", false],
      ["X", true],
    ]);
  });
});

describe("a reference correction", () => {
  test("the source's citation stands in place of the cited reference; the quote is not touched", () => {
    const revised = revisedDraft(DRAFT, items, { [second.id]: "quran:112:1" });
    expect(revised).toBe(DRAFT.replace("(الفلق: 1)", "(سورة الإخلاص، الآية 1)"));
    expect(revised).toContain("﴿قل هو الله أحد﴾ (سورة الإخلاص، الآية 1)\n#تذكير”");
  });

  test("the quote keeps its status mark, and the reference is a corrected piece of the same item", () => {
    const pieces = draftPieces(DRAFT, items, { [second.id]: "quran:112:1" }).filter((p) => p.item === second);
    expect(pieces).toEqual([
      { text: "قل هو الله أحد", item: second, index: 2 },
      { text: "(سورة الإخلاص، الآية 1)", item: second, index: 2, corrected: true },
    ]);
  });

  test("the place the writer chose is the one applied, and only one per item", () => {
    expect(revisedDraft(DRAFT, items, { [second.id]: "other:1" })).toBe(DRAFT.replace("(الفلق: 1)", "(موضع آخر)"));
    expect(appliedCorrection(second, { [second.id]: "other:1" })).toBe(otherPlace);
  });

  test("a reference that stands before its quote", () => {
    const draft = "في سورة البقرة آية 154: ﴿نقل﴾";
    const before: Correction = { target: "reference", draft: { start: 3, end: 22 }, text: "سورة البقرة، الآية 153" };
    const quote = item({ span: { start: 25, end: 28, text: "نقل" }, status: "DIFFERS", evidence: [evidence({ id: "r", correction: before })] });
    expect(draft.slice(3, 22)).toBe("سورة البقرة آية 154");
    expect(revisedDraft(draft, [quote], { [quote.id]: "r" })).toBe("في سورة البقرة، الآية 153: ﴿نقل﴾");
  });
});

describe("several corrections", () => {
  const both: Applied = { [first.id]: "quran:2:153", [second.id]: "quran:112:1" };

  test("both are applied, each in its place, whatever the order of the items", () => {
    const expected = DRAFT.replace("إن الله مع الشاكرين", SOURCE_STRETCH).replace("(الفلق: 1)", "(سورة الإخلاص، الآية 1)");
    expect(revisedDraft(DRAFT, items, both)).toBe(expected);
    expect(revisedDraft(DRAFT, [second, first], both)).toBe(expected);
    expect(appliedCount(DRAFT, items, both)).toBe(2);
  });

  test("undoing one leaves the other", () => {
    const rest = Object.fromEntries(Object.entries(both).filter(([id]) => id !== first.id));
    expect(revisedDraft(DRAFT, items, rest)).toBe(DRAFT.replace("(الفلق: 1)", "(سورة الإخلاص، الآية 1)"));
  });

  test("the pieces always add up to the revised draft", () => {
    for (const applied of [{}, { [first.id]: "quran:2:153" }, { [second.id]: "other:1" }, both]) {
      const pieces = draftPieces(DRAFT, items, applied);
      expect(pieces.map((p) => p.text).join("")).toBe(revisedDraft(DRAFT, items, applied));
      expect(pieces.every((p) => p.text !== "")).toBe(true);
    }
  });
});

describe("a correction the draft cannot take is not applied", () => {
  const bad = (draft: Correction["draft"]): ReviewItem =>
    item({ span: { start: 2, end: 6, text: "2345" }, status: "DIFFERS", evidence: [evidence({ id: "r", correction: { target: "reference", draft, text: "X" } })] });

  test("a range beyond the end of the draft", () => {
    const outside = bad({ start: 8, end: 40 });
    expect(revisedDraft("0123456789", [outside], { [outside.id]: "r" })).toBe("0123456789");
    expect(appliedCount("0123456789", [outside], { [outside.id]: "r" })).toBe(0);
  });

  test("a range over another item's span", () => {
    const other = item({ span: { start: 7, end: 9, text: "78" } });
    const reaching = bad({ start: 8, end: 10 });
    expect(revisedDraft("0123456789", [reaching, other], { [reaching.id]: "r" })).toBe("0123456789");
  });
});

test("openItems: what the revised draft still holds as the tool found it", () => {
  const match = item({ span: { start: 0, end: 1, text: "أ" }, status: "MATCH" });
  const notFound = item({ span: { start: 2, end: 3, text: "ب" }, status: "NOT_FOUND" });
  const all = [...items, match, notFound];
  expect(openItems(all, {})).toBe(3);
  expect(openItems(all, { [first.id]: "quran:2:153" })).toBe(2);
  expect(openItems(all, { [first.id]: "quran:2:153", [second.id]: "quran:112:1" })).toBe(1);
  // A record without a correction changes nothing in the draft, so the item stays open.
  expect(openItems(all, { [second.id]: "bare:1" })).toBe(3);
  expect(openItems([match], {})).toBe(0);
});
