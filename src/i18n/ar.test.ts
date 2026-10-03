import { expect, test } from "vitest";
import { STATUSES } from "@/core/types";
import { ar, format, t } from "./ar";

// Exact labels from AGENTS.md §4. A rename must fail here.
const labels = {
  MATCH: "مطابق لنص المصدر",
  DIFFERS: "مختلف في اللفظ أو المرجع",
  NOT_FOUND: "لم يُتحقق منه ضمن المصادر المتاحة",
  NEEDS_SPECIALIST: "يحتاج مراجعة مختص",
  ERROR: "تعذّر إكمال التحقق",
} as const;

test.each(STATUSES)("status label — %s", (status) => {
  expect(t(`status.${status}`)).toBe(labels[status]);
});

test("name, tagline and generated-text label", () => {
  expect(t("app.name")).toBe("عَزْو");
  expect(t("app.tagline")).toBe("انقل النص كما ورد، ومن حيث ورد.");
  expect(t("explanation.generatedLabel")).toBe("شرح مولّد آلياً");
});

test("no empty strings", () => {
  for (const value of Object.values(ar)) expect(value.trim()).not.toBe("");
});

test("format fills every placeholder and refuses a missing value", () => {
  expect(format("reason.ref.range", { first: "أ", last: "ب" })).toBe("من أ إلى ب");
  expect(format("reason.ref.more", { ref: "أ", count: 2 })).toBe("أ (وفي 2 من المواضع الأخرى)");
  expect(format("app.name", {})).toBe(t("app.name"));
  expect(() => format("reason.ref.range", { first: "أ" })).toThrow(/needs a value for \{last\}/);
});

// AGENTS.md §8: the tool's own sentences and labels never use «صحيح» for a text or a reference.
// Book titles are names, not the tool's words; they are the only place the word may stand.
test("no label or sentence of the tool uses «صحيح», outside the titles of the two books", () => {
  const titles = [t("collection.bukhari"), t("collection.muslim")];
  for (const [key, value] of Object.entries(ar)) {
    if (key.startsWith("collection.")) continue;
    const withoutTitles = titles.reduce((text, title) => text.replaceAll(title, ""), value);
    expect(withoutTitles, key).not.toContain("صحيح");
  }
});

test("the fixed wording of the UI", () => {
  expect(t("banner.aiTool")).toBe("أداة مدعومة بالذكاء الاصطناعي، وليست بديلاً عن المختص.");
  expect(format("home.scope", { coverage: "القرآن الكريم" })).toBe(
    "يراجع النقول من: القرآن الكريم. لا يُصدر فتاوى ولا يحكم على الأحاديث.",
  );
  expect(t("card.copy")).toBe("انسخ نص المصدر مع المرجع");
  expect(t("card.compare.show")).toBe("قارن النصين");
  expect(t("home.submit")).toBe("راجع النقول");
  expect(t("home.example")).toBe("مثال");
});

// The covered sources come from the API (AGENTS.md §6): the wording of the home screen, the
// states, the results, the cards and the "how it works" page names no collection.
test("no home, state, result or card sentence names a collection", () => {
  const names = [t("collection.quran"), t("collection.bukhari"), t("collection.muslim")];
  for (const [key, value] of Object.entries(ar)) {
    if (!/^(banner|home|state|results|card|how)\./.test(key)) continue;
    for (const name of names) expect(value, key).not.toContain(name);
  }
});
