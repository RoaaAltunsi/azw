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
