// What the components put on the page, rendered to static markup (no browser needed).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { STATUSES, type ReviewResult } from "@/core/types";
import { t } from "@/i18n/ar";
import { ResultsView } from "./ResultsView";
import { ReviewCard } from "./ReviewCard";
import { searchedSources } from "./SourcesRegister";
import { StatusPill } from "./StatusPill";
import { AYAH_153, evidence, item } from "./lib/test-fixtures";
import { toHealthState } from "./useHealth";

const card = (reviewItem: Parameters<typeof item>[0]) =>
  renderToStaticMarkup(createElement(ReviewCard, { item: item(reviewItem), index: 1 }));

// The text of the markup, without tags: what a reader sees.
const textOf = (html: string) => html.replace(/<[^>]+>/g, "");

test.each(STATUSES)("status pill — %s: its label and an icon, never color alone", (status) => {
  const html = renderToStaticMarkup(createElement(StatusPill, { status }));
  expect(html).toContain(t(`status.${status}`));
  expect(html).toContain("<svg");
  expect(html).toContain(`data-status="${status}"`);
});

test("a card shows exactText between ﴿ ﴾, the citation, the reason and the source link", () => {
  const html = card({
    span: { start: 0, end: 19, text: "إن الله مع الصابرين" },
    reasonAr: "جملة السبب من الخدمة.",
    citedReference: { raw: "[البقرة: 153]" },
    evidence: [
      evidence({
        id: "quran:2:153",
        display: "سورة البقرة، الآية 153",
        ayahRange: [153, 153],
        sourceUrl: "https://quranpedia.net",
        diff: [{ op: "equal", draft: { start: 0, end: 19 }, source: { recordId: "quran:2:153", start: 71, end: 103 } }],
      }),
    ],
  });
  expect(textOf(html)).toContain(`﴿${AYAH_153}﴾`);
  expect(textOf(html)).toContain("المرجع في المصدر: سورة البقرة، الآية 153");
  expect(textOf(html)).toContain("جملة السبب من الخدمة.");
  expect(textOf(html)).toContain("المرجع المذكور في المسودة: [البقرة: 153]");
  expect(html).toContain('href="https://quranpedia.net"');
  expect(html).toContain(t("card.compare.show"));
  expect(html).toContain(t("card.copy"));
  expect(html).toContain("trace-line");
  // Nothing was generated, so nothing is labeled as generated; no grade, so none is shown.
  expect(html).not.toContain(t("explanation.generatedLabel"));
  expect(html).not.toContain("الحكم كما ورد");
});

test("a difference is marked in both texts", () => {
  const html = card({
    span: { start: 0, end: 7, text: "aa bb x" },
    status: "DIFFERS",
    evidence: [
      evidence({
        id: "r",
        exactText: "aa cc bb",
        diff: [
          { op: "equal", draft: { start: 0, end: 2 }, source: { recordId: "r", start: 0, end: 2 } },
          { op: "delete", source: { recordId: "r", start: 3, end: 5 } },
          { op: "equal", draft: { start: 3, end: 5 }, source: { recordId: "r", start: 6, end: 8 } },
          { op: "insert", draft: { start: 6, end: 7 } },
        ],
      }),
    ],
  });
  expect(html).toMatch(/<mark class="diff-mark diff-insert"[^>]*>x<\/mark>/);
  expect(html).toMatch(/<mark class="diff-mark diff-delete"[^>]*>cc<\/mark>/);
  expect(html).toContain(t("diff.legend"));
});

test("an ERROR item shows its reason and nothing from a source", () => {
  // The API never sends this; the card must not show it even so.
  const html = card({
    span: { start: 0, end: 3, text: "نقل" },
    status: "ERROR",
    reasonCode: "INTERNAL_ERROR",
    reasonAr: t("item.error.INTERNAL_ERROR"),
    evidence: [evidence({ id: "quran:2:153" })],
    explanation: { text: "شرح", generated: true },
  });
  expect(html).toContain(t("status.ERROR"));
  expect(html).toContain(t("item.error.INTERNAL_ERROR"));
  expect(html).not.toContain("الصَّابِرِينَ");
  expect(html).not.toContain(t("card.source.label"));
  expect(html).not.toContain(t("card.copy"));
  expect(html).not.toContain(t("explanation.generatedLabel"));
});

test("an item without evidence shows no source block and no copy button", () => {
  const html = card({ span: { start: 0, end: 3, text: "نقل" }, status: "NOT_FOUND", claimedKind: "hadith" });
  expect(html).toContain(t("status.NOT_FOUND"));
  expect(html).toContain("حديث نبوي");
  expect(html).not.toContain(t("card.source.label"));
  expect(html).not.toContain(t("card.copy"));
  expect(html).not.toContain("trace-line");
});

test("generated text is labeled and stands outside the source block", () => {
  const html = card({
    span: { start: 0, end: 3, text: "نقل" },
    evidence: [evidence({ id: "quran:2:153" })],
    explanation: { text: "نص الشرح المولّد", generated: true },
  });
  const label = html.indexOf(t("explanation.generatedLabel"));
  expect(label).toBeGreaterThan(-1);
  expect(html.indexOf("نص الشرح المولّد")).toBeGreaterThan(label);
  // The source block closes before the generated text begins.
  const sourceBlock = html.indexOf(t("card.source.label"));
  expect(sourceBlock).toBeGreaterThan(-1);
  expect(html.indexOf("</section>", sourceBlock)).toBeLessThan(label);
});

test("a grade is shown only when the record has one, with its «by»; a pending record says so", () => {
  const graded = card({
    span: { start: 0, end: 3, text: "نقل" },
    evidence: [
      evidence({
        id: "bukhari:1",
        kind: "hadith",
        collection: "bukhari",
        grade: { text: "صحيح", by: "صحيح البخاري", sourceRef: "1" },
      }),
    ],
  });
  expect(textOf(graded)).toContain("الحكم كما ورد في بيانات المصدر: صحيح — صحيح البخاري");
  // A kind without marks of its own is shown bare.
  expect(graded).not.toContain("﴿");

  const pending = card({
    span: { start: 0, end: 3, text: "نقل" },
    status: "NEEDS_SPECIALIST",
    evidence: [evidence({ id: "bukhari:2", kind: "hadith", collection: "bukhari", reviewStatus: "pending" })],
  });
  expect(pending).toContain(t("card.source.pending"));
  expect(pending).not.toContain("الحكم كما ورد");
});

test("several occurrences: one button per place, the first shown", () => {
  const html = card({
    span: { start: 0, end: 3, text: "نقل" },
    evidence: [
      evidence({ id: "a", exactText: "النص الأول", display: "الموضع أ", ayahRange: [5, 5] }),
      evidence({ id: "b", exactText: "النص الثاني", display: "الموضع ب", ayahRange: [6, 6] }),
    ],
  });
  expect(textOf(html)).toContain("الموضع 1: الموضع أ");
  expect(textOf(html)).toContain("الموضع 2: الموضع ب");
  expect(html).toContain("النص الأول");
  expect(html).not.toContain("النص الثاني");
});

const result = (overrides: Partial<ReviewResult>): ReviewResult => ({
  apiVersion: "1",
  corpusVersion: "test",
  coverage: ["quran"],
  items: [],
  summary: { MATCH: 0, DIFFERS: 0, NOT_FOUND: 0, NEEDS_SPECIALIST: 0, ERROR: 0 },
  warnings: [],
  ...overrides,
});

test("results: the summary, the warnings in their wording, a highlight that links to its card", () => {
  const draft = "قال: ﴿نقل﴾";
  const reviewItem = item({ span: { start: 6, end: 9, text: "نقل" }, status: "NOT_FOUND" });
  const html = renderToStaticMarkup(
    createElement(ResultsView, {
      draft,
      stale: false,
      result: result({
        items: [reviewItem],
        summary: { MATCH: 0, DIFFERS: 0, NOT_FOUND: 1, NEEDS_SPECIALIST: 0, ERROR: 0 },
        warnings: ["LLM_UNAVAILABLE_REGEX_ONLY", "ITEM_LIMIT_REACHED"],
      }),
    }),
  );
  expect(textOf(html)).toContain("1 نقول: 0 مطابق · 0 مختلف · 0 يحتاج مراجعة · 1 لم يُتحقق منه");
  expect(html).toContain(t("warning.LLM_UNAVAILABLE_REGEX_ONLY"));
  expect(html).toContain(t("warning.ITEM_LIMIT_REACHED"));
  expect(html).toMatch(/<a href="#card-item-6-9" class="draft-mark" data-status="NOT_FOUND"/);
  expect(html).toContain('id="card-item-6-9"');
  expect(html).not.toContain(t("state.stale"));
});

test("results: no quotes found is said plainly, with no summary row", () => {
  const html = renderToStaticMarkup(createElement(ResultsView, { draft: "نص", stale: true, result: result({}) }));
  expect(html).toContain(t("state.noQuotes.title"));
  expect(html).toContain(t("extract.formsNote"));
  expect(html).toContain(t("state.stale"));
  expect(html).not.toContain("0 مطابق");
});

test("no source is named unless the API says it is searched", () => {
  expect(searchedSources(["quran"]).map((s) => s.id)).toEqual(["quran"]);
  expect(searchedSources(["quran", "bukhari"]).map((s) => s.id)).toEqual(["quran"]);
  expect(searchedSources(["quran", "bukhari", "muslim"]).map((s) => s.id)).toEqual(["quran", "hadith"]);
  expect(searchedSources([])).toEqual([]);

  const health = { ok: true, corpusVersion: "v", coverage: ["quran"], llmConfigured: false };
  expect(toHealthState(health).status).toBe("ready");
  expect(toHealthState(null).status).toBe("unavailable");
  expect(toHealthState({ ...health, ok: false, corpusVersion: null }).status).toBe("unavailable");
  expect(toHealthState({ ...health, coverage: [] }).status).toBe("unavailable");
});
