import { expect, test } from "vitest";
import { t } from "../../i18n/ar";
import { getKindMeta, kindMeta } from "./kind-meta";
import { ayah, hadith } from "./test-fixtures";

test("quran and hadith are registered, with labels from the i18n strings", () => {
  expect(Object.keys(kindMeta).sort()).toEqual(["hadith", "quran"]);
  expect(kindMeta.quran?.labelAr).toBe(t("kind.quran"));
  expect(kindMeta.hadith?.labelAr).toBe(t("kind.hadith"));
});

test("an unregistered kind has no meta", () => {
  expect(getKindMeta("dua")).toBeUndefined();
  expect(getKindMeta("constructor")).toBeUndefined();
});

test("the citation is the record's own", () => {
  const record = ayah(2, 153, "نص");
  expect(getKindMeta("quran")?.citationFormatter(record)).toBe(record.citation.display);
  const numbered = hadith("alpha", "7", "نص");
  expect(getKindMeta("hadith")?.citationFormatter(numbered)).toBe("alpha، حديث رقم 7");
});

test("a record with citation.number = null is formatted without a number", () => {
  const record = hadith("beta", null, "نص", { id: "beta:4927" });
  const formatted = getKindMeta("hadith")!.citationFormatter(record);
  expect(formatted).toBe(record.citation.display);
  expect(formatted).not.toMatch(/[0-9٠-٩]/);
});
