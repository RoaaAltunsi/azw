import { describe, expect, test } from "vitest";
import { buildCorpusIndex, createQuranAdapter } from "../corpus";
import { QURAN_FIXTURE, SPELLING_FIXTURE } from "../corpus/test-fixtures";
import { ar, type MessageKey } from "../../i18n/ar";
import { quranMatcher } from "../matchers";
import { normalizeWithMap } from "../normalize";
import type { ClaimedKind } from "../types";
import { decide, reasonAr, REASON_CODES, type Decision } from "./index";

const index = buildCorpusIndex([createQuranAdapter(QURAN_FIXTURE, SPELLING_FIXTURE)]);
const coverage = ["المصدر الأول", "المصدر الثاني"];

function decisionFor(text: string, claimedKind: ClaimedKind = "quran"): Decision {
  const quote = { span: { start: 0, end: text.length, text }, claimedKind };
  return decide({ claimedKind, candidates: quranMatcher.match(quote, index) });
}

describe("reasonAr", () => {
  test("names the citation of the record, as the source data gives it", () => {
    expect(reasonAr(decisionFor("قل أعوذ برب الفلق"), { coverage })).toBe(
      "النص مطابق لنص المصدر. لم يُذكر له مرجع في المسودة، ويُستحسن إضافته: سورة 113، الآية 1.",
    );
  });

  test("a quote over several records names the first and the last", () => {
    expect(reasonAr(decisionFor("لم يلد ولم يولد ولم يكن له كفوا أحد"), { coverage })).toContain("من سورة 112، الآية 3 إلى سورة 112، الآية 4");
  });

  test("a text found in several places says so, and names the first", () => {
    expect(reasonAr(decisionFor("الله"), { coverage })).toContain("سورة 2، الآية 153 (وفي 2 من المواضع الأخرى)");
  });

  test("NOT_FOUND lists the covered sources and names no record", () => {
    expect(reasonAr(decisionFor("كلام لا يشبه شيئا من النصوص"), { coverage })).toBe(
      "لم نجد هذا النص في المصادر المغطاة (المصدر الأول، المصدر الثاني). هذا لا يعني الحكم عليه؛ راجعه قبل النشر.",
    );
  });

  test("a covered collection is shown by its name, an unnamed one by its id", () => {
    expect(reasonAr(decisionFor("كلام لا يشبه شيئا من النصوص"), { coverage: ["quran", "bukhari", "muslim", "alpha"] })).toContain(
      "(القرآن الكريم، صحيح البخاري، صحيح مسلم، alpha)",
    );
  });

  test("KIND_MISMATCH names the kind of the record that holds the text", () => {
    const sentence = reasonAr(decisionFor("قل أعوذ برب الفلق", "hadith"), { coverage });
    expect(sentence).toContain("آية قرآنية");
    expect(sentence).toContain("سورة 113، الآية 1");
  });

  test("WORDING_DIFF points to the source and does not repeat the altered text", () => {
    const altered = "ولم يكن له ندا أحد";
    const decision = decisionFor(altered);
    expect(decision.reasonCode).toBe("WORDING_DIFF");
    const sentence = reasonAr(decision, { coverage });
    expect(sentence).toContain("سورة 112، الآية 4");
    expect(sentence).not.toContain("ندا");
  });

  test("a claim needs no record", () => {
    expect(reasonAr(decisionFor("وتدل الآية على الوجوب", "interpretive_claim"), { coverage })).toBe(ar["reason.INTERPRETIVE_CLAIM"]);
  });
});

describe("reason sentences", () => {
  const codes = Object.values(REASON_CODES).flat();

  test.each(codes)("%s has a sentence, with no placeholder left unfilled", (code) => {
    const sentence = ar[`reason.${code}` as MessageKey];
    expect(sentence).toBeTruthy();
    expect([...sentence.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((name) => !["ref", "kind", "coverage"].includes(name!))).toEqual([]);
  });

  test("no sentence without a code", () => {
    const keys = Object.keys(ar).filter((k) => /^reason\.[A-Z_]+$/.test(k));
    expect(keys.sort()).toEqual(codes.map((c) => `reason.${c}`).sort());
  });

  // «صحيح» can be read as a judgment on authenticity (AGENTS.md §2 rule 4).
  test.each(codes)("%s never says «صحيح»", (code) => {
    const bare = normalizeWithMap(ar[`reason.${code}` as MessageKey], "strict").norm;
    expect(bare).not.toMatch(/صحيح/);
  });

  // NOT_FOUND must never read as a judgment on the text (AGENTS.md §4).
  test("the NOT_FOUND sentence does not call the text false, weak or fabricated", () => {
    expect(ar["reason.NO_RECORD_IN_COVERED_SOURCES"]).not.toMatch(/موضوع|مكذوب|ضعيف|باطل|لا أصل|غير موجود في/);
  });
});
