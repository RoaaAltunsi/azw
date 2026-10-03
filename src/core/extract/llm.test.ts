import { describe, expect, test } from "vitest";
import { LlmExtractionSchema, validateSpans, type LlmExtractedItem } from "./llm";

const item = (quote: string, kind: LlmExtractedItem["kind"] = "hadith", claimLevel: LlmExtractedItem["claimLevel"] = null): LlmExtractedItem => ({
  quote,
  kind,
  claimLevel,
  citedReference: null,
  attributionPhrase: null,
});

describe("validateSpans", () => {
  test("the offsets are computed in the draft, and the span text is the draft's own", () => {
    const draft = "قال رسول الله ﷺ: «إنما الأعمال بالنيات» رواه البخاري.";
    const { quotes, notInDraft } = validateSpans(draft, [item("إنما الأعمال بالنيات")]);
    const start = draft.indexOf("إنما");
    expect(quotes).toEqual([{ span: { start, end: start + 20, text: "إنما الأعمال بالنيات" }, claimedKind: "hadith", extractedBy: "llm" }]);
    expect(notInDraft).toBe(0);
  });

  test("whitespace may differ; the span keeps the draft's whitespace", () => {
    const draft = "في الحديث: «إنما  الأعمال\nبالنيات»";
    const { quotes } = validateSpans(draft, [item("  إنما الأعمال بالنيات ")]);
    expect(quotes.map((q) => q.span.text)).toEqual(["إنما  الأعمال\nبالنيات"]);
    expect(draft.slice(quotes[0]!.span.start, quotes[0]!.span.end)).toBe(quotes[0]!.span.text);
  });

  test("any other difference is not in the draft: a diacritic, a letter, a completed text, an empty quote", () => {
    const draft = "قال تعالى: ﴿إن الله مع الصابرين﴾ (a+b)";
    const { quotes, notInDraft } = validateSpans(draft, [
      item("إِن الله مع الصابرين", "quran"),
      item("ان الله مع الصابرين", "quran"),
      item("يا أيها الذين آمنوا إن الله مع الصابرين", "quran"),
      item("   ", "quran"),
      item("(a.b)", "quran"), // the quote is text, never a pattern
    ]);
    expect(quotes).toEqual([]);
    expect(notInDraft).toBe(5);
  });

  test("a quote returned twice takes the next occurrence; a further copy is dropped and not counted", () => {
    const draft = "«اتق الله حيثما كنت» ثم كرر: «اتق الله حيثما كنت»";
    const twice = [item("اتق الله حيثما كنت"), item("اتق الله حيثما كنت")];
    const first = draft.indexOf("اتق");
    const second = draft.lastIndexOf("اتق");
    expect(validateSpans(draft, twice).quotes.map((q) => q.span.start)).toEqual([first, second]);
    const more = validateSpans(draft, [...twice, ...twice]);
    expect(more.quotes.map((q) => q.span.start)).toEqual([first, second]);
    expect(more.notInDraft).toBe(0);
  });

  test("a one-word quote is dropped, unless it is an interpretive claim", () => {
    const draft = "قال تعالى: «الصابرين». واجب.";
    const { quotes, notInDraft } = validateSpans(draft, [item("الصابرين", "quran"), item("واجب", "interpretive_claim")]);
    expect(quotes.map((q) => [q.span.text, q.claimedKind, q.claimLevel])).toEqual([["واجب", "interpretive_claim", "C"]]);
    expect(notInDraft).toBe(0);
  });

  test("the claim level is kept for an interpretive claim only", () => {
    const draft = "يجوز لك أن تفطر. قال النبي ﷺ: «اتق الله حيثما كنت»";
    const { quotes } = validateSpans(draft, [item("يجوز لك أن تفطر", "interpretive_claim", "D"), item("اتق الله حيثما كنت", "hadith", "D")]);
    expect(quotes.map((q) => q.claimLevel)).toEqual(["D", undefined]);
  });
});

describe("LlmExtractionSchema", () => {
  test("a kind outside the four, or offsets in place of a quote, is refused; unknown fields are not read", () => {
    const ok = { items: [{ ...item("نص"), status: "MATCH", start: 0 }], isDraft: true };
    expect(LlmExtractionSchema.parse(ok).items[0]).toEqual(item("نص"));
    expect(LlmExtractionSchema.safeParse({ items: [{ ...item("نص"), kind: "athar" }], isDraft: true }).success).toBe(false);
    expect(LlmExtractionSchema.safeParse({ items: [{ start: 0, end: 3, kind: "quran" }], isDraft: true }).success).toBe(false);
    expect(LlmExtractionSchema.safeParse({ items: [] }).success).toBe(false);
  });
});
