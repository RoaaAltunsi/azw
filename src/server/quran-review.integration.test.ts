// The orchestrator (src/core/review.ts) on the real corpus (data/corpus): Quran matcher, word diff
// and status rules, end to end. It lives beside the loader because src/core may not read files.
// The drafts below are test input written for this file; the tune cases are read from
// eval/cases/tune.jsonl. The held-out split is never read.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { regexExtractor, type Extractor } from "../core/extract";
import { hasUthmaniSigns, matchAll, type MatchCandidate } from "../core/matchers";
import { normalizeWithMap } from "../core/normalize";
import { review as runReview, REVIEW_LIMITS } from "../core/review";
import { ReviewResultSchema, type ClaimedKind, type ReviewItem } from "../core/types";
import { loadCorpus } from "./corpus-loader";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const corpus = loadCorpus(ROOT);

interface Reviewed {
  item: ReviewItem;
  ids: string[]; // the evidence records, in order
  ayahRange: [number, number] | undefined;
  // What the Quran matcher reports for the span, for the tests about layers and spelling: a
  // ReviewItem does not carry them (docs/BACKLOG.md).
  candidates: MatchCandidate[];
  best: MatchCandidate | undefined;
  diff: string[]; // op[draft text]{source text}
  reason: string;
}

// One quote through the orchestrator. The span is given by hand ("manual"), so that these tests
// do not depend on what the extractor recognises.
async function review(draft: string, quote: string, claimedKind: ClaimedKind = "quran"): Promise<Reviewed> {
  const start = draft.indexOf(quote);
  expect(start).toBeGreaterThanOrEqual(0);
  const span = { start, end: start + quote.length, text: quote };
  const manual: Extractor = () => [{ span, claimedKind, extractedBy: "manual" }];
  const result = await runReview(draft, { ...corpus, extractors: [manual], now: () => 0 });
  expect(ReviewResultSchema.safeParse(result).success).toBe(true);
  expect(result.items).toHaveLength(1);
  const item = result.items[0]!;
  const ids = item.evidence.map((e) => e.record.id);
  const candidates = matchAll({ span, claimedKind }, corpus.index);
  const best = candidates.find((c) => c.recordIds[0] === ids[0]);
  // The diff of the first occurrence: its records are the first evidence entries.
  const diff = item.evidence.slice(0, best?.recordIds.length ?? 0).flatMap((e) =>
    (e.diff ?? []).map(
      (o) =>
        o.op +
        (o.draft ? `[${draft.slice(o.draft.start, o.draft.end)}]` : "") +
        (o.source ? `{${corpus.index.record(o.source.recordId)!.exactText.slice(o.source.start, o.source.end)}}` : ""),
    ),
  );
  return { item, ids, ayahRange: item.evidence[0]?.ayahRange, candidates, best, diff, reason: item.reasonAr };
}

// Diacritics and Quranic marks removed: the texts typed in this file and the corpus may order the
// marks of one letter differently, which is not what these tests are about.
const bare = (lines: string[]): string[] => lines.map((line) => normalizeWithMap(line, "strict").norm);

const outcome = (r: Reviewed): string => `${r.item.status}/${r.item.reasonCode}`;
const AYAH_153 = "يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ";

describe("البقرة 153", () => {
  test("correct text and reference → MATCH", async () => {
    const quote = "يا أيها الذين آمنوا استعينوا بالصبر والصلاة إن الله مع الصابرين";
    const r = await review(`قال تعالى: ﴿${quote}﴾ [البقرة: 153].`, quote);
    expect(outcome(r)).toBe("MATCH/MATCH_REF_OK");
    expect(r.item.contentLevel).toBe("A");
    expect(r.ids).toEqual(["quran:2:153"]);
    expect(r.ayahRange).toEqual([153, 153]);
    expect(r.best!.layer).toBe("default");
    // One "equal" op: the whole quote against the whole of exactText, pause mark included.
    expect(bare(r.diff)).toEqual(bare([`equal[${quote}]{${AYAH_153}}`]));
    expect(r.reason).toBe("النص مطابق لنص المصدر، والمرجع المذكور في المسودة يوافقه: سورة البقرة، الآية 153.");
  });

  test("the same text cited as 2:152 → DIFFERS / REF_MISMATCH_AYAH", async () => {
    const quote = "يا أيها الذين آمنوا استعينوا بالصبر والصلاة إن الله مع الصابرين";
    const r = await review(`قال تعالى: ﴿${quote}﴾ [البقرة: 152].`, quote);
    expect(outcome(r)).toBe("DIFFERS/REF_MISMATCH_AYAH");
    expect(r.ids).toEqual(["quran:2:153"]);
    expect(r.reason).toBe("النص مطابق للآية، لكن رقمها في المسودة لا يطابق المصدر. المرجع في المصدر: سورة البقرة، الآية 153.");
  });

  test("the same text cited in another surah → DIFFERS / REF_MISMATCH_SURAH", async () => {
    const quote = "استعينوا بالصبر والصلاة إن الله مع الصابرين";
    const r = await review(`قال تعالى: ﴿${quote}﴾ [آل عمران: 153].`, quote);
    expect(outcome(r)).toBe("DIFFERS/REF_MISMATCH_SURAH");
    expect(r.reason).toContain("سورة البقرة، الآية 153");
  });

  test("one word removed → DIFFERS / WORDING_DIFF, with the missing word in the diff", async () => {
    const quote = "يا أيها الذين آمنوا استعينوا بالصبر إن الله مع الصابرين";
    const r = await review(`قال تعالى: ﴿${quote}﴾ [البقرة: 153].`, quote);
    expect(outcome(r)).toBe("DIFFERS/WORDING_DIFF");
    expect(r.ids).toEqual(["quran:2:153"]);
    expect(r.best!.hit).toBe("fuzzy");
    expect(bare(r.diff)).toEqual(bare([
      "equal[يا أيها الذين آمنوا استعينوا بالصبر]{يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ}",
      "delete{وَالصَّلَاةِ}",
      "equal[إن الله مع الصابرين]{إِنَّ اللَّهَ مَعَ الصَّابِرِينَ}",
    ]));
    expect(r.reason).toContain("سورة البقرة، الآية 153");
  });

  test("ayah numbers typed between the ayat do not make the wording differ", async () => {
    const quote = "إن الله مع الصابرين (153) ولا تقولوا لمن يقتل في سبيل الله أموات";
    const r = await review(`قال تعالى: ﴿${quote}﴾ [البقرة: 153-154].`, quote);
    expect(outcome(r)).toBe("MATCH/MATCH_REF_OK");
    expect(r.ayahRange).toEqual([153, 154]);
  });

  test("a quote spanning two ayat → MATCH with ayahRange", async () => {
    const quote = "إن الله مع الصابرين ولا تقولوا لمن يقتل في سبيل الله أموات";
    const r = await review(`قال تعالى: ﴿${quote}﴾ [البقرة: 153-154].`, quote);
    expect(outcome(r)).toBe("MATCH/MATCH_REF_OK");
    expect(r.ids).toEqual(["quran:2:153", "quran:2:154"]);
    expect(r.ayahRange).toEqual([153, 154]);
    expect(bare(r.diff)).toEqual(bare([
      "equal[إن الله مع الصابرين]{إِنَّ اللَّهَ مَعَ الصَّابِرِينَ}",
      "equal[ولا تقولوا لمن يقتل في سبيل الله أموات]{وَلَا تَقُولُوا لِمَنْ يُقْتَلُ فِي سَبِيلِ اللَّهِ أَمْوَاتٌ}",
    ]));
    expect(r.reason).toContain("من سورة البقرة، الآية 153 إلى سورة البقرة، الآية 154");
  });

  test("two ayat cited with the first ayah only → DIFFERS / REF_MISMATCH_AYAH", async () => {
    const quote = "إن الله مع الصابرين ولا تقولوا لمن يقتل في سبيل الله أموات";
    expect(outcome(await review(`قال تعالى: ﴿${quote}﴾ [البقرة: 153].`, quote))).toBe("DIFFERS/REF_MISMATCH_AYAH");
  });

  test("no reference → MATCH / MATCH_NO_REFERENCE, and the sentence offers the reference", async () => {
    const quote = "استعينوا بالصبر والصلاة";
    const r = await review(`فقد أمرنا ربنا: ﴿${quote}﴾ فالزموا ذلك.`, quote);
    expect(outcome(r)).toBe("MATCH/MATCH_NO_REFERENCE");
    expect(r.reason).toContain("سورة البقرة، الآية 153");
  });
});

describe("a reference that was not read in full is never MATCH (D-11)", () => {
  const quote = "استعينوا بالصبر والصلاة إن الله مع الصابرين";
  test.each([
    ["a surah cited by number", `﴿${quote}﴾ [2:153].`, "NEEDS_SPECIALIST/REF_NOT_CHECKED"],
    ["a list of ayat", `﴿${quote}﴾ (البقرة: 153، 155).`, "NEEDS_SPECIALIST/REF_NOT_CHECKED"],
    ["a list of ayat in the wrong surah", `﴿${quote}﴾ (آل عمران: 153، 155).`, "DIFFERS/REF_MISMATCH_SURAH"],
    // A number the parser does not read into the reference: never taken as a correct citation.
    ["a bracketed ayah number after the surah", `قال تعالى في سورة البقرة (152): ﴿${quote}﴾`, "NEEDS_SPECIALIST/REF_NOT_CHECKED"],
    ["a second ayah after the first", `قال تعالى في سورة البقرة الآية 153 والآية 154: ﴿${quote}﴾`, "NEEDS_SPECIALIST/REF_NOT_CHECKED"],
  ])("%s", async (_name, draft, expected) => {
    const r = await review(draft, quote);
    expect(outcome(r)).toBe(expected);
    expect(r.ids).toEqual(["quran:2:153"]);
  });
});

describe("spelling (D-9)", () => {
  test("«رحمة» in 7:56, an everyday spelling from the approved list → MATCH", async () => {
    const quote = "إن رحمة الله قريب من المحسنين";
    const r = await review(`قال تعالى: ﴿${quote}﴾ [الأعراف: 56].`, quote);
    expect(outcome(r)).toBe("MATCH/MATCH_REF_OK");
    expect(r.ids).toEqual(["quran:7:56"]);
    expect([r.best!.layer, r.best!.spelling]).toEqual(["everyday", "bridged"]);
    // The source side of the diff is exactText, with the mushaf spelling.
    expect(bare(r.diff)).toEqual(bare([`equal[${quote}]{إِنَّ رَحْمَتَ اللَّهِ قَرِيبٌ مِنَ الْمُحْسِنِينَ}`]));
  });

  test("the mushaf spelling «رحمت» in 7:56 → MATCH on the main text", async () => {
    const quote = "إن رحمت الله قريب من المحسنين";
    const r = await review(`﴿${quote}﴾ [الأعراف: 56]`, quote);
    expect(outcome(r)).toBe("MATCH/MATCH_REF_OK");
    expect([r.best!.layer, r.best!.spelling]).toEqual(["default", "same"]);
  });

  test("an Uthmani-script paste of 103:2 → MATCH", async () => {
    const quote = "إِنَّ ٱلْإِنسَٰنَ لَفِى خُسْرٍ";
    const r = await review(`قال الله تعالى: ﴿${quote}﴾ [العصر: 2].`, quote);
    expect(outcome(r)).toBe("MATCH/MATCH_REF_OK");
    expect(r.ids).toEqual(["quran:103:2"]);
    expect([r.best!.layer, r.best!.spelling]).toEqual(["uthmani", "bridged"]);
    // Displayed and diffed against exactText, never against the Uthmani search text.
    expect(bare(r.diff)).toEqual(bare([`equal[${quote}]{إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ}`]));
  });

  test("an Uthmani paste whose words divide differently from exactText → MATCH", async () => {
    const quote = "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ ٱسْتَعِينُوا۟ بِٱلصَّبْرِ وَٱلصَّلَوٰةِ";
    const r = await review(`﴿${quote}﴾ [البقرة: 153]`, quote);
    expect(outcome(r)).toBe("MATCH/MATCH_REF_OK");
    expect(bare(r.diff)).toEqual(bare([`equal[${quote}]{يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ}`]));
  });

  test("an everyday-script quote that writes «الرحمان» → DIFFERS, not MATCH", async () => {
    const quote = "بسم الله الرحمان الرحيم";
    const r = await review(`نبدأ كلامنا بقوله تعالى: ﴿${quote}﴾ [الفاتحة: 1].`, quote);
    expect(outcome(r)).toBe("DIFFERS/WORDING_DIFF");
    // The same words stand in 27:30: both occurrences are evidence, the cited one first.
    expect(r.ids).toEqual(["quran:1:1", "quran:27:30"]);
    expect([r.best!.layer, r.best!.hit, r.best!.spelling]).toEqual(["uthmani", "exact", "error"]);
    expect(bare(r.diff)).toEqual(bare(["equal[بسم الله]{بِسْمِ اللَّهِ}", "replace[الرحمان]{الرَّحْمَٰنِ}", "equal[الرحيم]{الرَّحِيمِ}"]));
    expect(r.candidates.every((c) => c.spelling === "error")).toBe(true);
  });

  // A spelling error never ends MATCH, whatever marks the span carries (D-13).
  test.each([
    ["with diacritics and a pause mark, as in text copied from the everyday source", "بِسْمِ اللَّهِ الرَّحْمَانِ الرَّحِيمِ ۚ", "[الفاتحة: 1]", "الرَّحْمَانِ"],
    ["inside a span written in Uthmani script", "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَانِ ٱلرَّحِيمِ", "[الفاتحة: 1]", "ٱلرَّحۡمَانِ"],
    ["«هاذا» for «هذا»", "هاذا بلاغ للناس", "[إبراهيم: 52]", "هاذا"],
    ["«ذالك» for «ذلك», with a superscript alef elsewhere in the span", "ذَالِكَ الْكِتَٰبُ لَا رَيْبَ فِيهِ", "[البقرة: 2]", "ذَالِكَ"],
    ["«لدا» for «لدى» in everyday script, which is how the mushaf writes it", "وألفيا سيدها لدا الباب ۚ", "[يوسف: 25]", "لدا"],
  ])("a misspelt word %s → DIFFERS", async (_name, quote, cited, misspelt) => {
    const r = await review(`﴿${quote}﴾ ${cited}`, quote);
    expect(outcome(r)).toBe("DIFFERS/WORDING_DIFF");
    expect(r.candidates.every((c) => c.spelling === "error")).toBe(true);
    expect(r.diff.some((line) => line.startsWith(`replace[${misspelt}]`))).toBe(true);
  });

  test("the mushaf's own «لدا», in a span written in Uthmani script → MATCH", async () => {
    const quote = "وَأَلۡفَيَا سَيِّدَهَا لَدَا ٱلۡبَابِ";
    expect(outcome(await review(`﴿${quote}﴾ [يوسف: 25]`, quote))).toBe("MATCH/MATCH_REF_OK");
  });

  test("a mushaf paste whose only mark is the superscript alef → MATCH", async () => {
    const quote = "رَبِّ مُوسَىٰ وَهَٰرُونَ";
    const r = await review(`﴿${quote}﴾ [الأعراف: 122]`, quote);
    expect(outcome(r)).toBe("MATCH/MATCH_REF_OK");
    expect([r.best!.layer, r.best!.spelling]).toEqual(["uthmani", "bridged"]);
  });

  // docs/DECISIONS.md D-13: the mushaf writes «ءَالَآءِ» with a combining maddah, a sign the everyday
  // text never carries, so the paste is Uthmani script and the mushaf's own spelling matches.
  test("a mushaf paste whose only sign is the combining maddah → MATCH", async () => {
    const quote = "فَبِأَيِّ ءَالَآءِ رَبِّكُمَا تُكَذِّبَانِ";
    const r = await review(`﴿${quote}﴾ [الرحمن: 13]`, quote);
    expect(outcome(r)).toBe("MATCH/MATCH_REF_OK");
    expect(r.ids).toEqual(["quran:55:13"]);
  });

  test("the same word typed in everyday script without the maddah («ءالاء») → DIFFERS", async () => {
    const quote = "فبأي ءالاء ربكما تكذبان";
    expect(outcome(await review(`﴿${quote}﴾ [الرحمن: 13]`, quote))).toBe("DIFFERS/WORDING_DIFF");
  });

  // hasUthmaniSigns rests on this: the signs it accepts are in no record of the everyday-script
  // source, so text copied from our own Quran text can never count as Uthmani script.
  test("no Quran record's exactText carries a sign that counts as Uthmani script", async () => {
    const withSign: string[] = [];
    for (let surah = 1; surah <= 114; surah++) {
      for (let ayah = 1; ; ayah++) {
        const record = corpus.index.record(`quran:${surah}:${ayah}`);
        if (!record) break;
        if (hasUthmaniSigns(record.exactText)) withSign.push(record.id);
      }
    }
    expect(withSign).toEqual([]);
  });

  test("a short phrase is found in every ayah that has it, in either spelling", async () => {
    const quote = "نعمة الله";
    const ids = (await review(`﴿${quote}﴾`, quote)).candidates.map((c) => `${c.recordIds[0]} ${c.layer}`);
    expect(ids).toContain("quran:14:34 everyday"); // the mushaf writes «نعمت»
    expect(ids).toContain("quran:16:18 default"); // the mushaf writes «نعمة»
    const cited = await review(`﴿${quote}﴾ [إبراهيم: 34]`, quote);
    expect(outcome(cited)).toBe("MATCH/MATCH_REF_OK");
    expect(cited.best!.recordIds).toEqual(["quran:14:34"]);
  });

  test("an everyday-script quote with a dropped alef («الكتب») → DIFFERS", async () => {
    const quote = "ذلك الكتب لا ريب فيه";
    const r = await review(`﴿${quote}﴾ [البقرة: 2]`, quote);
    expect(outcome(r)).toBe("DIFFERS/WORDING_DIFF");
    expect(r.ids).toEqual(["quran:2:2"]);
    expect(bare(r.diff)).toContain("replace[الكتب]{الكتاب}");
  });
});

describe("kind and coverage", () => {
  test("a verse attributed as a hadith → DIFFERS / KIND_MISMATCH", async () => {
    const quote = "استعينوا بالصبر والصلاة إن الله مع الصابرين";
    const r = await review(`قال رسول الله ﷺ: «${quote}». فالصبر مفتاح الفرج.`, quote, "hadith");
    expect(outcome(r)).toBe("DIFFERS/KIND_MISMATCH");
    expect(r.ids).toEqual(["quran:2:153"]);
    expect(r.reason).toBe(
      "هذا النص موجود في المصادر المغطاة بوصفه آية قرآنية (سورة البقرة، الآية 153)، وهذا يخالف نسبته في المسودة. يُرجى مراجعة النسبة.",
    );
  });

  test("a sentence that is in no source → NOT_FOUND, with no evidence shown", async () => {
    const quote = "اسعَ يا عبدي وأنا أعينك على كل أمر";
    const r = await review(`قال تعالى: ﴿${quote}﴾.`, quote);
    expect(outcome(r)).toBe("NOT_FOUND/NO_RECORD_IN_COVERED_SOURCES");
    expect(r.item.evidence).toEqual([]);
    // Only the Quran is searched until the hadith matcher is registered (P11).
    expect(r.reason).toBe("لم نجد هذا النص في المصادر المغطاة (القرآن الكريم). هذا لا يعني الحكم عليه؛ راجعه قبل النشر.");
  });

  test("a phrase repeated in the Quran is one MATCH with every occurrence", async () => {
    const quote = "فبأي آلاء ربكما تكذبان";
    const free = await review(`﴿${quote}﴾`, quote);
    expect(outcome(free)).toBe("MATCH/MATCH_NO_REFERENCE");
    // 31 occurrences: the evidence is capped, the sentence counts them all.
    expect(free.ids).toHaveLength(REVIEW_LIMITS.MAX_EVIDENCE_PER_ITEM);
    expect(free.reason).toContain("سورة الرحمن، الآية 13 (وفي 30 من المواضع الأخرى)");
    const cited = await review(`﴿${quote}﴾ [الرحمن: 16]`, quote);
    expect(outcome(cited)).toBe("MATCH/MATCH_REF_OK");
    expect(cited.ids).toEqual(["quran:55:16"]);
    expect(outcome(await review(`﴿${quote}﴾ [الرحمن: 14]`, quote))).toBe("DIFFERS/REF_MISMATCH_AYAH");
  });
});

// Every tune case whose expected records are Quran records (the hadith cases wait for P11).
interface TuneCase {
  id: string;
  draft: string;
  expected: Array<{ quote: string; kind: string; status: string; reasonCode: string; recordIds: string[] }>;
}
const tune = readFileSync(`${ROOT}/eval/cases/tune.jsonl`, "utf8")
  .split("\n")
  .filter((line) => line.trim() !== "")
  .map((line) => JSON.parse(line) as TuneCase);
const quranItems = tune.flatMap((c) =>
  c.expected.filter((e) => e.recordIds.some((id) => id.startsWith("quran:")) || e.kind === "interpretive_claim" || e.kind === "unclear_attribution").map((e) => ({ ...e, id: c.id, draft: c.draft })),
);

describe("tune cases on Quran records and claims", () => {
  test("the selection is not empty", async () => {
    expect(quranItems.length).toBeGreaterThanOrEqual(11);
  });

  test.each(quranItems)("$id $kind → $status / $reasonCode", async (item) => {
    const r = await review(item.draft, item.quote, item.kind);
    expect(outcome(r)).toBe(`${item.status}/${item.reasonCode}`);
    expect(r.ids.slice(0, item.recordIds.length)).toEqual(item.recordIds);
  });
});

describe("contracts", () => {
  test("a one-word quote found in thousands of ayat returns a bounded item", async () => {
    const r = await review("﴿الله﴾", "الله");
    expect(outcome(r)).toBe("MATCH/MATCH_NO_REFERENCE");
    expect(r.candidates.length).toBeGreaterThan(2000);
    expect(r.ids).toHaveLength(REVIEW_LIMITS.MAX_EVIDENCE_PER_ITEM);
    expect(r.reason).toContain(`(وفي ${r.candidates.length - 1} من المواضع الأخرى)`);
  });

  test("one quote is matched and decided well inside the request budget", async () => {
    const quote = "ولا تصعر خدك للناس ولا تمش في الأرض مرحا إن الله لا يحب كل متكبر فخور";
    const draft = `﴿${quote}﴾ [لقمان: 18]`;
    await review(draft, quote); // fills the word cache
    const started = performance.now();
    await review(draft, quote);
    expect(performance.now() - started).toBeLessThan(250);
  });
});

// The orchestrator with the extractor the API uses, on the real corpus.
describe("the pipeline with the regex extractor", () => {
  const deps = { ...corpus, extractors: [regexExtractor], now: () => 0 };

  test("two quotes in one draft, each with its own reference", async () => {
    const draft =
      "قال تعالى: ﴿استعينوا بالصبر والصلاة﴾ [البقرة: 153]. وقال رسول الله ﷺ: «استعينوا بالصبر والصلاة إن الله مع الصابرين». ثم ﴿إن رحمة الله قريب من المحسنين﴾ [الأعراف: 55].";
    const result = await runReview(draft, deps);
    expect(ReviewResultSchema.safeParse(result).success).toBe(true);
    expect(result.items.map((i) => [i.claimedKind, i.status, i.reasonCode, i.evidence[0]?.record.id])).toEqual([
      ["quran", "MATCH", "MATCH_REF_OK", "quran:2:153"],
      ["hadith", "DIFFERS", "KIND_MISMATCH", "quran:2:153"],
      ["quran", "DIFFERS", "REF_MISMATCH_AYAH", "quran:7:56"],
    ]);
    expect(result.items.map((i) => i.citedReference?.raw)).toEqual(["[البقرة: 153]", undefined, "[الأعراف: 55]"]);
    expect(result.summary).toEqual({ MATCH: 1, DIFFERS: 2, NOT_FOUND: 0, NEEDS_SPECIALIST: 0, ERROR: 0 });
    expect(await runReview(draft, deps)).toEqual(result);
  });

  test("a verse without marks, a verse given as a hadith, and an unclear attribution", async () => {
    const draft =
      "قال تعالى: إن مع العسر يسرا [الشرح: 6].\nوقال النبي ﷺ: «إن مع العسر يسرا».\nويُروى عن النبي ﷺ أنه قال: «إن مع العسر يسرا».";
    const result = await runReview(draft, deps);
    expect(result.items.map((i) => [i.claimedKind, i.span.text, i.status, i.reasonCode, i.citedReference?.raw])).toEqual([
      ["quran", "إن مع العسر يسرا", "MATCH", "MATCH_REF_OK", "[الشرح: 6]"],
      ["hadith", "إن مع العسر يسرا", "DIFFERS", "KIND_MISMATCH", undefined],
      ["unclear_attribution", "إن مع العسر يسرا", "NEEDS_SPECIALIST", "UNCLEAR_ATTRIBUTION", undefined],
    ]);
  });

  // AGENTS.md §2 rules 1 and 3: the corpus holds Sahih al-Bukhari, but no matcher searches it until
  // P11. The result must not say that the text was looked for there.
  test("a real Bukhari text after «قال رسول الله» → NOT_FOUND whose sentence names the Quran only", async () => {
    const quote = "إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى";
    const layer = { collection: "bukhari", layer: "default" };
    const held = corpus.index.findExact(corpus.index.normalizeFor(layer, quote).norm, layer);
    expect(held.map((hit) => hit.recordIds[0])).toContain("bukhari:1");
    expect(corpus.coverage).toEqual(["quran", "bukhari", "muslim"]);

    const result = await runReview(`قال رسول الله ﷺ: «${quote}». رواه البخاري.`, deps);
    expect(result.coverage).toEqual(["quran"]);
    expect(result.items).toHaveLength(1);
    const [item] = result.items;
    expect([item!.claimedKind, item!.status, item!.reasonCode]).toEqual(["hadith", "NOT_FOUND", "NO_RECORD_IN_COVERED_SOURCES"]);
    expect(item!.evidence).toEqual([]);
    expect(item!.reasonAr).toBe("لم نجد هذا النص في المصادر المغطاة (القرآن الكريم). هذا لا يعني الحكم عليه؛ راجعه قبل النشر.");
    expect(item!.reasonAr).not.toMatch(/البخاري|مسلم/);
    expect(item!.citedReference).toEqual({
      raw: "رواه البخاري",
      span: expect.any(Object),
      parsed: { type: "hadith", collections: ["bukhari"] },
    });
  });
});
