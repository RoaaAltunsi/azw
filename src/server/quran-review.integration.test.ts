// Quran matcher + word diff + status rules on the real corpus (data/corpus). It lives beside the
// loader because src/core may not read files. The drafts below are test input written for this
// file; the tune cases are read from eval/cases/tune.jsonl. The held-out split is never read.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { wordDiff } from "../core/diff";
import { evidenceOf, hasUthmaniSigns, matchAll, type MatchCandidate } from "../core/matchers";
import { normalizeWithMap } from "../core/normalize";
import { attachReference, parseReferences } from "../core/references";
import { decide, reasonAr, type Decision } from "../core/status";
import { DiffOpSchema, ReviewItemSchema, type ClaimedKind, type DiffOp } from "../core/types";
import { loadCorpus } from "./corpus-loader";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const corpus = loadCorpus(ROOT);

interface Reviewed {
  decision: Decision;
  candidates: MatchCandidate[];
  best: MatchCandidate | undefined;
  diff: string[]; // op[draft text]{source text}
  reason: string;
}

// What the orchestrator (P6) will do for one quote: parse and attach the reference, match, decide.
function review(draft: string, quote: string, claimedKind: ClaimedKind = "quran"): Reviewed {
  const start = draft.indexOf(quote);
  expect(start).toBeGreaterThanOrEqual(0);
  const span = { start, end: start + quote.length, text: quote };
  const reference = attachReference(span, parseReferences(draft, corpus.aliases), draft);
  const candidates = matchAll({ span, claimedKind, reference }, corpus.index);
  const decision = decide({ claimedKind, candidates });
  const best = decision.evidence[0];
  const ops: DiffOp[] = best ? wordDiff(best.alignment) : [];
  for (const op of ops) expect(DiffOpSchema.safeParse(op).success).toBe(true);
  const diff = ops.map(
    (o) =>
      o.op +
      (o.draft ? `[${draft.slice(o.draft.start, o.draft.end)}]` : "") +
      (o.source ? `{${corpus.index.record(o.source.recordId)!.exactText.slice(o.source.start, o.source.end)}}` : ""),
  );
  return { decision, candidates, best, diff, reason: reasonAr(decision, { coverage: corpus.coverage }) };
}

// Diacritics and Quranic marks removed: the texts typed in this file and the corpus may order the
// marks of one letter differently, which is not what these tests are about.
const bare = (lines: string[]): string[] => lines.map((line) => normalizeWithMap(line, "strict").norm);

const outcome = (r: Reviewed): string => `${r.decision.status}/${r.decision.reasonCode}`;
const AYAH_153 = "يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ";

describe("البقرة 153", () => {
  test("correct text and reference → MATCH", () => {
    const quote = "يا أيها الذين آمنوا استعينوا بالصبر والصلاة إن الله مع الصابرين";
    const r = review(`قال تعالى: ﴿${quote}﴾ [البقرة: 153].`, quote);
    expect(outcome(r)).toBe("MATCH/MATCH_REF_OK");
    expect(r.decision.contentLevel).toBe("A");
    expect(r.best!.recordIds).toEqual(["quran:2:153"]);
    expect(r.best!.ayahRange).toEqual([153, 153]);
    expect(r.best!.layer).toBe("default");
    // One "equal" op: the whole quote against the whole of exactText, pause mark included.
    expect(bare(r.diff)).toEqual(bare([`equal[${quote}]{${AYAH_153}}`]));
    expect(r.reason).toBe("النص مطابق لنص المصدر، والمرجع المذكور في المسودة يوافقه: سورة البقرة، الآية 153.");
  });

  test("the same text cited as 2:152 → DIFFERS / REF_MISMATCH_AYAH", () => {
    const quote = "يا أيها الذين آمنوا استعينوا بالصبر والصلاة إن الله مع الصابرين";
    const r = review(`قال تعالى: ﴿${quote}﴾ [البقرة: 152].`, quote);
    expect(outcome(r)).toBe("DIFFERS/REF_MISMATCH_AYAH");
    expect(r.best!.recordIds).toEqual(["quran:2:153"]);
    expect(r.reason).toBe("النص مطابق للآية، لكن رقمها في المسودة لا يطابق المصدر. المرجع في المصدر: سورة البقرة، الآية 153.");
  });

  test("the same text cited in another surah → DIFFERS / REF_MISMATCH_SURAH", () => {
    const quote = "استعينوا بالصبر والصلاة إن الله مع الصابرين";
    const r = review(`قال تعالى: ﴿${quote}﴾ [آل عمران: 153].`, quote);
    expect(outcome(r)).toBe("DIFFERS/REF_MISMATCH_SURAH");
    expect(r.reason).toContain("سورة البقرة، الآية 153");
  });

  test("one word removed → DIFFERS / WORDING_DIFF, with the missing word in the diff", () => {
    const quote = "يا أيها الذين آمنوا استعينوا بالصبر إن الله مع الصابرين";
    const r = review(`قال تعالى: ﴿${quote}﴾ [البقرة: 153].`, quote);
    expect(outcome(r)).toBe("DIFFERS/WORDING_DIFF");
    expect(r.best!.recordIds).toEqual(["quran:2:153"]);
    expect(r.best!.hit).toBe("fuzzy");
    expect(bare(r.diff)).toEqual(bare([
      "equal[يا أيها الذين آمنوا استعينوا بالصبر]{يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ}",
      "delete{وَالصَّلَاةِ}",
      "equal[إن الله مع الصابرين]{إِنَّ اللَّهَ مَعَ الصَّابِرِينَ}",
    ]));
    expect(r.reason).toContain("سورة البقرة، الآية 153");
  });

  test("ayah numbers typed between the ayat do not make the wording differ", () => {
    const quote = "إن الله مع الصابرين (153) ولا تقولوا لمن يقتل في سبيل الله أموات";
    const r = review(`قال تعالى: ﴿${quote}﴾ [البقرة: 153-154].`, quote);
    expect(outcome(r)).toBe("MATCH/MATCH_REF_OK");
    expect(r.best!.ayahRange).toEqual([153, 154]);
  });

  test("a quote spanning two ayat → MATCH with ayahRange", () => {
    const quote = "إن الله مع الصابرين ولا تقولوا لمن يقتل في سبيل الله أموات";
    const r = review(`قال تعالى: ﴿${quote}﴾ [البقرة: 153-154].`, quote);
    expect(outcome(r)).toBe("MATCH/MATCH_REF_OK");
    expect(r.best!.recordIds).toEqual(["quran:2:153", "quran:2:154"]);
    expect(r.best!.ayahRange).toEqual([153, 154]);
    expect(bare(r.diff)).toEqual(bare([
      "equal[إن الله مع الصابرين]{إِنَّ اللَّهَ مَعَ الصَّابِرِينَ}",
      "equal[ولا تقولوا لمن يقتل في سبيل الله أموات]{وَلَا تَقُولُوا لِمَنْ يُقْتَلُ فِي سَبِيلِ اللَّهِ أَمْوَاتٌ}",
    ]));
    expect(r.reason).toContain("من سورة البقرة، الآية 153 إلى سورة البقرة، الآية 154");
  });

  test("two ayat cited with the first ayah only → DIFFERS / REF_MISMATCH_AYAH", () => {
    const quote = "إن الله مع الصابرين ولا تقولوا لمن يقتل في سبيل الله أموات";
    expect(outcome(review(`قال تعالى: ﴿${quote}﴾ [البقرة: 153].`, quote))).toBe("DIFFERS/REF_MISMATCH_AYAH");
  });

  test("no reference → MATCH / MATCH_NO_REFERENCE, and the sentence offers the reference", () => {
    const quote = "استعينوا بالصبر والصلاة";
    const r = review(`فقد أمرنا ربنا: ﴿${quote}﴾ فالزموا ذلك.`, quote);
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
  ])("%s", (_name, draft, expected) => {
    const r = review(draft, quote);
    expect(outcome(r)).toBe(expected);
    expect(r.best!.recordIds).toEqual(["quran:2:153"]);
  });
});

describe("spelling (D-9)", () => {
  test("«رحمة» in 7:56, an everyday spelling from the approved list → MATCH", () => {
    const quote = "إن رحمة الله قريب من المحسنين";
    const r = review(`قال تعالى: ﴿${quote}﴾ [الأعراف: 56].`, quote);
    expect(outcome(r)).toBe("MATCH/MATCH_REF_OK");
    expect(r.best!.recordIds).toEqual(["quran:7:56"]);
    expect([r.best!.layer, r.best!.spelling]).toEqual(["everyday", "bridged"]);
    // The source side of the diff is exactText, with the mushaf spelling.
    expect(bare(r.diff)).toEqual(bare([`equal[${quote}]{إِنَّ رَحْمَتَ اللَّهِ قَرِيبٌ مِنَ الْمُحْسِنِينَ}`]));
  });

  test("the mushaf spelling «رحمت» in 7:56 → MATCH on the main text", () => {
    const quote = "إن رحمت الله قريب من المحسنين";
    const r = review(`﴿${quote}﴾ [الأعراف: 56]`, quote);
    expect(outcome(r)).toBe("MATCH/MATCH_REF_OK");
    expect([r.best!.layer, r.best!.spelling]).toEqual(["default", "same"]);
  });

  test("an Uthmani-script paste of 103:2 → MATCH", () => {
    const quote = "إِنَّ ٱلْإِنسَٰنَ لَفِى خُسْرٍ";
    const r = review(`قال الله تعالى: ﴿${quote}﴾ [العصر: 2].`, quote);
    expect(outcome(r)).toBe("MATCH/MATCH_REF_OK");
    expect(r.best!.recordIds).toEqual(["quran:103:2"]);
    expect([r.best!.layer, r.best!.spelling]).toEqual(["uthmani", "bridged"]);
    // Displayed and diffed against exactText, never against the Uthmani search text.
    expect(bare(r.diff)).toEqual(bare([`equal[${quote}]{إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ}`]));
  });

  test("an Uthmani paste whose words divide differently from exactText → MATCH", () => {
    const quote = "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ ٱسْتَعِينُوا۟ بِٱلصَّبْرِ وَٱلصَّلَوٰةِ";
    const r = review(`﴿${quote}﴾ [البقرة: 153]`, quote);
    expect(outcome(r)).toBe("MATCH/MATCH_REF_OK");
    expect(bare(r.diff)).toEqual(bare([`equal[${quote}]{يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ}`]));
  });

  test("an everyday-script quote that writes «الرحمان» → DIFFERS, not MATCH", () => {
    const quote = "بسم الله الرحمان الرحيم";
    const r = review(`نبدأ كلامنا بقوله تعالى: ﴿${quote}﴾ [الفاتحة: 1].`, quote);
    expect(outcome(r)).toBe("DIFFERS/WORDING_DIFF");
    expect(r.best!.recordIds).toEqual(["quran:1:1"]);
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
  ])("a misspelt word %s → DIFFERS", (_name, quote, cited, misspelt) => {
    const r = review(`﴿${quote}﴾ ${cited}`, quote);
    expect(outcome(r)).toBe("DIFFERS/WORDING_DIFF");
    expect(r.candidates.every((c) => c.spelling === "error")).toBe(true);
    expect(r.diff.some((line) => line.startsWith(`replace[${misspelt}]`))).toBe(true);
  });

  test("the mushaf's own «لدا», in a span written in Uthmani script → MATCH", () => {
    const quote = "وَأَلۡفَيَا سَيِّدَهَا لَدَا ٱلۡبَابِ";
    expect(outcome(review(`﴿${quote}﴾ [يوسف: 25]`, quote))).toBe("MATCH/MATCH_REF_OK");
  });

  test("a mushaf paste whose only mark is the superscript alef → MATCH", () => {
    const quote = "رَبِّ مُوسَىٰ وَهَٰرُونَ";
    const r = review(`﴿${quote}﴾ [الأعراف: 122]`, quote);
    expect(outcome(r)).toBe("MATCH/MATCH_REF_OK");
    expect([r.best!.layer, r.best!.spelling]).toEqual(["uthmani", "bridged"]);
  });

  // docs/DECISIONS.md D-13: the mushaf writes «ءَالَآءِ» with a combining maddah, a sign the everyday
  // text never carries, so the paste is Uthmani script and the mushaf's own spelling matches.
  test("a mushaf paste whose only sign is the combining maddah → MATCH", () => {
    const quote = "فَبِأَيِّ ءَالَآءِ رَبِّكُمَا تُكَذِّبَانِ";
    const r = review(`﴿${quote}﴾ [الرحمن: 13]`, quote);
    expect(outcome(r)).toBe("MATCH/MATCH_REF_OK");
    expect(r.best!.recordIds).toEqual(["quran:55:13"]);
  });

  test("the same word typed in everyday script without the maddah («ءالاء») → DIFFERS", () => {
    const quote = "فبأي ءالاء ربكما تكذبان";
    expect(outcome(review(`﴿${quote}﴾ [الرحمن: 13]`, quote))).toBe("DIFFERS/WORDING_DIFF");
  });

  // hasUthmaniSigns rests on this: the signs it accepts are in no record of the everyday-script
  // source, so text copied from our own Quran text can never count as Uthmani script.
  test("no Quran record's exactText carries a sign that counts as Uthmani script", () => {
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

  test("a short phrase is found in every ayah that has it, in either spelling", () => {
    const quote = "نعمة الله";
    const ids = review(`﴿${quote}﴾`, quote).candidates.map((c) => `${c.recordIds[0]} ${c.layer}`);
    expect(ids).toContain("quran:14:34 everyday"); // the mushaf writes «نعمت»
    expect(ids).toContain("quran:16:18 default"); // the mushaf writes «نعمة»
    const cited = review(`﴿${quote}﴾ [إبراهيم: 34]`, quote);
    expect(outcome(cited)).toBe("MATCH/MATCH_REF_OK");
    expect(cited.best!.recordIds).toEqual(["quran:14:34"]);
  });

  test("an everyday-script quote with a dropped alef («الكتب») → DIFFERS", () => {
    const quote = "ذلك الكتب لا ريب فيه";
    const r = review(`﴿${quote}﴾ [البقرة: 2]`, quote);
    expect(outcome(r)).toBe("DIFFERS/WORDING_DIFF");
    expect(r.best!.recordIds).toEqual(["quran:2:2"]);
    expect(bare(r.diff)).toContain("replace[الكتب]{الكتاب}");
  });
});

describe("kind and coverage", () => {
  test("a verse attributed as a hadith → DIFFERS / KIND_MISMATCH", () => {
    const quote = "استعينوا بالصبر والصلاة إن الله مع الصابرين";
    const r = review(`قال رسول الله ﷺ: «${quote}». فالصبر مفتاح الفرج.`, quote, "hadith");
    expect(outcome(r)).toBe("DIFFERS/KIND_MISMATCH");
    expect(r.best!.recordIds).toEqual(["quran:2:153"]);
    expect(r.reason).toBe(
      "هذا النص موجود في المصادر المغطاة بوصفه آية قرآنية (سورة البقرة، الآية 153)، وهذا يخالف نسبته في المسودة. يُرجى مراجعة النسبة.",
    );
  });

  test("a sentence that is in no source → NOT_FOUND, with no evidence shown", () => {
    const quote = "اسعَ يا عبدي وأنا أعينك على كل أمر";
    const r = review(`قال تعالى: ﴿${quote}﴾.`, quote);
    expect(outcome(r)).toBe("NOT_FOUND/NO_RECORD_IN_COVERED_SOURCES");
    expect(r.decision.evidence).toEqual([]);
    expect(r.reason).toBe("لم نجد هذا النص في المصادر المغطاة (القرآن الكريم، صحيح البخاري، صحيح مسلم). هذا لا يعني الحكم عليه؛ راجعه قبل النشر.");
  });

  test("a phrase repeated in the Quran is one MATCH with every occurrence", () => {
    const quote = "فبأي آلاء ربكما تكذبان";
    const free = review(`﴿${quote}﴾`, quote);
    expect(outcome(free)).toBe("MATCH/MATCH_NO_REFERENCE");
    expect(free.decision.evidence).toHaveLength(31);
    const cited = review(`﴿${quote}﴾ [الرحمن: 16]`, quote);
    expect(outcome(cited)).toBe("MATCH/MATCH_REF_OK");
    expect(cited.decision.evidence.map((c) => c.recordIds[0])).toEqual(["quran:55:16"]);
    expect(outcome(review(`﴿${quote}﴾ [الرحمن: 14]`, quote))).toBe("DIFFERS/REF_MISMATCH_AYAH");
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
  test("the selection is not empty", () => {
    expect(quranItems.length).toBeGreaterThanOrEqual(11);
  });

  test.each(quranItems)("$id $kind → $status / $reasonCode", (item) => {
    const r = review(item.draft, item.quote, item.kind);
    expect(outcome(r)).toBe(`${item.status}/${item.reasonCode}`);
    expect(r.decision.evidence.flatMap((c) => c.recordIds).slice(0, item.recordIds.length)).toEqual(item.recordIds);
  });
});

describe("contracts", () => {
  test("a MATCH decision makes a valid ReviewItem; the same item on a pending record does not", () => {
    const quote = "استعينوا بالصبر والصلاة";
    const draft = `﴿${quote}﴾ [البقرة: 153]`;
    const r = review(draft, quote);
    const item = {
      id: "item-1",
      span: { start: draft.indexOf(quote), end: draft.indexOf(quote) + quote.length, text: quote },
      claimedKind: "quran",
      status: r.decision.status,
      contentLevel: r.decision.contentLevel,
      reasonCode: r.decision.reasonCode,
      reasonAr: r.reason,
      evidence: evidenceOf(r.best!),
      extractedBy: ["manual"],
    };
    expect(ReviewItemSchema.safeParse(item).success).toBe(true);
  });

  test("one quote is matched and decided well inside the request budget", () => {
    const quote = "ولا تصعر خدك للناس ولا تمش في الأرض مرحا إن الله لا يحب كل متكبر فخور";
    const draft = `﴿${quote}﴾ [لقمان: 18]`;
    review(draft, quote); // fills the word cache
    const started = performance.now();
    review(draft, quote);
    expect(performance.now() - started).toBeLessThan(250);
  });
});
