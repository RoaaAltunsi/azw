import { describe, expect, test } from "vitest";
import { normalizeWithMap } from "../normalize";
import { DiffOpSchema, type DiffOp } from "../types";
import { alignTokens, wordDiff, wordsOf, type SourceWord, type Word } from "./index";

const words = (text: string): string[] => text.split(" ").filter((w) => w !== "");

describe("alignTokens", () => {
  test("global: equal sequences pair word by word", () => {
    const a = alignTokens(words("a b c"), words("a b c"), "global");
    expect(a.pairs).toEqual([[0, 0], [1, 1], [2, 2]]);
    expect(a.matched).toBe(3);
  });

  test.each<[string, string, string, Array<[number | null, number | null]>, number]>([
    ["a word only in a", "a x b", "a b", [[0, 0], [1, null], [2, 1]], 2],
    ["a word only in b", "a b", "a x b", [[0, 0], [null, 1], [1, 2]], 2],
    ["a different word", "a x c", "a b c", [[0, 0], [1, 1], [2, 2]], 2],
    ["a word after the end of b", "a b x", "a b", [[0, 0], [1, 1], [2, null]], 2],
    ["a word before the start of b", "x a b", "a b", [[0, null], [1, 0], [2, 1]], 2],
    ["nothing in b", "a b", "", [[0, null], [1, null]], 0],
    ["nothing in a", "", "a", [[null, 0]], 0],
  ])("global: %s", (_name, a, b, pairs, matched) => {
    const result = alignTokens(words(a), words(b), "global");
    expect(result.pairs).toEqual(pairs);
    expect(result.matched).toBe(matched);
    expect([result.aStart, result.aEnd, result.bStart, result.bEnd]).toEqual([0, words(a).length, 0, words(b).length]);
  });

  test("local: finds the stretch of b the sequence stands in", () => {
    const result = alignTokens(words("c d e"), words("a b c d e f g"), "local");
    expect([result.bStart, result.bEnd]).toEqual([2, 5]);
    expect([result.aStart, result.aEnd]).toEqual([0, 3]);
    expect(result.matched).toBe(3);
  });

  test("local: a missing word and a different word stay inside the stretch", () => {
    const missing = alignTokens(words("b c e f"), words("a b c d e f g"), "local");
    expect([missing.bStart, missing.bEnd, missing.matched]).toEqual([1, 6, 4]);
    const different = alignTokens(words("b c x e f"), words("a b c d e f g"), "local");
    expect([different.bStart, different.bEnd, different.matched]).toEqual([1, 6, 4]);
  });

  test("local: words that match nothing at either end are left out of the stretch", () => {
    const result = alignTokens(words("x b c y"), words("a b c d"), "local");
    expect([result.aStart, result.aEnd, result.bStart, result.bEnd, result.matched]).toEqual([1, 3, 1, 3, 2]);
  });

  test("local: no common word gives an empty stretch", () => {
    const result = alignTokens(words("x y"), words("a b"), "local");
    expect(result.pairs).toEqual([]);
    expect(result.matched).toBe(0);
  });

  test("local: the first of two equal stretches wins, on every run", () => {
    const result = alignTokens(words("a b"), words("a b x a b"), "local");
    expect([result.bStart, result.bEnd]).toEqual([0, 2]);
  });
});

describe("wordsOf", () => {
  test("each word carries its range in the original, diacritics included", () => {
    const text = "قَالَ: «إِنَّمَا الْأَعْمَالُ»";
    const found = wordsOf(normalizeWithMap(text, "search"), text);
    expect(found.map((w) => w.key)).toEqual(["قال", "انما", "الاعمال"]);
    expect(found.map((w) => text.slice(w.start, w.end))).toEqual(["قَالَ", "إِنَّمَا", "الْأَعْمَالُ"]);
  });

  test("`from` skips the start of the normalized text and `offset` shifts the ranges", () => {
    const text = "قال تعالى: إن الله";
    const normalized = normalizeWithMap(text, "search");
    const draft = `xx${text}`;
    const found = wordsOf(normalized, text, "قال تعالي ".length, 2);
    expect(found.map((w) => draft.slice(w.start, w.end))).toEqual(["إن", "الله"]);
  });

  test("an empty text has no words", () => {
    expect(wordsOf(normalizeWithMap("﴿﴾", "search"), "﴿﴾")).toEqual([]);
  });
});

// Words of a plain text, split on spaces, with their ranges.
function plain(text: string): Word[] {
  return [...text.matchAll(/\S+/g)].map((m) => ({ key: m[0], start: m.index, end: m.index + m[0].length }));
}
const sourceOf = (recordId: string, text: string): SourceWord[] => plain(text).map((w) => ({ ...w, recordId }));

// The ops as readable strings: op[draft text]{source text}.
function render(ops: DiffOp[], quote: string, sources: Record<string, string>): string[] {
  return ops.map(
    (o) =>
      o.op +
      (o.draft ? `[${quote.slice(o.draft.start, o.draft.end)}]` : "") +
      (o.source ? `{${sources[o.source.recordId]!.slice(o.source.start, o.source.end)}}` : ""),
  );
}

describe("wordDiff", () => {
  const source = "a b c d e";
  const cases: Array<[string, string, string[]]> = [
    ["the same words", "a b c d e", ["equal[a b c d e]{a b c d e}"]],
    ["a word removed", "a b d e", ["equal[a b]{a b}", "delete{c}", "equal[d e]{d e}"]],
    ["a word added", "a b x c d e", ["equal[a b]{a b}", "insert[x]", "equal[c d e]{c d e}"]],
    ["a word changed", "a b x d e", ["equal[a b]{a b}", "replace[x]{c}", "equal[d e]{d e}"]],
    ["two words changed in a row are one op", "a x y d e", ["equal[a]{a}", "replace[x y]{b c}", "equal[d e]{d e}"]],
    ["a word added at the end", "a b c d e x", ["equal[a b c d e]{a b c d e}", "insert[x]"]],
  ];
  test.each(cases)("%s", (_name, quote, expected) => {
    const ops = wordDiff({ quote: plain(quote), source: sourceOf("r:1", source) });
    expect(render(ops, quote, { "r:1": source })).toEqual(expected);
    for (const op of ops) expect(DiffOpSchema.safeParse(op).success).toBe(true);
  });

  test("an op never crosses from one record into the next", () => {
    const quote = "a b c d";
    const ops = wordDiff({ quote: plain(quote), source: [...sourceOf("r:1", "a b"), ...sourceOf("r:2", "c d")] });
    expect(render(ops, quote, { "r:1": "a b", "r:2": "c d" })).toEqual(["equal[a b]{a b}", "equal[c d]{c d}"]);
    expect(ops.map((o) => o.source?.recordId)).toEqual(["r:1", "r:2"]);
  });

  test("words are compared by key, and the ranges point at the original texts", () => {
    const quote = "إنما الأعمال بالنية";
    const exactText = "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ";
    const quoteWords = wordsOf(normalizeWithMap(quote, "search"), quote, 0, 100);
    const sourceWords = wordsOf(normalizeWithMap(exactText, "search"), exactText).map((w) => ({ ...w, recordId: "r:1" }));
    const ops = wordDiff({ quote: quoteWords, source: sourceWords });
    expect(ops).toEqual([
      { op: "equal", draft: { start: 100, end: 112 }, source: { recordId: "r:1", start: 0, end: exactText.indexOf(" بِ") } },
      { op: "replace", draft: { start: 113, end: 119 }, source: { recordId: "r:1", start: exactText.indexOf("بِ"), end: exactText.length } },
    ]);
  });
});
