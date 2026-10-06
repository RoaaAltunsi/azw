import { expect, test } from "vitest";
import type { ReviewResult } from "@/core/types";
import { t } from "@/i18n/ar";
import { reportText } from "./report";
import { evidence, item } from "./test-fixtures";

const FOOTER = "أداة مدعومة بالذكاء الاصطناعي. التحقق يشمل المصادر المذكورة فقط، ولا يتضمن حكماً على الأحاديث أو فتوى.";

const result: ReviewResult = {
  apiVersion: "1",
  corpusVersion: "2026-10-03.1",
  coverage: ["quran", "bukhari", "muslim"],
  items: [
    item({
      span: { start: 0, end: 5, text: "نقل 1" },
      citedReference: { raw: "[البقرة: 153]" },
      reasonAr: "سبب المطابقة.",
      evidence: [
        evidence({ id: "a", exactText: "نص أ", display: "مرجع أ", ayahRange: [1, 2] }),
        evidence({ id: "b", exactText: "نص ب", display: "مرجع ب", ayahRange: [1, 2] }),
        // A second occurrence: the report holds the first only.
        evidence({ id: "c", exactText: "نص موضع آخر", display: "مرجع ج", ayahRange: [7, 7] }),
      ],
    }),
    item({
      span: { start: 10, end: 15, text: "نقل 2" },
      status: "DIFFERS",
      reasonCode: "WORDING_DIFF",
      reasonAr: "سبب الاختلاف.",
      explanation: { text: "شرح مولّد لا يدخل التقرير", generated: true },
      evidence: [
        evidence({
          id: "bukhari:1",
          kind: "hadith",
          collection: "bukhari",
          exactText: "نص الحديث",
          display: "صحيح البخاري، حديث رقم 1",
          grade: { text: "درجة لا تدخل التقرير", by: "صحيح البخاري", sourceRef: "1" },
        }),
      ],
    }),
    item({ span: { start: 20, end: 25, text: "نقل 3" }, status: "NOT_FOUND", reasonAr: "سبب عدم العثور." }),
    item({ span: { start: 30, end: 35, text: "نقل 4" }, status: "NEEDS_SPECIALIST", reasonAr: "سبب الإحالة.", claimedKind: "interpretive_claim" }),
    // The API never sends evidence with ERROR; the report must not show it even so.
    item({
      span: { start: 40, end: 45, text: "نقل 5" },
      status: "ERROR",
      reasonAr: t("item.error.INTERNAL_ERROR"),
      citedReference: { raw: "[مرجع]" },
      evidence: [evidence({ id: "x", exactText: "نص لا يظهر" })],
    }),
  ],
  summary: { MATCH: 1, DIFFERS: 1, NOT_FOUND: 1, NEEDS_SPECIALIST: 1, ERROR: 1 },
  warnings: ["ITEM_LIMIT_REACHED", "SOMETHING_NEW"],
};

test("the report of a result: every status, one field per line, the warnings and the footer", () => {
  expect(reportText(result, new Date(2026, 9, 4, 23, 30))).toBe(
    [
      "تقرير مراجعة النقول من «عَزْو»",
      "تاريخ التقرير: 2026-10-04",
      "المصادر المغطاة: القرآن الكريم، صحيح البخاري، صحيح مسلم",
      `تنبيه: ${t("warning.ITEM_LIMIT_REACHED")}`,
      "تنبيه: تنبيه من الخدمة: SOMETHING_NEW",
      "",
      "النقل 1",
      "الحالة: مطابق لنص المصدر",
      "النص في المسودة: نقل 1",
      "المرجع المذكور في المسودة: [البقرة: 153]",
      "نص المصدر: ﴿نص أ﴾ ﴿نص ب﴾",
      "المرجع في المصدر: من مرجع أ إلى مرجع ب",
      "المصدر: اسم المصدر",
      "النتيجة: سبب المطابقة.",
      "",
      "النقل 2",
      "الحالة: مختلف في اللفظ أو المرجع",
      "النص في المسودة: نقل 2",
      "نص المصدر: نص الحديث",
      "المرجع في المصدر: صحيح البخاري، حديث رقم 1",
      "المصدر: اسم المصدر",
      "النتيجة: سبب الاختلاف.",
      "",
      "النقل 3",
      "الحالة: لم يُتحقق منه ضمن المصادر المتاحة",
      "النص في المسودة: نقل 3",
      "النتيجة: سبب عدم العثور.",
      "",
      "النقل 4",
      "الحالة: يحتاج مراجعة مختص",
      "النص في المسودة: نقل 4",
      "النتيجة: سبب الإحالة.",
      "",
      "النقل 5",
      "الحالة: تعذّر إكمال التحقق",
      "النص في المسودة: نقل 5",
      `النتيجة: ${t("item.error.INTERNAL_ERROR")}`,
      "",
      FOOTER,
    ].join("\n"),
  );
});

test("a result without warnings has none in its header; the footer is the fixed sentence", () => {
  const text = reportText({ ...result, items: [], warnings: [] }, new Date(2026, 0, 5));
  expect(text.split("\n")).toEqual([
    "تقرير مراجعة النقول من «عَزْو»",
    "تاريخ التقرير: 2026-01-05",
    "المصادر المغطاة: القرآن الكريم، صحيح البخاري، صحيح مسلم",
    "",
    FOOTER,
  ]);
  expect(t("report.footer")).toBe(FOOTER);
  expect(t("report.copy")).toBe("انسخ التقرير");
});
