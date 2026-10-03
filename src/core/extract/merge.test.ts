import { describe, expect, test } from "vitest";
import type { ClaimedKind, ExtractedBy } from "../types";
import type { ExtractedQuote } from "./index";
import { mergeQuotes } from "./merge";

const quote = (draft: string, text: string, claimedKind: ClaimedKind, extractedBy: ExtractedBy, claimLevel?: "C" | "D"): ExtractedQuote => {
  const start = draft.indexOf(text);
  if (start < 0) throw new Error(`not in the test draft: ${text}`);
  return { span: { start, end: start + text.length, text }, claimedKind, ...(claimLevel ? { claimLevel } : {}), extractedBy };
};
const summary = (draft: string, quotes: ExtractedQuote[]) => mergeQuotes(draft, quotes).map((q) => [q.span.text, q.claimedKind, q.extractedBy]);

describe("mergeQuotes: the same item", () => {
  const draft = "قال النبي ﷺ: اتق الله حيثما كنت وهذا من كلامي. ثم ﴿إن الله مع الصابرين﴾";

  test("identical spans: one quote that names both extractors", () => {
    const text = "إن الله مع الصابرين";
    expect(summary(draft, [quote(draft, text, "quran", "regex"), quote(draft, text, "quran", "llm")])).toEqual([[text, "quran", ["regex", "llm"]]]);
  });

  test("an overlap of half or more: the LLM's span is kept, whichever is longer", () => {
    const regex = quote(draft, "اتق الله حيثما كنت وهذا من كلامي", "hadith", "regex");
    const llm = quote(draft, "اتق الله حيثما كنت", "hadith", "llm");
    expect(summary(draft, [regex, llm])).toEqual([["اتق الله حيثما كنت", "hadith", ["regex", "llm"]]]);
    const wider = quote(draft, "قال النبي ﷺ: اتق الله حيثما كنت وهذا من كلامي", "hadith", "llm");
    expect(summary(draft, [regex, wider])).toEqual([[wider.span.text, "hadith", ["regex", "llm"]]]);
  });

  test.each<[ClaimedKind, ClaimedKind, ClaimedKind]>([
    ["hadith", "unclear_attribution", "unclear_attribution"],
    ["unclear_attribution", "hadith", "unclear_attribution"],
    ["quran", "hadith", "hadith"],
    ["hadith", "quran", "hadith"],
    ["hadith", "athar", "hadith"], // neither is weaker: the regex extractor's kind
  ])("the kind is the weaker claim: regex %s + llm %s → %s", (regexKind, llmKind, kind) => {
    const text = "اتق الله حيثما كنت";
    const merged = mergeQuotes(draft, [quote(draft, text, regexKind, "regex"), quote(draft, text, llmKind, "llm")]);
    expect(merged.map((q) => q.claimedKind)).toEqual([kind]);
  });

  test("a regex ﴿…﴾ quote stays quran, in either order", () => {
    const regex = quote(draft, "إن الله مع الصابرين", "quran", "regex");
    for (const kind of ["hadith", "unclear_attribution"]) {
      const llm = quote(draft, "إن الله مع الصابرين", kind, "llm");
      expect(mergeQuotes(draft, [regex, llm])[0]!.claimedKind).toBe("quran");
      expect(mergeQuotes(draft, [llm, regex])[0]!.claimedKind).toBe("quran");
    }
    // The LLM's span with the brackets inside it is still the same item.
    const withMarks = quote(draft, "﴿إن الله مع الصابرين﴾", "hadith", "llm");
    expect(summary(draft, [regex, withMarks])).toEqual([["﴿إن الله مع الصابرين﴾", "quran", ["regex", "llm"]]]);
  });

  test("two claims on one sentence: one item, and level D is kept", () => {
    const d = "تدل الآية على أنه يجوز لك أن تفطر اليوم.";
    const merged = mergeQuotes(d, [
      quote(d, "تدل الآية على أنه يجوز لك أن تفطر اليوم", "interpretive_claim", "llm", "C"),
      quote(d, "الآية على أنه يجوز لك أن تفطر اليوم", "interpretive_claim", "llm", "D"),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.claimLevel).toBe("D");
  });
});

describe("mergeQuotes: any other overlap", () => {
  const draft = "قال النبي ﷺ: اتق الله حيثما كنت وأتبع السيئة الحسنة تمحها وخالق الناس بخلق حسن وهذه وصية جامعة نافعة لكل مسلم";

  test("less than half in common: the earlier start wins, then the longer span", () => {
    const regex = quote(draft, draft.slice(draft.indexOf("اتق")), "hadith", "regex");
    const short = quote(draft, "اتق الله حيثما كنت", "unclear_attribution", "llm");
    expect(summary(draft, [regex, short])).toEqual([[regex.span.text, "hadith", ["regex"]]]);
    const later = quote(draft, "وهذه وصية جامعة نافعة لكل مسلم", "hadith", "llm");
    const early = quote(draft, "اتق الله حيثما كنت وأتبع السيئة الحسنة تمحها وخالق الناس بخلق حسن وهذه وصية", "hadith", "llm");
    expect(summary(draft, [later, early])).toEqual([[early.span.text, "hadith", ["llm"]]]);
  });

  test("a claim and a quotation are never one item: a claim that is nothing but the quotation is dropped", () => {
    const text = "اتق الله حيثما كنت وأتبع السيئة الحسنة تمحها";
    const merged = mergeQuotes(draft, [quote(draft, text, "hadith", "regex"), quote(draft, text, "interpretive_claim", "llm", "D")]);
    expect(merged).toEqual([{ span: expect.objectContaining({ text }), claimedKind: "hadith", extractedBy: ["regex"] }]);
  });

  test("a claim that holds a quotation is cut to the part outside it, and both are kept", () => {
    const d = "قلت له: يجوز لك أن تفطر لقوله تعالى: ﴿فعدة من أيام أخر﴾. والله أعلم";
    const verse = quote(d, "فعدة من أيام أخر", "quran", "regex");
    const claim = quote(d, "يجوز لك أن تفطر لقوله تعالى: ﴿فعدة من أيام أخر﴾.", "interpretive_claim", "llm", "D");
    for (const quotes of [[verse, claim], [claim, verse]]) {
      expect(mergeQuotes(d, quotes)).toEqual([
        { span: { start: d.indexOf("يجوز"), end: d.indexOf(": ﴿"), text: "يجوز لك أن تفطر لقوله تعالى" }, claimedKind: "interpretive_claim", claimLevel: "D", extractedBy: ["llm"] },
        { span: verse.span, claimedKind: "quran", extractedBy: ["regex"] },
      ]);
    }
  });

  test("a claim around a quotation keeps its longest free stretch; one that only overlaps keeps what is outside", () => {
    const d = "تدل الآية ﴿إن الله مع الصابرين﴾ على وجوب الصبر في كل حال";
    const verse = quote(d, "إن الله مع الصابرين", "quran", "regex");
    expect(summary(d, [verse, quote(d, d, "interpretive_claim", "llm", "C")])).toEqual([
      ["إن الله مع الصابرين", "quran", ["regex"]],
      ["على وجوب الصبر في كل حال", "interpretive_claim", ["llm"]],
    ]);
    expect(summary(d, [verse, quote(d, "مع الصابرين﴾ على وجوب الصبر", "interpretive_claim", "llm", "C")])).toEqual([
      ["إن الله مع الصابرين", "quran", ["regex"]],
      ["على وجوب الصبر", "interpretive_claim", ["llm"]],
    ]);
  });

  test("the result is in draft order and no two spans overlap", () => {
    const quotes = [
      quote(draft, "وخالق الناس بخلق حسن", "hadith", "llm"),
      quote(draft, "اتق الله حيثما كنت", "hadith", "llm"),
      quote(draft, "حيثما كنت وأتبع السيئة", "hadith", "manual"),
      quote(draft, "بخلق حسن وهذه", "hadith", "manual"),
    ];
    const merged = mergeQuotes(draft, quotes);
    expect(merged.map((q) => q.span.text)).toEqual(["اتق الله حيثما كنت", "وخالق الناس بخلق حسن"]);
    merged.reduce((end, q) => (expect(q.span.start).toBeGreaterThanOrEqual(end), q.span.end), 0);
  });
});
