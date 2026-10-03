import { expect, test } from "vitest";
import { temporaryRegexExtractor } from "./index";

const texts = (draft: string): Array<[string, string]> => temporaryRegexExtractor(draft).map((q) => [q.claimedKind, q.span.text]);

test("﴿…﴾ is a Quran quote: the span is the words inside the brackets", () => {
  const draft = "قال تعالى: ﴿ قل أعوذ برب الفلق ﴾ [الفلق: 1].";
  const [quote] = temporaryRegexExtractor(draft);
  expect(quote).toEqual({
    span: { start: draft.indexOf("قل"), end: draft.indexOf(" ﴾"), text: "قل أعوذ برب الفلق" },
    claimedKind: "quran",
    extractedBy: "regex",
  });
  expect(draft.slice(quote!.span.start, quote!.span.end)).toBe(quote!.span.text);
});

test("«…» after «قال رسول الله» is a hadith quote", () => {
  expect(texts("قال رسول الله ﷺ: «نص أول».")).toEqual([["hadith", "نص أول"]]);
  expect(texts("قال رسول الله صلى الله عليه وسلم: «نص ثان»")).toEqual([["hadith", "نص ثان"]]);
});

test("«…» without the formula, or in another sentence, is not taken", () => {
  expect(texts("كتاب «رياض الصالحين» نافع.")).toEqual([]);
  expect(texts("قال رسول الله كلاماً كثيراً. وفي كتاب «الأذكار» فوائد.")).toEqual([]);
  expect(texts("قال رسول الله ﷺ: «الأول» ثم «الثاني»")).toEqual([["hadith", "الأول"]]);
});

test("several quotes come in draft order, and every span is the draft's own text", () => {
  const draft = "قال رسول الله ﷺ: «حديث» وقال تعالى: ﴿آية أولى﴾ ثم ﴿آية ثانية﴾";
  const quotes = temporaryRegexExtractor(draft);
  expect(quotes.map((q) => q.span.text)).toEqual(["حديث", "آية أولى", "آية ثانية"]);
  for (const q of quotes) expect(draft.slice(q.span.start, q.span.end)).toBe(q.span.text);
});

test("empty brackets and a draft with no quote give nothing", () => {
  expect(texts("﴿ ﴾ و «»")).toEqual([]);
  expect(texts("مقال بلا أي اقتباس.")).toEqual([]);
  expect(texts("")).toEqual([]);
});
