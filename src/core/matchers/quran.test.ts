// QuranMatcher on the small fixture records (src/core/corpus/test-fixtures.ts). The same rules on
// the real corpus: src/server/quran-review.integration.test.ts.
import { describe, expect, test } from "vitest";
import { buildCorpusIndex, createHadithAdapter, createQuranAdapter } from "../corpus";
import { ALPHA_FIXTURE, ayah, QURAN_FIXTURE, SPELLING_FIXTURE } from "../corpus/test-fixtures";
import { wordDiff } from "../diff";
import type { ParsedReference, Reference } from "../references";
import { EvidenceSchema, type ClaimedKind, type QuoteInput } from "../types";
import { evidenceOf, getMatcher, hadithMatcher, matchAll, matchers, quranMatcher, type MatchCandidate } from "./index";

const index = buildCorpusIndex([createQuranAdapter(QURAN_FIXTURE, SPELLING_FIXTURE), createHadithAdapter("alpha", ALPHA_FIXTURE)]);

const OFFSET = 7; // the quote does not start the draft
function quoteOf(text: string, parsed?: ParsedReference, claimedKind: ClaimedKind = "quran"): QuoteInput {
  const reference: Reference | undefined = parsed && { raw: "[…]", span: { start: 0, end: 3 }, parsed };
  return { span: { start: OFFSET, end: OFFSET + text.length, text }, claimedKind, reference };
}
const match = (text: string, parsed?: ParsedReference): MatchCandidate[] => quranMatcher.match(quoteOf(text, parsed), index);

// What the candidate's words cover, read from the draft span and from exactText.
function covered(candidate: MatchCandidate, text: string): { quote: string; source: string[] } {
  const { quote, source } = candidate.alignment;
  const perRecord = candidate.records.map((record) => {
    const mine = source.filter((w) => w.recordId === record.id);
    return record.exactText.slice(mine[0]!.start, mine[mine.length - 1]!.end);
  });
  return { quote: text.slice(quote[0]!.start - OFFSET, quote[quote.length - 1]!.end - OFFSET), source: perRecord };
}
const summary = (c: MatchCandidate): string => `${c.recordIds.join("+")} ${c.layer} ${c.hit} ${c.spelling} ${c.score.toFixed(2)}`;

describe("exact hits", () => {
  test("part of an ayah on the main text", () => {
    const text = "استعينوا بالصبر والصلاة";
    const [candidate, ...rest] = match(text);
    expect(rest).toEqual([]);
    expect(summary(candidate!)).toBe("quran:2:153 default exact same 1.00");
    expect(candidate!.ayahRange).toEqual([153, 153]);
    expect(candidate!.kind).toBe("quran");
    expect(candidate!.collection).toBe("quran");
    expect(candidate!.records.map((r) => r.id)).toEqual(candidate!.recordIds);
    expect(covered(candidate!, text)).toEqual({ quote: text, source: ["استعينوا بالصبر والصلاة"] });
  });

  test("the attribution formula is not part of the quote", () => {
    const text = "قال الله تعالى: ولم يكن له كفوا أحد";
    const [candidate] = match(text);
    expect(summary(candidate!)).toBe("quran:112:4 default exact same 1.00");
    expect(covered(candidate!, text).quote).toBe("ولم يكن له كفوا أحد");
  });

  test("a quote over two ayat is one candidate with the range", () => {
    const text = "إن الله مع الصابرين ولا تقولوا لمن يقتل";
    const [candidate, ...rest] = match(text);
    expect(rest).toEqual([]);
    expect(summary(candidate!)).toBe("quran:2:153+quran:2:154 default exact same 1.00");
    expect(candidate!.ayahRange).toEqual([153, 154]);
    expect(covered(candidate!, text).source).toEqual(["إن الله مع الصابرين", "ولا تقولوا لمن يقتل"]);
  });

  test("every occurrence is kept, in mushaf order", () => {
    expect(match("الله").map((c) => c.recordIds[0])).toEqual(["quran:2:153", "quran:2:154", "quran:7:56"]);
  });

  test("with a reference, the occurrence it agrees with comes first, then the nearest miss", () => {
    const cited = match("الله", { type: "quran", surah: 2, ayahStart: 154 });
    expect(cited.map((c) => `${c.recordIds[0]} ${c.reference.result}`)).toEqual([
      "quran:2:154 consistent",
      "quran:2:153 mismatch",
      "quran:7:56 mismatch",
    ]);
  });
});

describe("layer rules (D-9, D-10 item 2)", () => {
  test("an approved everyday spelling is found on 'everyday' and reported as bridged", () => {
    const text = "إن رحمة الله قريب من المحسنين";
    const [candidate, ...rest] = match(text);
    expect(rest).toEqual([]);
    expect(summary(candidate!)).toBe("quran:7:56 everyday exact bridged 1.00");
    // The words stand against exactText, which keeps the mushaf spelling.
    expect(covered(candidate!, text).source).toEqual(["إن رحمت الله قريب من المحسنين"]);
  });

  test("the pair applies in its listed ayat only: «رحمة» in 19:2 is not an exact hit", () => {
    const [candidate] = match("ذكر رحمة ربك عبده زكريا");
    expect(summary(candidate!)).toBe("quran:19:2 default fuzzy same 0.80");
  });

  test("each occurrence is reported on the first layer that finds it there", () => {
    // One quote, two places: 39:53 reads so on the main text, 30:50 only through the approved spelling.
    const both = buildCorpusIndex([
      createQuranAdapter(
        [ayah(30, 50, "فانظر إلى آثار رحمت الله"), ayah(39, 53, "لا تقنطوا من رحمة الله")],
        [{ group: "open-ta", sourceForm: "رحمت", everydayForm: "رحمة", ayat: ["30:50"] }],
      ),
    ]);
    const found = quranMatcher.match(quoteOf("رحمة الله"), both);
    expect(found.map(summary)).toEqual(["quran:30:50 everyday exact bridged 1.00", "quran:39:53 default exact same 1.00"]);
    // The reference decides between them, so a citation of the listed ayah is not a wrong reference.
    const cited = quranMatcher.match(quoteOf("رحمة الله", { type: "quran", surah: 30, ayahStart: 50 }), both);
    expect(cited.map((c) => `${c.recordIds[0]} ${c.reference.result}`)).toEqual(["quran:30:50 consistent", "quran:39:53 mismatch"]);
  });

  test("a hit on 'default' is never reported as a spelling bridge", () => {
    expect(match("إن رحمت الله قريب").map(summary)).toEqual(["quran:7:56 default exact same 1.00"]);
    expect(match("قل أعوذ برب الفلق").map(summary)).toEqual(["quran:113:1 default exact same 1.00"]);
  });

  test("a span in Uthmani script is found on 'uthmani' and reported as bridged", () => {
    const text = "وَٱلصَّلَوٰةِ إِنَّ ٱللَّهَ مَعَ ٱلصَّٰبِرِينَ";
    const [candidate, ...rest] = match(text);
    expect(rest).toEqual([]);
    expect(summary(candidate!)).toBe("quran:2:153 uthmani exact bridged 1.00");
    expect(covered(candidate!, text)).toEqual({ quote: text, source: ["والصلاة إن الله مع الصابرين"] });
    expect(wordDiff(candidate!.alignment).map((o) => o.op)).toEqual(["equal"]);
  });

  test("a span with Uthmani signs that equals the main text is a hit on 'default'", () => {
    expect(match("وَلَٰكِن لَّا تَشْعُرُونَ").map(summary)).toEqual(["quran:2:154 default exact same 1.00"]);
  });

  test("an Uthmani word that is two words of exactText covers both", () => {
    const text = "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟";
    const [candidate] = match(text);
    expect(summary(candidate!)).toBe("quran:2:153 uthmani exact bridged 1.00");
    expect(candidate!.alignment.source.map((w) => w.key)).toEqual(["ياايها", "الذين", "امنوا"]);
    expect(covered(candidate!, text).source).toEqual(["يا أيها الذين آمنوا"]);
  });

  test("a spelt-out alef is a spelling error whatever marks the span carries", () => {
    // A pause mark, as in text copied from the everyday source.
    expect(match("وَلَاكِنْ لَا تَشْعُرُونَ ۚ").map(summary)).toEqual(["quran:2:154 uthmani exact error 0.67"]);
    // Even in a span that is in Uthmani script.
    expect(match("فِي سَبِيلِ ٱللَّهِ أَمْوَاتٌ بَلْ أَحْيَاءٌ وَلَاكِن لَّا تَشْعُرُونَ").map(summary)).toEqual(["quran:2:154 uthmani exact error 0.89"]);
  });

  test("a span without Uthmani signs that equals only 'uthmani' is a spelling error", () => {
    const text = "ولاكن لا تشعرون";
    const [candidate, ...rest] = match(text);
    expect(rest).toEqual([]);
    expect(summary(candidate!)).toBe("quran:2:154 uthmani exact error 0.67");
    // Compared on the main text, so the misspelt word is the difference shown.
    const ops = wordDiff(candidate!.alignment);
    expect(ops.map((o) => o.op)).toEqual(["replace", "equal"]);
    const replaced = ops[0]!;
    expect(text.slice(replaced.draft!.start - OFFSET, replaced.draft!.end - OFFSET)).toBe("ولاكن");
    expect(candidate!.records[0]!.exactText.slice(replaced.source!.start, replaced.source!.end)).toBe("ولكن");
  });
});

describe("fuzzy candidates", () => {
  test("a dropped word: every quote word matches, but the hit is not exact", () => {
    const text = "يا أيها الذين آمنوا استعينوا بالصبر إن الله مع الصابرين";
    const [candidate] = match(text);
    expect(summary(candidate!)).toBe("quran:2:153 default fuzzy same 1.00");
    expect(wordDiff(candidate!.alignment).map((o) => o.op)).toEqual(["equal", "delete", "equal"]);
  });

  test("a changed word and an added word lower the score", () => {
    expect(summary(match("ولم يكن له ندا أحد")[0]!)).toBe("quran:112:4 default fuzzy same 0.80");
    const added = match("قل أعوذ برب الفلق العظيم")[0]!;
    expect(summary(added)).toBe("quran:113:1 default fuzzy same 0.80");
    expect(wordDiff(added.alignment).map((o) => o.op)).toEqual(["equal", "insert"]);
  });

  test("the alignment runs into the neighbouring ayat", () => {
    const [candidate] = match("لم يلد ولم يولد ولم يكن له شريك أحد");
    expect(summary(candidate!)).toBe("quran:112:3+quran:112:4 default fuzzy same 0.89");
    expect(candidate!.ayahRange).toEqual([3, 4]);
  });

  test("the same place found from two candidate ayat is one candidate", () => {
    const candidates = match("مع الصابرين ولا تقولوا لمن يموت في سبيل الله");
    expect(candidates.map(summary)).toEqual(["quran:2:153+quran:2:154 default fuzzy same 0.89"]);
  });

  test("the score counts the words equal to the source, over the words of the quote", () => {
    const [candidate] = match("ولم يكن له كفوا واحد قط");
    expect(candidate!.score).toBeCloseTo(4 / 6);
    expect(candidate!.hit).toBe("fuzzy");
  });

  test("ayah numbers typed between the ayat are not words of the quote", () => {
    const text = "لم يلد ولم يولد (3) ولم يكن له كفوا أحد (٤)";
    const [candidate] = match(text);
    expect(summary(candidate!)).toBe("quran:112:3+quran:112:4 default exact same 1.00");
    expect(wordDiff(candidate!.alignment).map((o) => o.op)).toEqual(["equal", "equal"]);
  });

  test("nothing in common: no candidates", () => {
    expect(match("كلام لا يشبه شيئا من النصوص")).toEqual([]);
    expect(match("كلمة")).toEqual([]);
  });

  test("a span with no words gives nothing", () => {
    expect(match("﴿ ﴾")).toEqual([]);
    expect(match("قال تعالى:")).toEqual([]);
  });
});

describe("cited reference", () => {
  const text = "استعينوا بالصبر والصلاة"; // 2:153
  const cases: Array<[string, ParsedReference | undefined, string]> = [
    ["no reference", undefined, "none"],
    ["the ayah", { type: "quran", surah: 2, ayahStart: 153 }, "consistent"],
    ["the surah only", { type: "quran", surah: 2 }, "consistent"],
    ["another ayah of the surah", { type: "quran", surah: 2, ayahStart: 152 }, "REF_MISMATCH_AYAH"],
    ["a range around the ayah", { type: "quran", surah: 2, ayahStart: 153, ayahEnd: 154 }, "REF_MISMATCH_AYAH"],
    ["another surah, same ayah number", { type: "quran", surah: 3, ayahStart: 153 }, "REF_MISMATCH_SURAH"],
    ["another surah only", { type: "quran", surah: 3 }, "REF_MISMATCH_SURAH"],
    ["a list of ayat (partial)", { type: "quran", surah: 2, partial: true }, "unchecked"],
    ["a list of ayat in another surah", { type: "quran", surah: 3, partial: true }, "REF_MISMATCH_SURAH"],
    ["a reference that was not read", { type: "unknown" }, "unchecked"],
    ["a reference of another kind", { type: "hadith", collections: ["bukhari"] }, "unchecked"],
  ];
  test.each(cases)("%s", (_name, parsed, expected) => {
    const { reference } = match(text, parsed)[0]!;
    expect(reference.result === "mismatch" ? reference.reasonCode : reference.result).toBe(expected);
  });

  test("only a reference with the ayah names the place", () => {
    expect(match(text, { type: "quran", surah: 2, ayahStart: 153 })[0]!.reference).toEqual({ result: "consistent", place: true });
    expect(match(text, { type: "quran", surah: 2 })[0]!.reference).toEqual({ result: "consistent" });
  });

  test("a quote over two ayat needs the range, not one of its ayat", () => {
    const two = "إن الله مع الصابرين ولا تقولوا لمن يقتل";
    expect(match(two, { type: "quran", surah: 2, ayahStart: 153, ayahEnd: 154 })[0]!.reference.result).toBe("consistent");
    expect(match(two, { type: "quran", surah: 2, ayahStart: 153 })[0]!.reference).toEqual({ result: "mismatch", reasonCode: "REF_MISMATCH_AYAH" });
  });

  test("fuzzy candidates carry the check too", () => {
    const [candidate] = match("ولم يكن له ندا أحد", { type: "quran", surah: 112, ayahStart: 4 });
    expect(candidate!.reference).toEqual({ result: "consistent", place: true });
  });
});

describe("evidenceOf", () => {
  const sliceOf = (text: string, range: { start: number; end: number }): string => text.slice(range.start - OFFSET, range.end - OFFSET);

  test("one entry per record, each with its own part of the diff", () => {
    const text = "لم يلد ولم يولد ولم يكن له كفوا أحد";
    const [candidate] = match(text);
    const evidence = evidenceOf(candidate!);
    expect(evidence.map((e) => e.record.id)).toEqual(["quran:112:3", "quran:112:4"]);
    expect(evidence.map((e) => e.diff!.map((o) => `${o.op} ${o.source!.recordId}`))).toEqual([["equal quran:112:3"], ["equal quran:112:4"]]);
    for (const e of evidence) expect([e.score, e.ayahRange]).toEqual([1, [3, 4]]);
    for (const e of evidence) expect(EvidenceSchema.safeParse(e).success).toBe(true);
  });

  test("words only in the draft go with the record before them, or the first", () => {
    const text = "حقا لم يلد ولم يولد أبدا ولم يكن له كفوا أحد";
    const [candidate] = match(text);
    const [first, second] = evidenceOf(candidate!);
    expect(first!.diff!.map((o) => `${o.op} ${sliceOf(text, o.draft!)}`)).toEqual(["insert حقا", "equal لم يلد ولم يولد", "insert أبدا"]);
    expect(second!.diff!.map((o) => `${o.op} ${sliceOf(text, o.draft!)}`)).toEqual(["equal ولم يكن له كفوا أحد"]);
  });
});

describe("registry", () => {
  test("matchers are registered by kind", () => {
    expect(getMatcher("quran")).toBe(quranMatcher);
    expect(getMatcher("hadith")).toBe(hadithMatcher);
    expect(getMatcher("dua")).toBeUndefined();
    expect(getMatcher("toString")).toBeUndefined();
    expect(Object.keys(matchers)).toEqual(["quran", "hadith"]);
  });

  test("matchAll runs every matcher whatever the claimed kind", () => {
    const candidates = matchAll(quoteOf("قل أعوذ برب الفلق", undefined, "hadith"), index);
    expect(candidates.map(summary)).toEqual(["quran:113:1 default exact same 1.00"]);
  });

  test("an index without Quran records gives no candidates", () => {
    const hadithOnly = buildCorpusIndex([createHadithAdapter("alpha", ALPHA_FIXTURE)]);
    expect(quranMatcher.match(quoteOf("قل أعوذ برب الفلق"), hadithOnly)).toEqual([]);
  });

  test("the same quote gives the same candidates on every call", () => {
    const text = "مع الصابرين ولا تقولوا لمن يموت في سبيل الله";
    expect(match(text)).toEqual(match(text));
  });
});
