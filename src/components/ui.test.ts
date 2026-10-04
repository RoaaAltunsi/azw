// What the components put on the page, rendered to static markup (no browser needed).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import GlobalError from "@/app/global-error";
import { ATTRIBUTION_PATTERNS } from "@/core/extract";
import { STATUSES, type ReviewResult } from "@/core/types";
import { t } from "@/i18n/ar";
import { DraftView } from "./DraftView";
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
  // The sources named are those of the result's own coverage, and no other.
  expect(textOf(html)).toContain("رُوجعت النقول في: القرآن الكريم · إصدار البيانات: test");
  expect(html).not.toMatch(/صحيح البخاري|صحيح مسلم/);
  expect(html).toContain(t("warning.LLM_UNAVAILABLE_REGEX_ONLY"));
  expect(html).toContain(t("warning.ITEM_LIMIT_REACHED"));
  expect(html).toMatch(/<a href="#card-item-6-9" class="draft-mark" data-status="NOT_FOUND"/);
  expect(html).toContain('id="card-item-6-9"');
  expect(html).toContain(t("report.copy"));
  expect(html).not.toContain(t("state.stale"));
});

test("results: no quotes found is said plainly, with no summary row", () => {
  const html = renderToStaticMarkup(createElement(ResultsView, { draft: "نص", stale: true, result: result({ coverage: ["quran", "bukhari", "new-book"] }) }));
  // A collection without a name in the UI is shown by its id, never left out.
  expect(textOf(html)).toContain("رُوجعت النقول في: القرآن الكريم، صحيح البخاري، new-book");
  expect(html).toContain(t("state.noQuotes.title"));
  expect(html).toContain(t("extract.formsNote"));
  expect(html).toContain(t("state.stale"));
  expect(html).not.toContain("0 مطابق");
  expect(html).not.toContain(t("report.copy"));
});

// A correction (docs/API.md, "Corrections"): offered on the card, applied only on the writer's tap.
const QUOTE = "إن الله مع الشاكرين";
const STRETCH = AYAH_153.slice(AYAH_153.indexOf("إِنَّ"));
const CORRECTABLE_DRAFT = `قال: «${QUOTE}» 🌿`;
const wording = { target: "wording", draft: { start: 6, end: 6 + QUOTE.length }, text: STRETCH } as const;
const correctable = item({
  span: { start: 6, end: 6 + QUOTE.length, text: QUOTE },
  status: "DIFFERS",
  reasonCode: "WORDING_DIFF",
  evidence: [evidence({ id: "quran:2:153", correction: wording })],
});
const cardWith = (props: { appliedRecordId?: string; onApply?: () => void }, reviewItem = correctable) =>
  renderToStaticMarkup(createElement(ReviewCard, { item: reviewItem, index: 1, ...props }));

test("a correction is offered by its target, and nothing is applied until the writer asks", () => {
  const html = cardWith({ onApply: () => {} });
  expect(html).toContain(t("card.apply.wording"));
  expect(html).not.toContain(t("card.apply.undo"));
  expect(textOf(html)).not.toContain("وُضع في المسودة المعدّلة");

  const reference = item({
    ...correctable,
    evidence: [evidence({ id: "quran:2:153", display: "سورة البقرة، الآية 153", correction: { target: "reference", draft: { start: 0, end: 3 }, text: "[سورة البقرة، الآية 153]" } })],
  });
  expect(cardWith({ onApply: () => {} }, reference)).toContain(t("card.apply.reference"));
});

test("an applied correction: the card says what was put in the draft, and offers to take it back", () => {
  const html = cardWith({ onApply: () => {}, appliedRecordId: "quran:2:153" });
  expect(html).toContain(t("card.apply.undo"));
  expect(html).not.toContain(t("card.apply.wording"));
  expect(textOf(html)).toContain(`وُضع في المسودة المعدّلة: ${STRETCH}`);
  expect(html).toContain('href="#draft-view"');
  // Another record's correction applied is not this place's.
  expect(cardWith({ onApply: () => {}, appliedRecordId: "other" })).toContain(t("card.apply.wording"));
});

test("no correction, no button: an item the API offers none for, an ERROR item, a card nobody listens to", () => {
  const none = item({ ...correctable, evidence: [evidence({ id: "quran:2:153" })] });
  expect(cardWith({ onApply: () => {} }, none)).not.toMatch(/ضع (نص|مرجع) المصدر/);
  const failed = item({ ...correctable, status: "ERROR" });
  expect(cardWith({ onApply: () => {} }, failed)).not.toMatch(/ضع (نص|مرجع) المصدر/);
  expect(cardWith({})).not.toMatch(/ضع (نص|مرجع) المصدر/);
});

test("the draft view: as reviewed until a correction is applied, then the revised draft with its copy button", () => {
  const view = (applied?: Record<string, string>) => renderToStaticMarkup(createElement(DraftView, { draft: CORRECTABLE_DRAFT, items: [correctable], applied }));

  const reviewed = view();
  expect(reviewed).toContain(t("results.draft.title"));
  expect(textOf(reviewed)).toContain(`${QUOTE}» 🌿`);
  // The copy button is there from the start, and the panel says a correction can be applied.
  expect(reviewed).toContain(`${t("results.draft.copy")}</button>`);
  expect(reviewed).toContain(t("results.draft.correctable"));
  expect(reviewed).not.toContain(t("results.draft.revised.copy"));
  expect(reviewed).not.toContain("draft-applied");

  const revised = view({ [correctable.id]: "quran:2:153" });
  expect(revised).toContain(t("results.draft.revised.title"));
  expect(revised).toContain(t("results.draft.revised.note"));
  expect(revised).toContain(t("results.draft.revised.copy"));
  expect(revised).not.toContain(t("results.draft.correctable"));
  // The source's words stand between the writer's own marks, named for assistive technology.
  expect(revised).toMatch(new RegExp(`قال: «</span><a href="#card-${correctable.id}" class="draft-applied"[^>]*><span class="sr-only">النقل 1: موضع عُدّل من المصدر: </span>${STRETCH}</a><span>» 🌿`));
  expect(textOf(revised)).not.toContain(QUOTE);
  // Every item is corrected: nothing is left open.
  expect(textOf(revised)).not.toContain("نقول لم تُعدَّل");
});

test("a draft with nothing to correct: the copy button, and no word about corrections", () => {
  const plain = item({ span: { start: 0, end: 3, text: "قال" }, status: "NOT_FOUND" });
  const html = renderToStaticMarkup(createElement(DraftView, { draft: CORRECTABLE_DRAFT, items: [plain] }));
  expect(html).toContain(`${t("results.draft.copy")}</button>`);
  expect(html).not.toContain(t("results.draft.correctable"));
  expect(html).not.toContain(t("results.draft.revised.note"));
});

test("the revised draft says how many quotes are still as the tool found them", () => {
  const open = item({ span: { start: 0, end: 3, text: "قال" }, status: "NOT_FOUND" });
  const html = renderToStaticMarkup(
    createElement(DraftView, { draft: CORRECTABLE_DRAFT, items: [open, correctable], applied: { [correctable.id]: "quran:2:153" } }),
  );
  expect(textOf(html)).toContain("نقول لم تُعدَّل وليست حالتها «مطابق لنص المصدر»: 1. راجعها قبل النشر.");
});

test("results: a correction is offered on its card, and the draft is shown as reviewed", () => {
  const html = renderToStaticMarkup(
    createElement(ResultsView, {
      draft: CORRECTABLE_DRAFT,
      stale: false,
      result: result({ items: [correctable], summary: { MATCH: 0, DIFFERS: 1, NOT_FOUND: 0, NEEDS_SPECIALIST: 0, ERROR: 0 } }),
    }),
  );
  expect(html).toContain(t("card.apply.wording"));
  expect(html).toContain(t("results.draft.title"));
  expect(html).not.toContain(t("results.draft.revised.copy"));
  expect(html).toContain('id="draft-view"');
});

test("the forms note names every phrase the regex extractor reads", () => {
  const note = t("extract.formsNote");
  expect(note).toContain("﴿ ﴾");
  for (const { phrase } of ATTRIBUTION_PATTERNS) expect(note).toContain(`«${phrase}»`);
  expect(note.match(/«/g)).toHaveLength(ATTRIBUTION_PATTERNS.length);
});

test("the page shown when rendering fails: the AI banner, a fixed Arabic sentence, nothing of the error", () => {
  const html = renderToStaticMarkup(createElement(GlobalError, { error: new Error("مسودة سرية"), reset: () => {} }));
  expect(html).toContain(t("banner.aiTool"));
  expect(html).toContain(t("state.error.page"));
  expect(html).not.toContain("مسودة سرية");
  expect(html).not.toContain("مطابق");
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
