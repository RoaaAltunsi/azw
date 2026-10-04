// The explanation's input and its validator. Fixture sentences, not source text.
import { describe, expect, test } from "vitest";
import type { Evidence, ReviewItem } from "../types";
import { buildExplainInput, FORBIDDEN_WORDS, validateExplanation, type ExplainDiffInput } from "./index";

const INPUT: ExplainDiffInput = {
  draftExcerpt: "ولم يكن له ندا أحد",
  sourceText: "ولم يكن له كفوا أحد. ثم كلام",
  sourceCitation: "سورة الإخلاص، الآية 4",
  draftCitation: "[الإخلاص: 3]",
  reasonCode: "WORDING_DIFF",
  diffOps: [{ op: "replace", draft: "ندا", source: "كفوا" }],
};
const TITLES = ["القرآن الكريم", "صحيح البخاري", "صحيح مسلم"];
const check = (text: string, input = INPUT, titles = TITLES) => validateExplanation(text, input, titles);

describe("validateExplanation", () => {
  test("a good note is accepted, trimmed", () => {
    const note = "في مسودتك «ندا»، وفي نص المصدر «كفوا». ورقم الآية في المسودة 3، وهو في المصدر 4.";
    expect(check(`  ${note}\n`)).toBe(note);
    expect(check("الآية في المصدر ﴿ولم يكن له كفوا أحد﴾، والمرجع المذكور «[الإخلاص: 3]».")).not.toBeNull();
    // Arabic-Indic digits are read as numbers.
    expect(check("رقم الآية في المصدر ٤.")).not.toBeNull();
  });

  test("length: at most 240 characters", () => {
    expect(check("ا".repeat(240))).not.toBeNull();
    expect(check("ا".repeat(241))).toBeNull();
    expect(check("  ")).toBeNull();
  });

  test("sentences: at most two; a full stop inside a quoted segment ends none", () => {
    expect(check("جملة أولى. جملة ثانية.")).not.toBeNull();
    expect(check("جملة أولى. جملة ثانية. جملة ثالثة.")).toBeNull();
    expect(check("جملة أولى؟ جملة ثانية! جملة ثالثة")).toBeNull();
    expect(check("سطر أول\nسطر ثان\nسطر ثالث")).toBeNull();
    expect(check("في المصدر «كفوا أحد. ثم كلام». جملة ثانية.")).not.toBeNull();
  });

  test("a quoted segment that is in none of the inputs is rejected", () => {
    expect(check("في نص المصدر «شريكا».")).toBeNull();
    expect(check("في نص المصدر ﴿ولم يكن له شريك﴾.")).toBeNull();
    // Verbatim: the same word in another spelling is not the input's text.
    expect(check("في نص المصدر «كُفُوًا».")).toBeNull();
    expect(check("في نص المصدر «».")).toBeNull();
  });

  test("words quoted in any other way cannot be checked: rejected", () => {
    expect(check('في نص المصدر "كفوا".')).toBeNull();
    expect(check("في نص المصدر “كفوا”.")).toBeNull();
    expect(check("في نص المصدر «كفوا.")).toBeNull();
    expect(check("في نص المصدر كفوا﴾.")).toBeNull();
  });

  test("a number that is in neither citation is rejected", () => {
    expect(check("رقم الآية في المصدر 5.")).toBeNull();
    expect(check("رقم الآية في المصدر ٥.")).toBeNull();
    // A whole number, not a digit of one.
    expect(check("رقم الآية 43.")).toBeNull();
    expect(check("رقم الآية 3.", { ...INPUT, draftCitation: null })).toBeNull();
  });

  test.each(FORBIDDEN_WORDS)("the word «%s» is rejected", (word) => {
    expect(check(`في العبارة ${word} هنا.`)).toBeNull();
    expect(check(`وال${word} هنا.`)).toBeNull();
  });

  test("a forbidden word is found under diacritics and inside a quoted segment", () => {
    expect(check("هذا نص صَحِيحٌ.")).toBeNull();
    expect(check("في مسودتك «الحكم»", { ...INPUT, draftExcerpt: "إن الحكم إلا لله" })).toBeNull();
  });

  test("the title of a covered book passes; the same word outside a title does not", () => {
    const hadith = { ...INPUT, sourceCitation: "صحيح البخاري، حديث رقم 1", draftCitation: "رواه مسلم" };
    const note = "وجدنا هذا النص في «صحيح البخاري» برقم 1، لا في الكتاب المذكور في المسودة.";
    expect(check(note, hadith)).toBe(note);
    expect(check(note, hadith, [])).toBeNull();
    expect(check("هذا حديث صحيح في «صحيح البخاري».", hadith)).toBeNull();
  });

  test("the list is the one of the prompt", () => {
    expect(FORBIDDEN_WORDS).toEqual(["صحيح", "ضعيف", "موضوع", "حكم", "يجب", "يحرم", "فتوى"]);
  });
});

describe("buildExplainInput", () => {
  const record = (id: string, exactText: string, display: string): Evidence["record"] => ({
    id,
    kind: "quran",
    collection: "quran",
    exactText,
    citation: { display },
    sourceName: "fixture",
    edition: "fixture",
    license: "fixture",
    reviewStatus: "reviewed",
  });
  const draft = "قال: aa xx cc dd ee [مرجع]";
  const start = draft.indexOf("aa");
  const at = (word: string) => ({ start: draft.indexOf(word), end: draft.indexOf(word) + word.length });
  const item: ReviewItem = {
    id: "item",
    span: { start, end: start + 14, text: "aa xx cc dd ee" },
    claimedKind: "quran",
    citedReference: { raw: "[مرجع]" },
    status: "DIFFERS",
    contentLevel: "A",
    reasonCode: "WORDING_DIFF",
    reasonAr: "جملة.",
    evidence: [],
    extractedBy: ["regex"],
  };
  const occurrence: Evidence[] = [
    {
      record: record("r1", "aa bb", "مرجع 1"),
      score: 0.8,
      diff: [
        { op: "equal", draft: at("aa"), source: { recordId: "r1", start: 0, end: 2 } },
        { op: "replace", draft: at("xx"), source: { recordId: "r1", start: 3, end: 5 } },
      ],
    },
    {
      record: record("r2", "cc mm dd", "مرجع 2"),
      score: 0.8,
      diff: [
        { op: "equal", draft: at("cc"), source: { recordId: "r2", start: 0, end: 2 } },
        { op: "delete", source: { recordId: "r2", start: 3, end: 5 } },
        { op: "equal", draft: at("dd"), source: { recordId: "r2", start: 6, end: 8 } },
        { op: "insert", draft: at("ee") },
      ],
    },
  ];

  test("the names of the prompt; the diff as words, without the equal ops", () => {
    expect(buildExplainInput(draft, item, occurrence)).toEqual({
      draftExcerpt: "aa xx cc dd ee",
      sourceText: "aa bb cc mm dd",
      sourceCitation: "من مرجع 1 إلى مرجع 2",
      draftCitation: "[مرجع]",
      reasonCode: "WORDING_DIFF",
      diffOps: [
        { op: "replace", draft: "xx", source: "bb" },
        { op: "delete", source: "mm" },
        { op: "insert", draft: "ee" },
      ],
    });
  });

  test("one record, no cited reference, no diff", () => {
    expect(buildExplainInput(draft, { ...item, citedReference: undefined },[{ record: occurrence[0]!.record, score: 1 }])).toMatchObject({
      sourceText: "aa bb",
      sourceCitation: "مرجع 1",
      draftCitation: null,
      diffOps: [],
    });
  });
});
