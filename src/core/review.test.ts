// The orchestrator on fixture records. The same pipeline on the real corpus is tested in
// src/server/quran-review.integration.test.ts.
import { describe, expect, test } from "vitest";
import { t } from "../i18n/ar";
import { buildCorpusIndex, createHadithAdapter, createQuranAdapter } from "./corpus";
import { ALPHA_FIXTURE, QURAN_FIXTURE, SPELLING_FIXTURE } from "./corpus/test-fixtures";
import { regexExtractor, type ExtractedQuote, type Extractor } from "./extract";
import { matchers, quranMatcher, type Matcher } from "./matchers";
import { review, searchedCoverage, type ReviewDeps } from "./review";
import { ReviewResultSchema, STATUSES } from "./types";

// The fixture corpus holds a Quran collection and a hadith collection; only "quran" has a matcher.
const index = buildCorpusIndex([createQuranAdapter(QURAN_FIXTURE, SPELLING_FIXTURE), createHadithAdapter("alpha", ALPHA_FIXTURE)]);
const aliases = {
  surahs: [{ number: 113, bareName: "الفلق", spellingVariants: [], alternateNames: [] }],
  collections: [],
};
const deps: ReviewDeps = { index, aliases, corpusVersion: "fixture-1", coverage: ["quran", "alpha"], extractors: [regexExtractor], now: () => 0 };

const manual = (draft: string, text: string, claimedKind = "quran", extractedBy: ExtractedQuote["extractedBy"] = "manual"): ExtractedQuote => {
  const start = draft.indexOf(text);
  return { span: { start, end: start + text.length, text }, claimedKind, extractedBy };
};

describe("review()", () => {
  test("a draft with no quote → zero items, every status counted as zero", async () => {
    const result = await review("مقال قصير ليس فيه اقتباس.", deps);
    expect(result).toEqual({
      apiVersion: "1",
      corpusVersion: "fixture-1",
      coverage: ["quran"],
      items: [],
      summary: { MATCH: 0, DIFFERS: 0, NOT_FOUND: 0, NEEDS_SPECIALIST: 0, ERROR: 0 },
      warnings: ["LLM_UNAVAILABLE_REGEX_ONLY"],
    });
    expect(Object.keys(result.summary)).toEqual([...STATUSES]);
  });

  test("two quotes in one draft → two items in draft order, with ids from their positions", async () => {
    const draft = "قال تعالى: ﴿قل أعوذ برب الفلق﴾ [الفلق: 1]. ثم ﴿كلام لا يشبه شيئا من النصوص﴾.";
    const result = await review(draft, deps);
    expect(ReviewResultSchema.safeParse(result).success).toBe(true);
    expect(result.items.map((i) => [i.status, i.reasonCode, i.span.text])).toEqual([
      ["MATCH", "MATCH_REF_OK", "قل أعوذ برب الفلق"],
      ["NOT_FOUND", "NO_RECORD_IN_COVERED_SOURCES", "كلام لا يشبه شيئا من النصوص"],
    ]);
    expect(result.summary).toEqual({ MATCH: 1, DIFFERS: 0, NOT_FOUND: 1, NEEDS_SPECIALIST: 0, ERROR: 0 });
    for (const item of result.items) {
      expect(item.id).toBe(`item-${item.span.start}-${item.span.end}`);
      expect(draft.slice(item.span.start, item.span.end)).toBe(item.span.text);
      expect(item.extractedBy).toEqual(["regex"]);
    }
    const [match, notFound] = result.items;
    expect(match!.citedReference).toEqual({
      raw: "[الفلق: 1]",
      span: { start: draft.indexOf("[الفلق"), end: draft.indexOf("[الفلق") + "[الفلق: 1]".length },
      parsed: { type: "quran", surah: 113, ayahStart: 1 },
    });
    expect(match!.evidence.map((e) => e.record.id)).toEqual(["quran:113:1"]);
    expect(notFound!.citedReference).toBeUndefined();
    expect(notFound!.evidence).toEqual([]);
  });

  test("the same draft twice → identical results", async () => {
    const draft = "﴿قل أعوذ برب الفلق﴾ ثم قال رسول الله ﷺ: «لم يلد ولم يولد» ثم ﴿ولم يكن له ندا أحد﴾";
    const first = await review(draft, deps);
    const second = await review(draft, deps);
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(first.items.map((i) => i.status)).toEqual(["MATCH", "DIFFERS", "DIFFERS"]);
  });

  test("a matcher that throws for one item → that item is ERROR, the other is unchanged", async () => {
    const draft = "﴿قل أعوذ برب الفلق﴾ ثم ﴿لم يلد ولم يولد﴾";
    const failing: Matcher = {
      kind: "quran",
      match: (quote, idx) => {
        if (quote.span.text.includes("يولد")) throw new Error("boom");
        return quranMatcher.match(quote, idx);
      },
    };
    const healthy = await review(draft, deps);
    const result = await review(draft, { ...deps, matchers: { quran: failing } });
    expect(ReviewResultSchema.safeParse(result).success).toBe(true);
    expect(result.items[0]).toEqual(healthy.items[0]);
    expect(result.items[1]).toEqual({
      id: healthy.items[1]!.id,
      span: healthy.items[1]!.span,
      claimedKind: "quran",
      status: "ERROR",
      contentLevel: "A",
      reasonCode: "INTERNAL_ERROR",
      reasonAr: t("item.error.INTERNAL_ERROR"),
      evidence: [],
      extractedBy: ["regex"],
    });
    expect(result.summary).toEqual({ MATCH: 1, DIFFERS: 0, NOT_FOUND: 0, NEEDS_SPECIALIST: 0, ERROR: 1 });
  });

  test("evidence records carry no retrieval key", async () => {
    const result = await review("﴿لم يلد ولم يولد ولم يكن له كفوا أحد﴾", deps);
    expect(result.items[0]!.evidence).toHaveLength(2);
    for (const { record } of result.items[0]!.evidence) {
      expect(Object.keys(record).sort()).toEqual(["citation", "collection", "edition", "exactText", "id", "kind", "license", "reviewStatus", "sourceName"]);
    }
    expect(JSON.stringify(result)).not.toMatch(/searchText|searchVariants|matnText/);
  });
});

describe("coverage is what is searched", () => {
  test("a collection whose kind has no matcher is not in the coverage", () => {
    expect(searchedCoverage(["quran", "alpha"], index, matchers)).toEqual(["quran"]);
    expect(searchedCoverage(["quran", "alpha"], index, {})).toEqual([]);
  });

  test("registering a matcher for the kind widens it", async () => {
    const hadithMatcher: Matcher = { kind: "hadith", match: () => [] };
    const registry = { ...matchers, hadith: hadithMatcher };
    expect(searchedCoverage(["quran", "alpha"], index, registry)).toEqual(["quran", "alpha"]);
    const result = await review("قال رسول الله ﷺ: «كلام لا يشبه شيئا من النصوص»", { ...deps, matchers: registry });
    expect(result.coverage).toEqual(["quran", "alpha"]);
    expect(result.items[0]!.reasonAr).toContain("(القرآن الكريم، alpha)");
  });

  test("a text the hadith collection holds is NOT_FOUND, and the sentence names only what was searched", async () => {
    const text = "أخبرنا فلان أن الماء كان قليلا في تلك السنة";
    const layer = { collection: "alpha", layer: "default" };
    expect(index.findExact(index.normalizeFor(layer, text).norm, layer)).not.toEqual([]);
    const result = await review(`قال رسول الله ﷺ: «${text}»`, deps);
    expect(result.coverage).toEqual(["quran"]);
    expect(result.items[0]!.status).toBe("NOT_FOUND");
    expect(result.items[0]!.reasonAr).toBe("لم نجد هذا النص في المصادر المغطاة (القرآن الكريم). هذا لا يعني الحكم عليه؛ راجعه قبل النشر.");
  });
});

describe("validation and merge of extracted spans", () => {
  const draft = "﴿قل أعوذ برب الفلق﴾ ثم ﴿لم يلد ولم يولد﴾";

  test("a span that is not in the draft verbatim is dropped", async () => {
    const invented: Extractor = () => [
      { span: { start: 1, end: 18, text: "قل أعوذ برب الناس" }, claimedKind: "quran", extractedBy: "llm" }, // other words
      { span: { start: 30, end: 500, text: "لم يلد" }, claimedKind: "quran", extractedBy: "llm" }, // outside the draft
      { span: { start: 5, end: 5, text: "" }, claimedKind: "quran", extractedBy: "llm" }, // empty
      { span: { start: 1.5, end: 4, text: "قل" }, claimedKind: "quran", extractedBy: "llm" }, // not an offset
      manual(draft, "لم يلد ولم يولد", "quran", "llm"),
    ];
    const result = await review(draft, { ...deps, extractors: [invented] });
    expect(result.items.map((i) => i.span.text)).toEqual(["لم يلد ولم يولد"]);
  });

  test("the same span from two extractors is one item that names both; the first extractor's kind is kept", async () => {
    const second: Extractor = (d) => [manual(d, "قل أعوذ برب الفلق", "hadith", "llm")];
    const result = await review(draft, { ...deps, extractors: [regexExtractor, second] });
    expect(result.items).toHaveLength(2);
    expect(result.items[0]!.extractedBy).toEqual(["regex", "llm"]);
    expect(result.items[0]!.claimedKind).toBe("quran");
    const reversed = await review(draft, { ...deps, extractors: [second, regexExtractor] });
    expect(reversed.items[0]!.extractedBy).toEqual(["regex", "llm"]);
    expect(reversed.items[0]!.claimedKind).toBe("hadith");
  });

  test("a span overlapping one already kept is dropped", async () => {
    const overlapping: Extractor = (d) => [manual(d, "أعوذ برب"), manual(d, "برب الفلق﴾ ثم"), manual(d, "قل أعوذ برب الفلق")];
    const result = await review(draft, { ...deps, extractors: [overlapping] });
    expect(result.items.map((i) => i.span.text)).toEqual(["قل أعوذ برب الفلق"]);
  });

  test("a claim passes through with its level", async () => {
    const claim: Extractor = (d) => [{ ...manual(d, "لم يلد ولم يولد", "interpretive_claim", "llm"), claimLevel: "D" }];
    const result = await review(draft, { ...deps, extractors: [claim] });
    expect(result.items.map((i) => [i.status, i.reasonCode, i.contentLevel, i.evidence.length])).toEqual([["NEEDS_SPECIALIST", "PERSONAL_RULING", "D", 0]]);
  });
});

describe("bounds", () => {
  test("the evidence is capped per item, and the sentence still counts every occurrence", async () => {
    const result = await review("﴿الله﴾", { ...deps, limits: { MAX_EVIDENCE_PER_ITEM: 1, MAX_ITEMS_PER_DRAFT: 40 } });
    const [item] = result.items;
    expect(item!.status).toBe("MATCH");
    expect(item!.evidence.map((e) => e.record.id)).toEqual(["quran:2:153"]);
    expect(item!.reasonAr).toContain("(وفي 2 من المواضع الأخرى)");
  });

  test("the cap counts occurrences: one that runs over two records shows both", async () => {
    const result = await review("﴿لم يلد ولم يولد ولم يكن له كفوا أحد﴾", { ...deps, limits: { MAX_EVIDENCE_PER_ITEM: 1, MAX_ITEMS_PER_DRAFT: 40 } });
    expect(result.items[0]!.evidence.map((e) => e.record.id)).toEqual(["quran:112:3", "quran:112:4"]);
  });

  test("the items are capped per draft, in draft order, with a warning", async () => {
    const draft = "﴿قل أعوذ برب الفلق﴾ ﴿لم يلد ولم يولد﴾ ﴿ولم يكن له كفوا أحد﴾";
    const result = await review(draft, { ...deps, limits: { MAX_EVIDENCE_PER_ITEM: 5, MAX_ITEMS_PER_DRAFT: 2 } });
    expect(result.items.map((i) => i.span.text)).toEqual(["قل أعوذ برب الفلق", "لم يلد ولم يولد"]);
    expect(result.warnings).toEqual(["LLM_UNAVAILABLE_REGEX_ONLY", "ITEM_LIMIT_REACHED"]);
    expect((await review(draft, deps)).warnings).toEqual(["LLM_UNAVAILABLE_REGEX_ONLY"]);
  });
});
