import { expect, test } from "vitest";
import { groupOccurrences, occurrenceCitation, sourceCopyText } from "./occurrences";
import { evidence } from "./test-fixtures";

const ids = (evidenceList: Parameters<typeof groupOccurrences>[0]) =>
  groupOccurrences(evidenceList).map((o) => o.entries.map((e) => e.record.id));

test("one entry per single-ayah occurrence, also when two places share an ayah number", () => {
  expect(
    ids([
      evidence({ id: "quran:94:5", ayahRange: [5, 5] }),
      evidence({ id: "quran:94:6", ayahRange: [6, 6] }),
      evidence({ id: "quran:2:5", ayahRange: [5, 5] }),
      evidence({ id: "quran:3:5", ayahRange: [5, 5] }),
    ]),
  ).toEqual([["quran:94:5"], ["quran:94:6"], ["quran:2:5"], ["quran:3:5"]]);
});

test("the records of one occurrence follow each other and share the range", () => {
  expect(
    ids([
      evidence({ id: "quran:2:155", ayahRange: [155, 156] }),
      evidence({ id: "quran:2:156", ayahRange: [155, 156] }),
      // The same range in another place: a new occurrence once the first is full.
      evidence({ id: "quran:9:155", ayahRange: [155, 156] }),
      evidence({ id: "quran:9:156", ayahRange: [155, 156] }),
      evidence({ id: "quran:1:1", ayahRange: [1, 1] }),
    ]),
  ).toEqual([["quran:2:155", "quran:2:156"], ["quran:9:155", "quran:9:156"], ["quran:1:1"]]);
});

test("entries without a range, or of another collection, are occurrences of their own", () => {
  expect(
    ids([
      evidence({ id: "bukhari:1", collection: "bukhari", kind: "hadith" }),
      evidence({ id: "muslim:4927", collection: "muslim", kind: "hadith" }),
      evidence({ id: "a:1", collection: "a", ayahRange: [1, 2] }),
      evidence({ id: "b:2", collection: "b", ayahRange: [1, 2] }),
    ]),
  ).toEqual([["bukhari:1"], ["muslim:4927"], ["a:1"], ["b:2"]]);
  expect(ids([])).toEqual([]);
});

test("the citation is citation.display as the record gives it", () => {
  const [single] = groupOccurrences([evidence({ id: "x", display: "سورة البقرة، الآية 153", ayahRange: [153, 153] })]);
  expect(occurrenceCitation(single!)).toBe("سورة البقرة، الآية 153");
  const [range] = groupOccurrences([
    evidence({ id: "x", display: "سورة البقرة، الآية 155", ayahRange: [155, 156] }),
    evidence({ id: "y", display: "سورة البقرة، الآية 156", ayahRange: [155, 156] }),
  ]);
  expect(occurrenceCitation(range!)).toBe("من سورة البقرة، الآية 155 إلى سورة البقرة، الآية 156");
});

test("the copied text is exactText with the citation: Quran text between ﴿ ﴾, other kinds bare", () => {
  const [quran] = groupOccurrences([
    evidence({ id: "x", exactText: "نص أ", display: "مرجع أ", ayahRange: [1, 2] }),
    evidence({ id: "y", exactText: "نص ب", display: "مرجع ب", ayahRange: [1, 2] }),
  ]);
  expect(sourceCopyText(quran!)).toBe("﴿نص أ﴾ ﴿نص ب﴾\nمن مرجع أ إلى مرجع ب");
  const [hadith] = groupOccurrences([evidence({ id: "h", kind: "hadith", exactText: "نص الحديث", display: "رقم 1" })]);
  expect(sourceCopyText(hadith!)).toBe("نص الحديث\nرقم 1");
});
