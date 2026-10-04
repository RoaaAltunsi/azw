// The orchestrator (src/core/review.ts) on the real corpus (data/corpus), for hadith quotes: the
// regex extractor, the reference parser, both matchers and the status rules, end to end. It lives
// beside the loader because src/core may not read files. The drafts are test input written for
// this file; every record named below was read in data/corpus before its expectation was written.
// The tune cases are read from eval/cases/tune.jsonl; the held-out split is never read.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { regexExtractor } from "../core/extract";
import { normalizeWithMap } from "../core/normalize";
import { review as runReview, REVIEW_LIMITS } from "../core/review";
import { ReviewResultSchema, type ReviewItem, type ReviewResult } from "../core/types";
import { loadCorpus } from "./corpus-loader";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const corpus = loadCorpus(ROOT);
const deps = { ...corpus, extractors: [regexExtractor], now: () => 0 };

async function reviewDraft(draft: string): Promise<ReviewResult> {
  const result = await runReview(draft, deps);
  expect(ReviewResultSchema.safeParse(result).success).toBe(true);
  return result;
}

// A draft with one quote.
async function one(draft: string): Promise<ReviewItem> {
  const result = await reviewDraft(draft);
  expect(result.items).toHaveLength(1);
  return result.items[0]!;
}
const outcome = (item: ReviewItem): string => `${item.status}/${item.reasonCode}`;
const ids = (item: ReviewItem): string[] => item.evidence.map((e) => e.record.id);
const record = (id: string) => corpus.index.record(id)!;
// Diacritics removed: a text typed here and the corpus may order the marks of one letter differently.
const bare = (text: string): string => normalizeWithMap(text, "strict").norm;

const INTENTIONS = "إنما الأعمال بالنيات";
const said = (quote: string, after = ""): string => `قال رسول الله ﷺ: «${quote}»${after}.`;

describe("coverage", () => {
  test("the three collections are searched, and a result says so", async () => {
    const result = await reviewDraft("مقال ليس فيه اقتباس.");
    expect(result.coverage).toEqual(["quran", "bukhari", "muslim"]);
  });
});

describe("a text of the Sahihayn", () => {
  test("«إنما الأعمال بالنيات» → MATCH, with bukhari:1 among the evidence", async () => {
    const item = await one(said(INTENTIONS));
    expect(item.claimedKind).toBe("hadith");
    expect(outcome(item)).toBe("MATCH/MATCH_NO_REFERENCE");
    expect(ids(item)).toContain("bukhari:1");
    expect(item.reasonAr).toBe("النص مطابق لنص المصدر. لم يُذكر له مرجع في المسودة، ويُستحسن إضافته: صحيح البخاري، حديث رقم 1.");
  });

  test("the evidence shows exactText, and the diff ranges point into it", async () => {
    const item = await one(said(INTENTIONS));
    const [evidence] = item.evidence;
    expect(evidence!.record.exactText).toBe(record("bukhari:1").exactText);
    expect(evidence!.diff).toHaveLength(1);
    const { op, source } = evidence!.diff![0]!;
    expect(op).toBe("equal");
    expect(bare(evidence!.record.exactText.slice(source!.start, source!.end))).toBe(bare("إنما الأعمال بالنيات"));
    expect(JSON.stringify(item)).not.toMatch(/searchText|matnText/);
  });

  test("written without diacritics and with bare alefs, with its collection → MATCH_REF_OK", async () => {
    const item = await one(said("انما الاعمال بالنيات وانما لكل امرئ ما نوى", " رواه البخاري"));
    expect(outcome(item)).toBe("MATCH/MATCH_REF_OK");
    expect(ids(item)).toEqual(["bukhari:1"]);
  });

  test("a text in both books is one MATCH with every record; a cited book keeps its records only", async () => {
    const quote = "كلمتان خفيفتان على اللسان ثقيلتان في الميزان";
    const free = await one(said(quote));
    expect(outcome(free)).toBe("MATCH/MATCH_NO_REFERENCE");
    expect(ids(free)).toEqual(["bukhari:6406", "bukhari:6682", "muslim:6846"]);
    expect(free.reasonAr).toContain("صحيح البخاري، حديث رقم 6406 (وفي 2 من المواضع الأخرى)");
    const cited = await one(said(quote, " رواه مسلم"));
    expect(outcome(cited)).toBe("MATCH/MATCH_REF_OK");
    expect(ids(cited)).toEqual(["muslim:6846"]);
  });
});

describe("the cited reference", () => {
  // In the corpus «إنما الأعمال بالنيات» stands in bukhari:1 and in no Muslim record (Muslim's
  // wording is «بالنية»), so both references below disagree with the tool's copies.
  test("«إنما الأعمال بالنيات» with «رواه مسلم» → DIFFERS / REF_MISMATCH_COLLECTION", async () => {
    const item = await one(said(INTENTIONS, " رواه مسلم"));
    expect(outcome(item)).toBe("DIFFERS/REF_MISMATCH_COLLECTION");
    expect(ids(item)).toEqual(["bukhari:1"]);
    expect(item.reasonAr).toBe(
      "النص مطابق لنص المصدر (صحيح البخاري، حديث رقم 1)، لكننا لم نجده في نسختنا من الكتاب المذكور في المسودة. هذا لا يعني أنه ليس فيه؛ يُرجى مراجعة العزو قبل النشر.",
    );
  });

  test("«إنما الأعمال بالنيات» with «متفق عليه» → DIFFERS / REF_NOT_AGREED_UPON", async () => {
    const item = await one(said(INTENTIONS, " متفق عليه"));
    expect(item.citedReference?.parsed).toEqual({ type: "hadith", collections: ["bukhari", "muslim"] });
    expect(outcome(item)).toBe("DIFFERS/REF_NOT_AGREED_UPON");
    expect(ids(item)).toEqual(["bukhari:1"]);
    expect(item.reasonAr).toContain("لم نجده بهذا اللفظ في نسختنا من الكتاب الآخر");
  });

  test("«متفق عليه» on a text that stands in both books → MATCH_REF_OK", async () => {
    const item = await one(said("كلمتان خفيفتان على اللسان ثقيلتان في الميزان", " متفق عليه"));
    expect(outcome(item)).toBe("MATCH/MATCH_REF_OK");
    expect(ids(item)).toEqual(["bukhari:6406", "bukhari:6682", "muslim:6846"]);
  });

  test("«رواه البخاري» on a text found only in Muslim → DIFFERS / REF_MISMATCH_COLLECTION", async () => {
    const item = await one(said("الطهور شطر الإيمان", " رواه البخاري"));
    expect(outcome(item)).toBe("DIFFERS/REF_MISMATCH_COLLECTION");
    expect(ids(item)).toEqual(["muslim:534"]);
    expect(item.reasonAr).toContain("صحيح مسلم، حديث رقم 223");
  });

  test("a wrong number → DIFFERS / REF_MISMATCH_NUMBER; the right one → MATCH_REF_OK", async () => {
    const wrong = await one(said(INTENTIONS, " رواه البخاري (54)"));
    expect(outcome(wrong)).toBe("DIFFERS/REF_MISMATCH_NUMBER");
    expect(ids(wrong)).toEqual(["bukhari:1"]);
    expect(wrong.reasonAr).toBe(
      "النص مطابق لنص المصدر، لكن رقم الحديث في المسودة لا يوافق رقمه في المصدر، وقد يختلف الترقيم باختلاف الطبعات. المرجع في المصدر: صحيح البخاري، حديث رقم 1.",
    );
    expect(outcome(await one(said(INTENTIONS, " رواه البخاري (1)")))).toBe("MATCH/MATCH_REF_OK");
  });

  // muslim:534 is the record id (the source's running number); the corpus cites it as no. 223.
  test("a Muslim number is compared with the citation number, not with the record id", async () => {
    expect(record("muslim:534").citation.number).toBe("223");
    expect(outcome(await one(said("الطهور شطر الإيمان", " رواه مسلم (223)")))).toBe("MATCH/MATCH_REF_OK");
    expect(outcome(await one(said("الطهور شطر الإيمان", " رواه مسلم (534)")))).toBe("DIFFERS/REF_MISMATCH_NUMBER");
  });

  test("cited to a book the tool has no copy of → NEEDS_SPECIALIST / REF_NOT_CHECKED, never a wrong reference", async () => {
    const item = await one(said(INTENTIONS, " رواه الترمذي"));
    expect(item.citedReference?.parsed).toEqual({ type: "hadith", collections: ["tirmidhi"] });
    expect(outcome(item)).toBe("NEEDS_SPECIALIST/REF_NOT_CHECKED");
    expect(ids(item)).toEqual(["bukhari:1"]);
  });
});

describe("wording", () => {
  test("one changed word → DIFFERS / WORDING_DIFF, and the diff shows that word", async () => {
    const draft = said("إنما الأعمال بالنوايا وإنما لكل امرئ ما نوى");
    const item = await one(draft);
    expect(outcome(item)).toBe("DIFFERS/WORDING_DIFF");
    expect(ids(item)).toEqual(["bukhari:1"]);
    const replaced = item.evidence[0]!.diff!.filter((op) => op.op !== "equal");
    expect(replaced.map((op) => [op.op, draft.slice(op.draft!.start, op.draft!.end)])).toEqual([["replace", "بالنوايا"]]);
    expect(bare(record("bukhari:1").exactText.slice(replaced[0]!.source!.start, replaced[0]!.source!.end))).toBe(bare("بالنيات"));
    expect(item.reasonAr).not.toContain("بالنوايا");
  });

  test("a sentence not in the Sahihayn → NOT_FOUND, and the sentence names the three sources", async () => {
    const item = await one(said("من سار على الدرب وصل إلى غايته ولو بعد حين"));
    expect(outcome(item)).toBe("NOT_FOUND/NO_RECORD_IN_COVERED_SOURCES");
    expect(item.evidence).toEqual([]);
    expect(item.reasonAr).toBe("لم نجد هذا النص في المصادر المغطاة (القرآن الكريم، صحيح البخاري، صحيح مسلم). هذا لا يعني الحكم عليه؛ راجعه قبل النشر.");
  });
});

describe("short quotes", () => {
  // Two of the three words («من الإيمان») stand in several records, e.g. after «الحياء».
  test("a three-word saying that shares two words with real records is NOT_FOUND, not a near match of them", async () => {
    const item = await one("وكما في الحديث الشريف: «النظافة من الإيمان».");
    expect(outcome(item)).toBe("NOT_FOUND/NO_RECORD_IN_COVERED_SOURCES");
    expect(item.evidence).toEqual([]);
  });

  test("a short quote that is in a record word for word is still found", async () => {
    const item = await one(said("الحياء من الإيمان"));
    expect(item.status).toBe("MATCH");
  });
});

describe("kind", () => {
  test("a verse introduced with «قال رسول الله ﷺ» → DIFFERS / KIND_MISMATCH", async () => {
    const item = await one(said("استعينوا بالصبر والصلاة إن الله مع الصابرين"));
    expect(item.claimedKind).toBe("hadith");
    expect(outcome(item)).toBe("DIFFERS/KIND_MISMATCH");
    expect(ids(item)).toEqual(["quran:2:153"]);
  });

  // docs/DECISIONS.md D-22 item 2. The text stands in five records, each after a form of «قال الله».
  test("hadith qudsi: «قال الله تعالى: «أنا عند ظن عبدي بي»» is read as a hadith claim", async () => {
    const item = await one("قال الله تعالى: «أنا عند ظن عبدي بي».");
    expect(item.claimedKind).toBe("quran");
    expect(outcome(item)).toBe("MATCH/MATCH_NO_REFERENCE");
    expect(ids(item)).toEqual(["bukhari:7405", "bukhari:7505", "muslim:6805", "muslim:6829", "muslim:6952"]);
    const cited = await one("قال الله تعالى: «أنا عند ظن عبدي بي» رواه البخاري.");
    expect(outcome(cited)).toBe("MATCH/MATCH_REF_OK");
    expect(ids(cited)).toEqual(["bukhari:7405", "bukhari:7505"]);
  });

  test("the same words inside ﴿…﴾ claim a verse → DIFFERS / KIND_MISMATCH", async () => {
    const item = await one("قال الله تعالى: ﴿أنا عند ظن عبدي بي﴾.");
    expect(item.claimedKind).toBe("quran");
    expect(outcome(item)).toBe("DIFFERS/KIND_MISMATCH");
    expect(item.reasonAr).toContain("بوصفه حديث نبوي (صحيح البخاري، حديث رقم 7405");
  });

  test("a verse after «قال الله تعالى» in «…» is still answered by the Quran alone", async () => {
    const item = await one("قال الله تعالى: «استعينوا بالصبر والصلاة».");
    expect(outcome(item)).toBe("MATCH/MATCH_NO_REFERENCE");
    expect(ids(item)).toEqual(["quran:2:153"]);
  });
});

describe("pending records and grades", () => {
  // bukhari:2819 is held (docs/DECISIONS.md D-5); these words stand in no other record.
  const PENDING_ONLY = "لأطوفن الليلة على مائة امرأة أو تسع وتسعين كلهن يأتي بفارس يجاهد في سبيل الله";

  test("a text found only in pending records → NEEDS_SPECIALIST / SOURCE_NOT_REVIEWED, with no grade shown", async () => {
    expect(record("bukhari:2819").reviewStatus).toBe("pending");
    for (const after of ["", " رواه البخاري", " رواه مسلم"]) {
      const item = await one(said(PENDING_ONLY, after));
      expect(outcome(item)).toBe("NEEDS_SPECIALIST/SOURCE_NOT_REVIEWED");
      expect(ids(item)).toEqual(["bukhari:2819"]);
      expect(item.evidence[0]!.record).not.toHaveProperty("grade");
    }
  });

  test("a grade is the record's own, with its attribution; the matcher adds none", async () => {
    const item = await one(said(INTENTIONS));
    expect(item.evidence[0]!.record.grade).toEqual(record("bukhari:1").grade);
    expect(item.evidence[0]!.record.grade!.by).toBe("صحيح البخاري");
    expect(Object.keys(item.evidence[0]!)).not.toContain("grade");
  });
});

// Every tune case with a hadith claim. An expected record list names every record that holds the
// text; with a cited collection the result rests on the records the reference agrees with, so
// the evidence is compared as a part of that list.
interface TuneCase {
  id: string;
  draft: string;
  expected: Array<{ quote: string; kind: string; status: string; reasonCode: string; recordIds: string[] }>;
}
const tune = readFileSync(`${ROOT}/eval/cases/tune.jsonl`, "utf8")
  .split("\n")
  .filter((line) => line.trim() !== "")
  .map((line) => JSON.parse(line) as TuneCase)
  .filter((c) => c.expected.length === 1 && c.expected[0]!.kind === "hadith")
  .map((c) => ({ id: c.id, draft: c.draft, ...c.expected[0]! }));

describe("tune cases with a hadith claim", () => {
  test("the selection is not empty", () => {
    expect(tune.length).toBeGreaterThanOrEqual(8);
  });

  // Their attribution phrase is outside the regex extractor's list («يقول النبي ﷺ»): the quote is
  // the LLM extractor's to find, and the cases are measured by the evaluation runner.
  const needsLlm = new Set(["T-030", "T-032"]);

  test.each(tune)("$id → $status / $reasonCode", async (c) => {
    const result = await reviewDraft(c.draft);
    const item = result.items.find((i) => i.span.text === c.quote);
    if (needsLlm.has(c.id)) {
      expect(item).toBeUndefined();
      return;
    }
    expect(item).toBeDefined();
    expect(item!.claimedKind).toBe("hadith");
    expect(outcome(item!)).toBe(`${c.status}/${c.reasonCode}`);
    expect(ids(item!).length > 0).toBe(c.recordIds.length > 0);
    for (const id of ids(item!)) expect(c.recordIds).toContain(id);
  });
});

describe("bounds and time", () => {
  test("a two-word quote found in thousands of records returns a bounded item", async () => {
    const item = await one(said("رسول الله"));
    expect(outcome(item)).toBe("MATCH/MATCH_NO_REFERENCE");
    expect(item.evidence).toHaveLength(REVIEW_LIMITS.MAX_EVIDENCE_PER_ITEM);
    expect(item.reasonAr).toMatch(/\(وفي \d{4,} من المواضع الأخرى\)/);
  });

  test("one review of a draft with ten hadith quotes is well inside the request budget", async () => {
    const quotes = [
      "إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى",
      "الطهور شطر الإيمان",
      "خيركم من تعلم القرآن وعلمه",
      "بلغوا عني ولو آية",
      "كلمتان خفيفتان على اللسان ثقيلتان في الميزان حبيبتان إلى الرحمن",
      "ليس القوي بالصرعة إنما الشديد الذي يملك نفسه عند الغضب",
      "اطلبوا العلم ولو في الصين",
      "من حسن إسلام المرء تركه ما لا يعنيه",
      "أنا عند ظن عبدي بي",
      "لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه",
    ];
    const draft = quotes.map((quote, i) => said(quote, i % 2 ? " رواه البخاري" : "")).join("\n");
    const started = performance.now();
    const result = await reviewDraft(draft);
    const elapsed = performance.now() - started;
    expect(result.items).toHaveLength(10);
    expect(result.summary).toEqual({ MATCH: 6, DIFFERS: 2, NOT_FOUND: 2, NEEDS_SPECIALIST: 0, ERROR: 0 });
    expect(elapsed).toBeLessThan(1000);
  });
});
