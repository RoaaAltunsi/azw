// Corrections on the real corpus (data/corpus), end to end: the regex extractor, the reference
// parser, both matchers, the status rules, src/core/correct, and the function the UI applies a
// correction with (src/components/lib/revised-draft.ts). The property that matters: a correction
// the tool offers, once applied, gives a draft the tool itself reviews as MATCH on the same
// record, and changes nothing else. The drafts are test input written for this file; no evaluation
// case is read. Source text is never typed here: it is read from the records.
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { revisedDraft } from "../components/lib/revised-draft";
import { regexExtractor } from "../core/extract";
import { review as runReview } from "../core/review";
import { ReviewResultSchema, type Correction, type Evidence, type ReviewItem } from "../core/types";
import { loadCorpus } from "./corpus-loader";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const corpus = loadCorpus(ROOT);
const deps = { ...corpus, extractors: [regexExtractor], now: () => 0 };
const record = (id: string) => corpus.index.record(id)!;

// A draft with one quote.
async function one(draft: string): Promise<ReviewItem> {
  const result = await runReview(draft, deps);
  expect(ReviewResultSchema.safeParse(result).success).toBe(true);
  expect(result.items).toHaveLength(1);
  return result.items[0]!;
}
const outcome = (item: ReviewItem): string => `${item.status}/${item.reasonCode}`;
const corrections = (item: ReviewItem): Array<Correction | undefined> => item.evidence.map((e) => e.correction);
const offered = (item: ReviewItem): Evidence[] => item.evidence.filter((e) => e.correction);

// Applies the correction of one evidence record as the UI does, and checks that the rest of the
// draft is the writer's, character for character.
function apply(draft: string, item: ReviewItem, recordId: string): string {
  const { correction } = item.evidence.find((e) => e.record.id === recordId)!;
  const revised = revisedDraft(draft, [item], { [item.id]: recordId });
  expect(revised).toBe(draft.slice(0, correction!.draft.start) + correction!.text + draft.slice(correction!.draft.end));
  expect(revised).not.toBe(draft);
  return revised;
}

// The round trip: the revised draft, reviewed again, is a MATCH on the same record with its
// reference confirmed, and offers nothing more.
async function expectMatchAfter(draft: string, item: ReviewItem, recordId: string, reason = "MATCH_REF_OK"): Promise<string> {
  const revised = apply(draft, item, recordId);
  const again = await one(revised);
  expect(outcome(again), revised).toBe(`MATCH/${reason}`);
  expect(again.evidence.map((e) => e.record.id)).toContain(recordId);
  expect(offered(again)).toEqual([]);
  return revised;
}

describe("the owner's example: a social-media post with one wrong word and the right reference", () => {
  const draft = "“تذكير بسيط لي ولكم 🌿\nقال تعالى: «إن مع الصبر يسرا» [الشرح: 6].\nخلونا نكمل يومنا بأمل، حتى لو كانت البداية صعبة.\n#تذكير”";

  test("the cited ayah is the one meant: DIFFERS / WORDING_DIFF, not a low-confidence guess", async () => {
    const item = await one(draft);
    expect(outcome(item)).toBe("DIFFERS/WORDING_DIFF");
    expect(item.evidence.map((e) => e.record.id)).toEqual(["quran:94:6"]);
    // Three words of four: below T_HIGH. The reference names the place.
    expect(item.evidence[0]!.score).toBe(0.75);
  });

  test("the correction is the whole ayah as the record holds it, and the post is otherwise untouched", async () => {
    const item = await one(draft);
    const ayah = record("quran:94:6").exactText;
    expect(corrections(item)).toEqual([{ target: "wording", draft: { start: draft.indexOf("إن مع"), end: draft.indexOf("»") }, text: ayah }]);
    const revised = await expectMatchAfter(draft, item, "quran:94:6");
    expect(revised).toBe(`“تذكير بسيط لي ولكم 🌿\nقال تعالى: «${ayah}» [الشرح: 6].\nخلونا نكمل يومنا بأمل، حتى لو كانت البداية صعبة.\n#تذكير”`);
  });

  test("without the reference the likeness alone is not enough: nothing is offered", async () => {
    const item = await one("قال تعالى: «إن مع الصبر يسرا».");
    expect(item.status).toBe("NEEDS_SPECIALIST");
    expect(offered(item)).toEqual([]);
  });

  test("with a reference to another ayah, neither the wording nor the reference is touched", async () => {
    const item = await one("قال تعالى: ﴿إن مع الصبر يسرا﴾ [الشرح: 9].");
    expect(item.status).toBe("NEEDS_SPECIALIST");
    expect(offered(item)).toEqual([]);
  });
});

describe("a wrong reference on a text that matches", () => {
  test("a wrong ayah number, in square brackets", async () => {
    const draft = "وقال سبحانه: ﴿إن مع العسر يسرا﴾ [الشرح: 7]. انتهى";
    const item = await one(draft);
    expect(outcome(item)).toBe("DIFFERS/REF_MISMATCH_AYAH");
    const citation = record("quran:94:6").citation.display;
    expect(corrections(item)).toEqual([{ target: "reference", draft: { start: draft.indexOf("["), end: draft.indexOf("]") + 1 }, text: `[${citation}]` }]);
    expect(await expectMatchAfter(draft, item, "quran:94:6")).toBe(`وقال سبحانه: ﴿إن مع العسر يسرا﴾ [${citation}]. انتهى`);
  });

  test("a wrong surah, in round brackets, on a text that stands in two places: each place has its own correction", async () => {
    const draft = "قال تعالى: ﴿إن الله مع الصابرين﴾ (سورة آل عمران: 153) وهذا كلامي";
    const item = await one(draft);
    expect(outcome(item)).toBe("DIFFERS/REF_MISMATCH_SURAH");
    expect(item.evidence.map((e) => [e.record.id, e.correction?.text])).toEqual([
      ["quran:2:153", `(${record("quran:2:153").citation.display})`],
      ["quran:8:46", `(${record("quran:8:46").citation.display})`],
    ]);
    // Whichever place the writer chooses, the revised draft is a MATCH there.
    for (const id of ["quran:2:153", "quran:8:46"]) {
      const revised = await expectMatchAfter(draft, item, id);
      expect(revised.endsWith(") وهذا كلامي")).toBe(true);
    }
  });

  test("a reference written before the quote, without brackets", async () => {
    const draft = "قال تعالى في سورة البقرة آية 154: ﴿إن الله مع الصابرين﴾ ثم كلامي";
    const item = await one(draft);
    expect(outcome(item)).toBe("DIFFERS/REF_MISMATCH_AYAH");
    const revised = await expectMatchAfter(draft, item, "quran:2:153");
    expect(revised).toBe(`قال تعالى في ${record("quran:2:153").citation.display}: ﴿إن الله مع الصابرين﴾ ثم كلامي`);
  });

  test("a hadith number or book that differs is never corrected: the tool's own sentence says it may be right", async () => {
    const number = await one("وقال رسول الله ﷺ: «إنما الأعمال بالنيات» رواه البخاري (5).");
    expect(outcome(number)).toBe("DIFFERS/REF_MISMATCH_NUMBER");
    expect(offered(number)).toEqual([]);
  });
});

describe("a wording that differs", () => {
  test("a verse without a reference: the stretch the quote was aligned to, pause mark included", async () => {
    const draft = "قال تعالى: ﴿يا أيها الذين آمنوا استعينوا بالصبر والصلاة إن الله يحب الصابرين﴾";
    const item = await one(draft);
    expect(outcome(item)).toBe("DIFFERS/WORDING_DIFF");
    expect(corrections(item)).toEqual([{ target: "wording", draft: { start: draft.indexOf("يا"), end: draft.indexOf("﴾") }, text: record("quran:2:153").exactText }]);
    await expectMatchAfter(draft, item, "quran:2:153", "MATCH_NO_REFERENCE");
  });

  test("a part of an ayah: only that part of the record is put in the draft", async () => {
    const draft = "قال تعالى: ﴿استعينوا بالصبر والزكاة إن الله مع الصابرين﴾ [البقرة: 153]";
    const item = await one(draft);
    expect(outcome(item)).toBe("DIFFERS/WORDING_DIFF");
    const [correction] = corrections(item);
    const ayah = record("quran:2:153").exactText;
    expect(ayah.endsWith(correction!.text)).toBe(true);
    expect(correction!.text.length).toBeLessThan(ayah.length);
    await expectMatchAfter(draft, item, "quran:2:153");
  });

  test("a hadith cited to the book that holds it", async () => {
    const draft = "وقال رسول الله ﷺ: «إنما الأعمال بالنية وإنما لكل امرئ ما نوى» رواه البخاري.";
    const item = await one(draft);
    expect(outcome(item)).toBe("DIFFERS/WORDING_DIFF");
    const [correction] = corrections(item);
    expect(correction?.target).toBe("wording");
    expect(record(item.evidence[0]!.record.id).exactText).toContain(correction!.text);
    const revised = await expectMatchAfter(draft, item, item.evidence[0]!.record.id);
    expect(revised.startsWith("وقال رسول الله ﷺ: «")).toBe(true);
    expect(revised.endsWith("» رواه البخاري.")).toBe(true);
  });

  const abstains: Array<[string, string]> = [
    ["a hadith cited to a book the tool has no copy of", "وقال رسول الله ﷺ: «إنما الأعمال بالنية وإنما لكل امرئ ما نوى» رواه الترمذي."],
    ["a word only the draft has at the end of the quote", "قال تعالى: ﴿إن مع العسر يسرا كبيرا﴾ [الشرح: 6]"],
    ["a quote over two ayat", "قال تعالى: ﴿فإن مع العسر يسرا إن مع الصبر يسرا﴾ [الشرح: 5-6]"],
    ["a verse's words attributed to the Prophet ﷺ", "قال رسول الله ﷺ: «يا أيها الذين آمنوا استعينوا بالصبر والصلاة إن الله يحب الصابرين»"],
  ];
  test.each(abstains)("nothing is offered: %s", async (_name, draft) => {
    const item = await one(draft);
    expect(item.status).toBe("DIFFERS");
    expect(offered(item)).toEqual([]);
  });
});

test("items that are not DIFFERS never carry a correction", async () => {
  const drafts = [
    "قال تعالى: ﴿إن مع العسر يسرا﴾ [الشرح: 6].",
    "قال تعالى: ﴿إن مع العسر يسرا﴾.",
    "قال رسول الله ﷺ: «اطلبوا العلم ولو في الصين».",
    "قال رسول الله ﷺ: «إنما الأعمال بالنيات» رواه الترمذي.",
  ];
  for (const draft of drafts) {
    const item = await one(draft);
    expect(item.status, draft).not.toBe("DIFFERS");
    expect(offered(item), draft).toEqual([]);
  }
});

// Every STEP-th ayah of the mushaf, written the way a writer types it (no diacritics), once with
// the next ayah's number and once with a word of the writer's in the middle. Whatever the tool
// offers must survive the round trip; what it does not offer is not this test's concern.
// CORRECTIONS_SWEEP_STEP=1 runs it on all 6236 ayat (minutes; measured in docs/DECISIONS.md D-25).
describe("a sweep over the Quran: every offered correction ends MATCH", () => {
  const STEP = Number(process.env.CORRECTIONS_SWEEP_STEP ?? 41);
  const TIMEOUT = 300_000 * Math.ceil(41 / STEP);
  const names = new Map(corpus.aliases.surahs.map((s) => [s.number, s.bareName]));
  const sample: Array<{ id: string; surah: number; ayah: number; text: string }> = [];
  let seen = 0;
  for (let surah = 1; surah <= 114; surah++) {
    for (let ayah = 1; corpus.index.record(`quran:${surah}:${ayah}`); ayah++) {
      if (seen++ % STEP === 0) sample.push({ id: `quran:${surah}:${ayah}`, surah, ayah, text: record(`quran:${surah}:${ayah}`).searchText });
    }
  }

  test("the sample covers the mushaf", () => {
    expect(seen).toBe(6236);
    expect(sample.length).toBe(Math.ceil(6236 / STEP));
  });

  test("a wrong ayah number", async () => {
    let applied = 0;
    for (const { id, surah, ayah, text } of sample) {
      const draft = `قال تعالى: ﴿${text}﴾ [${names.get(surah)}: ${ayah + 1}].`;
      const item = await one(draft);
      if (!item.evidence.find((e) => e.record.id === id)?.correction) continue;
      expect(outcome(item), draft).toMatch(/^DIFFERS\/REF_MISMATCH_(AYAH|SURAH)$/);
      await expectMatchAfter(draft, item, id);
      applied++;
    }
    console.info(`wrong ayah number: ${applied} of ${sample.length} corrected and matched`);
    expect(applied / sample.length).toBeGreaterThan(0.8);
  }, TIMEOUT);

  test("a wrong word in the middle", async () => {
    let applied = 0;
    let eligible = 0;
    for (const { id, surah, ayah, text } of sample) {
      const words = text.split(" ");
      if (words.length < 6) continue;
      eligible++;
      words[Math.floor(words.length / 2)] = "كلمة";
      const draft = `كتبت اليوم: قال تعالى: ﴿${words.join(" ")}﴾ [${names.get(surah)}: ${ayah}]. انتهى كلامي 🌿`;
      const item = await one(draft);
      const entry = item.evidence.find((e) => e.record.id === id);
      if (!entry?.correction) continue;
      expect(outcome(item), draft).toBe("DIFFERS/WORDING_DIFF");
      expect(record(id).exactText).toContain(entry.correction.text);
      const revised = await expectMatchAfter(draft, item, id);
      expect(revised.startsWith("كتبت اليوم: قال تعالى: ﴿")).toBe(true);
      expect(revised.endsWith(`﴾ [${names.get(surah)}: ${ayah}]. انتهى كلامي 🌿`)).toBe(true);
      applied++;
    }
    console.info(`wrong word: ${applied} of ${eligible} corrected and matched`);
    expect(applied / eligible).toBeGreaterThan(0.8);
  }, TIMEOUT);
});
