import { describe, expect, test } from "vitest";
import { attachReference, parseReferences } from "../references";
import { ATTRIBUTION_PATTERNS, CLAIM_PATTERNS, createRegexExtractor, regexExtractor } from "./index";

// Every draft a test reads, so that the invariants at the end run on all of them.
const seen = new Set<string>();
const extract = (draft: string) => {
  seen.add(draft);
  return regexExtractor(draft);
};
const texts = (draft: string): Array<[string, string]> => extract(draft).map((q) => [q.claimedKind, q.span.text]);

const VERSE = "إن مع العسر يسرا";
const HADITH = "الدين النصيحة";

describe("﴿…﴾", () => {
  test("is a Quran quote: the span is the words inside the brackets", () => {
    const draft = "قال تعالى: ﴿ قل أعوذ برب الفلق ﴾ [الفلق: 1].";
    expect(extract(draft)).toEqual([
      { span: { start: draft.indexOf("قل"), end: draft.indexOf(" ﴾"), text: "قل أعوذ برب الفلق" }, claimedKind: "quran", extractedBy: "regex" },
    ]);
  });

  test("anywhere, with no phrase before it, and also one word", () => {
    expect(texts(`ثم ﴿${VERSE}﴾ و﴿الرحمن﴾`)).toEqual([
      ["quran", VERSE],
      ["quran", "الرحمن"],
    ]);
  });

  test("is always quran, also after a hadith phrase", () => {
    expect(texts(`قال رسول الله ﷺ: ﴿${VERSE}﴾`)).toEqual([["quran", VERSE]]);
  });

  test("empty brackets give nothing", () => {
    expect(texts("﴿ ﴾ و «»")).toEqual([]);
  });
});

describe("Quran phrases", () => {
  test.each([
    `قال تعالى: «${VERSE}»`,
    `قال الله تعالى: "${VERSE}"`,
    `وقال سبحانه: (${VERSE})`,
    `وقال سبحانه وتعالى: “${VERSE}”`,
    `يقول الله عز وجل: « ${VERSE} »`,
    `كما في قوله تعالى: (${VERSE}).`,
    `لقوله تعالى «${VERSE}»`,
    `يقول تعالى: «${VERSE}»`,
    `ويقول سبحانه وتعالى: (${VERSE})`,
  ])("in marks: %s", (draft) => {
    expect(texts(draft)).toEqual([["quran", VERSE]]);
  });

  test.each([`قال تعالى: ${VERSE}.`, `قال الله تعالى ${VERSE}.`, `يقول الله تعالى: ${VERSE}\nثم كلام آخر`, `وقوله تعالى: ${VERSE}`])(
    "without marks, up to the sentence end: %s",
    (draft) => {
      expect(texts(draft)).toEqual([["quran", VERSE]]);
    },
  );

  test("with diacritics, in the phrase and in the quote", () => {
    const verse = "إِنَّ مَعَ الْعُسْرِ يُسْرًا";
    expect(texts(`قَالَ اللهُ تَعَالَى: «${verse}»`)).toEqual([["quran", verse]]);
    expect(texts(`قَالَ تَعَالَىٰ: ${verse}.`)).toEqual([["quran", verse]]);
  });

  test("a round bracket that holds a reference is not the quote", () => {
    expect(texts(`قال تعالى (الشرح: 6): ${VERSE}.`)).toEqual([["quran", VERSE]]);
    expect(texts("قال تعالى (سورة الشرح).")).toEqual([]);
  });
});

describe("hadith phrases", () => {
  test.each([
    `قال رسول الله ﷺ: «${HADITH}»`,
    `قال رسول الله صلى الله عليه وسلم: «${HADITH}»`,
    `قال رسول الله صلى الله عليه وسلم «${HADITH}»`,
    `وقال النبي ﷺ: "${HADITH}"`,
    `قال النبي عليه الصلاة والسلام: “${HADITH}”`,
    `قال ﷺ: «${HADITH}»`,
    `فقال صلى الله عليه وسلم: «${HADITH}»`,
    `عن النبي ﷺ أنه قال: «${HADITH}»`,
    `عن النبي صلى الله عليه وسلم قال: «${HADITH}»`,
    `جاء في الحديث: «${HADITH}»`,
    `وفي الحديث الشريف «${HADITH}»`,
    `ورد عنه ﷺ أنه قال: «${HADITH}»`,
    `قال رسول الله ﷺ لأصحابه يوماً: «${HADITH}»`,
    `يقول النبي ﷺ: «${HADITH}»`,
    `ويقول رسول الله صلى الله عليه وسلم: «${HADITH}»`,
    `يقول ﷺ: «${HADITH}»`,
    `كان يقول صلى الله عليه وسلم: «${HADITH}»`,
  ])("in marks: %s", (draft) => {
    expect(texts(draft)).toEqual([["hadith", HADITH]]);
  });

  test.each([
    `قال رسول الله ﷺ: ${HADITH}.`,
    `قال النبي صلى الله عليه وسلم ${HADITH}.`,
    `قال ﷺ: ${HADITH}`,
    `عن النبي ﷺ أنه قال ${HADITH}؟`,
    `في الحديث: ${HADITH}.`,
    `ورد عنه ﷺ: ${HADITH}!`,
    `يقول النبي ﷺ: ${HADITH}.`,
  ])("without marks, up to the sentence end: %s", (draft) => {
    expect(texts(draft)).toEqual([["hadith", HADITH]]);
  });

  // The present tense of a verb of speech is read like its past tense, and a writer who is not
  // named is still not read.
  test("the present tense names the same speakers as the past tense", () => {
    expect(texts(`يقول الشاعر: «${HADITH}»`)).toEqual([]);
    expect(texts(`يقول بعض الناس: ${HADITH}.`)).toEqual([]);
  });

  test("with diacritics", () => {
    expect(texts("قَالَ رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ: «الدِّينُ النَّصِيحَةُ»")).toEqual([["hadith", "الدِّينُ النَّصِيحَةُ"]]);
    expect(texts("قالَ النَّبِيُّ ﷺ: الدِّينُ النَّصِيحَةُ.")).toEqual([["hadith", "الدِّينُ النَّصِيحَةُ"]]);
  });

  test("a phrase that is not a verb of speech needs marks or a colon", () => {
    expect(texts("في الحديث عن الصبر فوائد كثيرة.")).toEqual([]);
    expect(texts("ورد عنه ﷺ كلام كثير في هذا الباب.")).toEqual([]);
  });

  test("text in marks takes the kind of its phrase, also when it is really a verse", () => {
    expect(texts(`قال رسول الله ﷺ: «${VERSE}»`)).toEqual([["hadith", VERSE]]);
  });

  test("the quote must open in the same sentence, near the phrase", () => {
    expect(texts("قال رسول الله ﷺ. وفي كتاب «الأذكار للنووي» فوائد.")).toEqual([]);
    expect(texts(`قال رسول الله ﷺ: «الأول منهما» ثم «الثاني منهما»`)).toEqual([["hadith", "الأول منهما"]]);
  });

  // The limit of the unmarked form: the words after a verb of speech are taken as they stand.
  test("without marks the extractor cannot tell narration from quotation", () => {
    expect(texts("قال رسول الله كلاماً كثيراً. وفي كتاب «الأذكار» فوائد.")).toEqual([["hadith", "كلاماً كثيراً"]]);
  });
});

describe("unclear attribution", () => {
  const saying = "من عرف نفسه عرف ربه";
  test.each([
    `جاء في الأثر: «${saying}»`,
    `في الأثر: ${saying}.`,
    `قال بعض السلف: «${saying}»`,
    `يُروى أن النبي ﷺ قال: «${saying}»`,
    `ويروى: "${saying}"`,
    `يقال إن النبي ﷺ قال: «${saying}»`,
    `يقال أن النبي صلى الله عليه وسلم قال: ${saying}.`,
  ])("%s", (draft) => {
    expect(texts(draft)).toEqual([["unclear_attribution", saying]]);
  });

  test("stays unclear when a hadith phrase follows it before the quote", () => {
    expect(texts(`يُروى عن النبي ﷺ أنه قال: «${saying}»`)).toEqual([["unclear_attribution", saying]]);
    expect(texts(`يروى عن النبي ﷺ أنه قال ${saying}.`)).toEqual([["unclear_attribution", saying]]);
    expect(texts(`قال بعض السلف: قال رسول الله ﷺ: «${saying}»`)).toEqual([["unclear_attribution", saying]]);
  });

  test("without marks or a colon nothing is taken", () => {
    expect(texts("يروى في كتب الأدب كثير من هذا.")).toEqual([]);
  });
});

describe("two phrases", () => {
  const qudsi = "أنا عند ظن عبدي بي";

  test("before one quote: words given as a hadith are not claimed as a verse", () => {
    expect(texts(`قال رسول الله ﷺ: قال الله تعالى: «${qudsi}»`)).toEqual([["hadith", qudsi]]);
    expect(texts(`في الحديث القدسي: يقول الله تعالى: ${qudsi}.`)).toEqual([["hadith", qudsi]]);
    expect(texts(`قال الله تعالى في الحديث القدسي: «${qudsi}»`)).toEqual([["hadith", qudsi]]);
  });

  test("two quotes in one sentence, each with its own phrase", () => {
    expect(texts(`قال تعالى: «${VERSE}» وقال رسول الله ﷺ: «${HADITH}»`)).toEqual([
      ["quran", VERSE],
      ["hadith", HADITH],
    ]);
    expect(texts(`قال ﷺ: ${HADITH} وقال تعالى: ${VERSE}.`)).toEqual([
      ["hadith", HADITH],
      ["quran", VERSE],
    ]);
  });

  test("a phrase with no quote does not take the quote of the next one", () => {
    expect(texts(`ذكر النبي ﷺ ذلك، وفي الحديث ما يدل عليه، وقال تعالى: «${VERSE}»`)).toEqual([["quran", VERSE]]);
  });
});

describe("the span", () => {
  const aliases = {
    surahs: [{ number: 94, bareName: "الشرح", spellingVariants: [], alternateNames: [] }],
    collections: [
      { collections: ["bukhari"], names: ["البخاري"], phrases: ["صحيح البخاري"] },
      { collections: ["bukhari", "muslim"], names: [], phrases: ["متفق عليه"] },
    ],
  };
  const matn = "إنما الأعمال بالنيات";

  test.each([
    [`قال تعالى: ${VERSE} [الشرح: 6].`, VERSE, "[الشرح: 6]"],
    [`قال تعالى: (${VERSE}) [الشرح: 6]`, VERSE, "[الشرح: 6]"],
    [`قال تعالى: ${VERSE} (سورة الشرح: 6).`, VERSE, "(سورة الشرح: 6)"],
    [`قال رسول الله ﷺ: ${matn}، رواه البخاري.`, matn, "رواه البخاري"],
    [`قال رسول الله ﷺ: ${matn}. رواه البخاري`, matn, "رواه البخاري"],
    [`قال ﷺ: ${matn} - أخرجه البخاري`, matn, "أخرجه البخاري"],
    [`قال النبي ﷺ: ${matn} متفق عليه.`, matn, "متفق عليه"],
    [`قال النبي ﷺ: «${matn}» (رواه البخاري)`, matn, "(رواه البخاري)"],
  ])("excludes the cited reference, which is still attached: %s", (draft, text, raw) => {
    const quotes = extract(draft);
    expect(quotes.map((q) => q.span.text)).toEqual([text]);
    expect(attachReference(quotes[0]!.span, parseReferences(draft, aliases), draft)?.raw).toBe(raw);
  });

  test("has no mark, no phrase and no honorific", () => {
    const [quote] = extract(`وقد قال النبي صلى الله عليه وسلم :  «  ${HADITH}  »  .`);
    expect(quote!.span.text).toBe(HADITH);
  });

  test("an unmarked quote ends at the sentence end", () => {
    expect(texts(`قال النبي ﷺ: ${HADITH}. وهذا أصل عظيم من أصول الدين.`)).toEqual([["hadith", HADITH]]);
    expect(texts(`قال تعالى: ${VERSE}؟ ثم ماذا`)).toEqual([["quran", VERSE]]);
  });

  test("a one-word quote is dropped, except inside ﴿ ﴾", () => {
    expect(texts("قال تعالى: «الرحمن»")).toEqual([]);
    expect(texts("قال ﷺ: «الصبر»")).toEqual([]);
    expect(texts("قال تعالى: الرحمن.")).toEqual([]);
    expect(texts("قال تعالى: ﴿الرحمن﴾")).toEqual([["quran", "الرحمن"]]);
  });

  test("marks with no attribution phrase give nothing", () => {
    expect(texts("كتاب «رياض الصالحين» نافع.")).toEqual([]);
    expect(texts('وهذا ما يسمى "حسن الخلق" عند الناس (أي المعاملة الطيبة).')).toEqual([]);
    expect(texts("مقال بلا أي اقتباس.")).toEqual([]);
    expect(texts("")).toEqual([]);
  });

  test("an unclosed or nested mark gives nothing", () => {
    expect(texts(`قال ﷺ: «${HADITH}`)).toEqual([]);
    expect(texts(`قال تعالى: "${VERSE}\nوسطر آخر"`)).toEqual([]);
  });

  test("a ﴿…﴾ inside a hadith quote is not a separate quote", () => {
    const hadith = "من قرأ ﴿قل هو الله أحد﴾ فكأنما قرأ ثلث القرآن";
    expect(texts(`قال رسول الله ﷺ: «${hadith}» ثم ﴿${VERSE}﴾`)).toEqual([
      ["hadith", hadith],
      ["quran", VERSE],
    ]);
  });

  test("an unmarked quote stops before ﴿, which stays a Quran quote", () => {
    expect(texts(`قال رسول الله ﷺ: اقرؤوا سورة الإخلاص ﴿قل هو الله أحد﴾ كل ليلة.`)).toEqual([
      ["hadith", "اقرؤوا سورة الإخلاص"],
      ["quran", "قل هو الله أحد"],
    ]);
  });
});

describe("claims", () => {
  const claims = (draft: string) => extract(draft).map((q) => [q.claimedKind, q.claimLevel, q.span.text]);

  test.each([
    ["وتدل الآية على وجوب الصبر في كل حال.", "وتدل الآية على وجوب الصبر في كل حال"],
    ["ويدل الحديث على فضل النصيحة، وهذا ظاهر. ثم كلام آخر", "ويدل الحديث على فضل النصيحة، وهذا ظاهر"],
    ["يُفهم من الآية أن اليسر قريب!", "يُفهم من الآية أن اليسر قريب"],
    ["ويفهم من الحديث أن النصيحة واجبة\nسطر آخر", "ويفهم من الحديث أن النصيحة واجبة"],
  ])("a conclusion drawn from a named text is a level C claim, up to the sentence end: %s", (draft, text) => {
    expect(claims(draft)).toEqual([["interpretive_claim", "C", text]]);
  });

  test.each([
    ["والجواب: يجوز لك أن تفطر في سفرك، ولا شيء عليك.", "يجوز لك أن تفطر في سفرك، ولا شيء عليك"],
    ["فلا يجوز لك ترك العمل.", "فلا يجوز لك ترك العمل"],
    ["يجب عليك قضاء ما فاتك؟", "يجب عليك قضاء ما فاتك"],
    ["ويحرم عليك هذا البيع.", "ويحرم عليك هذا البيع"],
  ])("a ruling addressed to the reader is a level D claim: %s", (draft, text) => {
    expect(claims(draft)).toEqual([["interpretive_claim", "D", text]]);
  });

  test("a claim stops before the quotation it rests on, which stays an item of its own", () => {
    expect(claims(`يجوز لك أن تفطر لقوله تعالى: ﴿${VERSE}﴾.`)).toEqual([
      ["interpretive_claim", "D", "يجوز لك أن تفطر"],
      ["quran", undefined, VERSE],
    ]);
    expect(claims(`قال تعالى: ﴿${VERSE}﴾. وتدل الآية على قرب الفرج.`)).toEqual([
      ["quran", undefined, VERSE],
      ["interpretive_claim", "C", "وتدل الآية على قرب الفرج"],
    ]);
  });

  test("the words of a quotation are never a claim", () => {
    expect(claims("قال رسول الله ﷺ: «لا يجوز لك أن تهجر أخاك»")).toEqual([["hadith", undefined, "لا يجوز لك أن تهجر أخاك"]]);
    expect(claims("قال النبي ﷺ: يجب عليك الصدق في القول.")).toEqual([["hadith", undefined, "يجب عليك الصدق في القول"]]);
  });

  test("a phrase with nothing after it, a general ruling word, and ordinary prose give nothing", () => {
    expect(claims("وهذا ما تدل الآية على.")).toEqual([]);
    expect(claims("يجوز للمسافر أن يفطر.")).toEqual([]);
    expect(claims("فاحرص على الصدق في كل حال.")).toEqual([]);
  });

  test("the claim list can be replaced", () => {
    const none = createRegexExtractor(ATTRIBUTION_PATTERNS, []);
    expect(none("يجوز لك أن تفطر في سفرك.")).toEqual([]);
    expect(CLAIM_PATTERNS.every((p) => p.claimLevel === "C" || p.claimLevel === "D")).toBe(true);
  });
});

test("the pattern list can be extended", () => {
  const extended = createRegexExtractor([...ATTRIBUTION_PATTERNS, { phrase: "قال عمر", claimedKind: "athar", unmarked: "afterColon" }]);
  expect(extended("قال عمر رضي الله عنه: «نعم العبد صهيب»").map((q) => [q.claimedKind, q.span.text])).toEqual([["athar", "نعم العبد صهيب"]]);
  expect(regexExtractor("قال عمر رضي الله عنه: «نعم العبد صهيب»")).toEqual([]);
});

test("every span is the draft's own text; spans come in draft order and do not overlap", () => {
  const long = [...seen].join("\n");
  expect(seen.size).toBeGreaterThan(80);
  for (const draft of [...seen, long]) {
    let lastEnd = 0;
    for (const quote of regexExtractor(draft)) {
      expect(quote.extractedBy).toBe("regex");
      expect(quote.span.text).toBe(draft.slice(quote.span.start, quote.span.end));
      expect(quote.span.text).toBe(quote.span.text.trim());
      expect(quote.span.text).not.toMatch(/[«»“”"]$|^[«»“”"﴿]|ﷺ/);
      expect(quote.span.start).toBeGreaterThanOrEqual(lastEnd);
      expect(quote.span.end).toBeGreaterThan(quote.span.start);
      lastEnd = quote.span.end;
    }
  }
});
