import { expect, test } from "vitest";
import { alignedSourceSegments, cut, draftSegments, hasDifference, sourceSegments } from "./segments";
import { evidence } from "./test-fixtures";

const joined = (segments: ReadonlyArray<{ text: string }>) => segments.map((s) => s.text).join("");

test("cut: the pieces add up to the text, marked where a range lies", () => {
  const segments = cut("abcdefghij", 0, 10, [
    { start: 2, end: 4, mark: "equal" },
    { start: 6, end: 8, mark: "replace" },
  ]);
  expect(segments).toEqual([
    { text: "ab" },
    { text: "cd", mark: "equal" },
    { text: "ef" },
    { text: "gh", mark: "replace" },
    { text: "ij" },
  ]);
});

test("cut: ranges out of order, overlapping or out of bounds never repeat or lose text", () => {
  const segments = cut("abcdefghij", 1, 9, [
    { start: 5, end: 50, mark: "delete" },
    { start: -3, end: 3, mark: "equal" },
    { start: 2, end: 6, mark: "replace" },
  ]);
  expect(joined(segments)).toBe("bcdefghi");
  expect(segments).toEqual([
    { text: "bc", mark: "equal" },
    { text: "def", mark: "replace" },
    { text: "ghi", mark: "delete" },
  ]);
});

test("draftSegments: op offsets are in the draft, the pieces are of the span", () => {
  const span = { start: 10, end: 21, text: "one two six" };
  const entries = [
    evidence({
      id: "a",
      diff: [
        { op: "equal", draft: { start: 10, end: 17 }, source: { recordId: "a", start: 0, end: 7 } },
        { op: "delete", source: { recordId: "a", start: 8, end: 13 } },
        { op: "replace", draft: { start: 18, end: 21 }, source: { recordId: "a", start: 14, end: 18 } },
      ],
    }),
  ];
  expect(draftSegments(span, entries)).toEqual([
    { text: "one two", mark: "equal" },
    { text: " " },
    { text: "six", mark: "replace" },
  ]);
  expect(hasDifference(entries)).toBe(true);
  // No evidence: the quote as written, unmarked.
  expect(draftSegments(span, [])).toEqual([{ text: "one two six" }]);
});

test("a quote over two records: one draft text, each record marked by its own ops only", () => {
  const span = { start: 0, end: 9, text: "aa bb cc!" };
  const first = evidence({
    id: "r1",
    exactText: "xx aa",
    diff: [{ op: "equal", draft: { start: 0, end: 2 }, source: { recordId: "r1", start: 3, end: 5 } }],
  });
  const second = evidence({
    id: "r2",
    exactText: "bb dd ee",
    diff: [
      { op: "equal", draft: { start: 3, end: 5 }, source: { recordId: "r2", start: 0, end: 2 } },
      { op: "replace", draft: { start: 6, end: 8 }, source: { recordId: "r2", start: 3, end: 5 } },
      // An op of another record is ignored for this record's text.
      { op: "delete", source: { recordId: "r1", start: 0, end: 2 } },
    ],
  });
  expect(
    draftSegments(span, [first, second])
      .filter((s) => s.mark)
      .map((s) => [s.text, s.mark]),
  ).toEqual([
    ["aa", "equal"],
    ["bb", "equal"],
    ["cc", "replace"],
  ]);
  expect(sourceSegments(first)).toEqual([{ text: "xx " }, { text: "aa", mark: "equal" }]);
  expect(sourceSegments(second)).toEqual([
    { text: "bb", mark: "equal" },
    { text: " " },
    { text: "dd", mark: "replace" },
    { text: " ee" },
  ]);
  expect(joined(alignedSourceSegments(second))).toBe("bb dd");
  expect(joined(alignedSourceSegments(first))).toBe("aa");
});

test("a source text is never altered: the pieces are exactText, whole", () => {
  const entry = evidence({
    id: "quran:2:153",
    diff: [{ op: "equal", draft: { start: 0, end: 5 }, source: { recordId: "quran:2:153", start: 71, end: 103 } }],
  });
  expect(joined(sourceSegments(entry))).toBe(entry.record.exactText);
  expect(joined(alignedSourceSegments(entry))).toBe(entry.record.exactText.slice(71, 103));
  expect(joined(sourceSegments(evidence({ id: "no-diff" })))).toBe(entry.record.exactText);
});
