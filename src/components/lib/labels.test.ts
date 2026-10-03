import { expect, test } from "vitest";
import { collectionName, coverageNames, kindLabel, summaryText, warningText } from "./labels";
import { item } from "./test-fixtures";

test("a collection is shown by its name, or by its id when it has none", () => {
  expect(collectionName("quran")).toBe("القرآن الكريم");
  expect(collectionName("tirmidhi")).toBe("tirmidhi");
  expect(collectionName("toString")).toBe("toString");
  expect(coverageNames(["quran"])).toBe("القرآن الكريم");
  expect(coverageNames(["quran", "bukhari", "muslim"])).toBe("القرآن الكريم، صحيح البخاري، صحيح مسلم");
});

test("kinds and warnings: known ones by their wording, unknown ones by their code", () => {
  expect(kindLabel("hadith")).toBe("حديث نبوي");
  expect(kindLabel("athar")).toBe("athar");
  expect(warningText("ITEM_LIMIT_REACHED")).toContain("الحد");
  expect(warningText("SOMETHING_NEW")).toBe("تنبيه من الخدمة: SOMETHING_NEW");
});

test("the summary row, in its fixed order; ERROR only when it happened", () => {
  const items = [1, 2, 3, 4].map((n) => item({ span: { start: n, end: n + 1, text: "x" } }));
  const summary = { MATCH: 1, DIFFERS: 2, NOT_FOUND: 1, NEEDS_SPECIALIST: 0, ERROR: 0 };
  expect(summaryText({ items, summary })).toBe("4 نقول: 1 مطابق · 2 مختلف · 0 يحتاج مراجعة · 1 لم يُتحقق منه");
  expect(summaryText({ items, summary: { ...summary, MATCH: 0, ERROR: 1 } })).toBe(
    "4 نقول: 0 مطابق · 2 مختلف · 0 يحتاج مراجعة · 1 لم يُتحقق منه · 1 تعذّر التحقق منه",
  );
});
