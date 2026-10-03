import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  attachReference,
  CollectionAliasSchema,
  MAX_WORDS_BEFORE_QUOTE,
  parseReferences,
  ReferenceSchema,
  SurahAliasSchema,
  type ParsedReference,
  type Reference,
  type ReferenceAliases,
} from "./index";

const readJson = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../data/aliases/${file}`, import.meta.url), "utf8"));

const aliases: ReferenceAliases = {
  surahs: z.object({ surahs: z.array(SurahAliasSchema) }).parse(readJson("surahs.json")).surahs,
  collections: z.object({ entries: z.array(CollectionAliasSchema) }).parse(readJson("collections.json")).entries,
};

const parse = (draft: string): Reference[] => parseReferences(draft, aliases);
const parsedOf = (draft: string): ParsedReference[] => parse(draft).map((r) => r.parsed);
const rawOf = (draft: string): string[] => parse(draft).map((r) => r.raw);

const quran = (surah: number, ayahStart?: number, ayahEnd?: number): ParsedReference => ({
  type: "quran",
  surah,
  ...(ayahStart !== undefined && { ayahStart }),
  ...(ayahEnd !== undefined && { ayahEnd }),
});
const hadith = (collections: string[], number?: string): ParsedReference => ({
  type: "hadith",
  collections,
  ...(number !== undefined && { number }),
});

describe("alias files", () => {
  test("surahs.json lists 114 surahs and no name resolves to two of them", () => {
    expect(aliases.surahs).toHaveLength(114);
    for (const s of aliases.surahs) {
      for (const name of [s.bareName, ...s.spellingVariants, ...s.alternateNames]) {
        expect(parsedOf(`سورة ${name}`), name).toEqual([quran(s.number)]);
      }
    }
  });

  test("every collection name and phrase is recognised", () => {
    for (const e of aliases.collections) {
      for (const name of e.names) expect(parsedOf(`رواه ${name}`), name).toEqual([hadith(e.collections)]);
      for (const phrase of e.phrases) expect(parsedOf(`كما في ${phrase}`), phrase).toEqual([hadith(e.collections)]);
    }
  });
});

describe("Quran references", () => {
  const cases: Array<[string, string, string, ParsedReference]> = [
    // the forms named in the prompt
    ["round brackets with colon", "﴿…﴾ (البقرة: 152) ثم", "(البقرة: 152)", quran(2, 152)],
    ["square brackets, no colon", "﴿…﴾ [البقرة 153]", "[البقرة 153]", quran(2, 153)],
    ["«سورة … الآية …»", "في سورة البقرة الآية 153 قال", "سورة البقرة الآية 153", quran(2, 153)],
    ["slash", "انظر البقرة/153 ففيها", "البقرة/153", quran(2, 153)],
    ["range", "﴿…﴾ (البقرة: 153-154)", "(البقرة: 153-154)", quran(2, 153, 154)],
    // digits
    ["Arabic-Indic digits", "(البقرة: ١٥٣)", "(البقرة: ١٥٣)", quran(2, 153)],
    ["Arabic-Indic range", "[الإخلاص: ١-٤]", "[الإخلاص: ١-٤]", quran(112, 1, 4)],
    ["range typed reversed", "(البقرة: ١٥٤-١٥٣)", "(البقرة: ١٥٤-١٥٣)", quran(2, 153, 154)],
    ["range with en dash", "[الطلاق: 2–3]", "[الطلاق: 2–3]", quran(65, 2, 3)],
    ["range with a tatweel as dash", "[الطلاق: 2ـ3]", "[الطلاق: 2ـ3]", quran(65, 2, 3)],
    ["range with «إلى»", "سورة البقرة الآيات 153 إلى 157", "سورة البقرة الآيات 153 إلى 157", quran(2, 153, 157)],
    ["a range of one ayah is a single ayah", "(البقرة: 153-153)", "(البقرة: 153-153)", quran(2, 153)],
    // surah names
    ["diacritics on the name", "[الْبَقَرَة: 153]", "[الْبَقَرَة: 153]", quran(2, 153)],
    ["misspelled: ه for ة", "(البقره: 153)", "(البقره: 153)", quran(2, 153)],
    ["misspelled: no hamza", "[الاخلاص: 1]", "[الاخلاص: 1]", quran(112, 1)],
    ["misspelled: no madda", "(ال عمران: 102)", "(ال عمران: 102)", quran(3, 102)],
    ["misspelled: ى for ي, ا for أ", "[الانبياء: 107]", "[الانبياء: 107]", quran(21, 107)],
    ["spelling variant from the aliases", "[الانفطار: 6]", "[الانفطار: 6]", quran(82, 6)],
    ["alternate name from the aliases", "[الانشراح: 5]", "[الانشراح: 5]", quran(94, 5)],
    ["alternate name «براءة»", "(براءة: 40)", "(براءة: 40)", quran(9, 40)],
    ["two-word name", "(آل عمران: 102)", "(آل عمران: 102)", quran(3, 102)],
    ["longest name wins: «حم السجدة» is فصلت", "[حم السجدة: 30]", "[حم السجدة: 30]", quran(41, 30)],
    ["longest name wins: «النساء الصغرى» is الطلاق", "[النساء الصغرى: 2]", "[النساء الصغرى: 2]", quran(65, 2)],
    ["one-letter name with a colon", "[ص: 29]", "[ص: 29]", quran(38, 29)],
    // other shapes
    ["comma instead of colon", "(البقرة، 153)", "(البقرة، 153)", quran(2, 153)],
    ["braces", "{البقرة: 153}", "{البقرة: 153}", quran(2, 153)],
    ["«سورة» inside brackets takes the brackets", "(سورة البقرة: 153)", "(سورة البقرة: 153)", quran(2, 153)],
    ["«سورة …، الآية …» in brackets", "(سورة البقرة، الآية 255)", "(سورة البقرة، الآية 255)", quran(2, 255)],
    ["«آية رقم»", "سورة البقرة آية رقم 255.", "سورة البقرة آية رقم 255", quran(2, 255)],
    ["ayah first", "الآية 255 من سورة البقرة.", "الآية 255 من سورة البقرة", quran(2, 255)],
    ["ayat first, range", "الآيات 1-4 من سورة الإخلاص", "الآيات 1-4 من سورة الإخلاص", quran(112, 1, 4)],
    ["surah only", "قال تعالى في سورة الكهف: ﴿…﴾", "سورة الكهف", quran(18)],
    ["surah only, prefixed «ب»", "افتتح بسورة الفاتحة", "بسورة الفاتحة", quran(1)],
    ["surah only in square brackets", "﴿…﴾ [البقرة]", "[البقرة]", quran(2)],
    ["an ayah number the surah does not have is still a citation", "(البقرة: 300)", "(البقرة: 300)", quran(2, 300)],
    ["a list of ayat keeps the surah only", "(البقرة: 153، 155)", "(البقرة: 153، 155)", quran(2)],
  ];

  test.each(cases)("%s", (_name, draft, raw, parsed) => {
    const refs = parse(draft);
    expect(refs.map((r) => r.parsed)).toEqual([parsed]);
    expect(refs[0]!.raw).toBe(raw);
    expect(draft.slice(refs[0]!.span.start, refs[0]!.span.end)).toBe(raw);
  });
});

describe("hadith references", () => {
  const both = ["bukhari", "muslim"];
  const cases: Array<[string, string, string, ParsedReference]> = [
    // the forms named in the prompt
    ["«رواه البخاري»", "«…» رواه البخاري.", "رواه البخاري", hadith(["bukhari"])],
    ["«أخرجه مسلم»", "«…» أخرجه مسلم.", "أخرجه مسلم", hadith(["muslim"])],
    ["number in brackets", "«…» رواه البخاري (1).", "رواه البخاري (1)", hadith(["bukhari"], "1")],
    ["«صحيح مسلم برقم»", "وهو في صحيح مسلم برقم 1907.", "صحيح مسلم برقم 1907", hadith(["muslim"], "1907")],
    ["«متفق عليه»", "«…» متفق عليه.", "متفق عليه", hadith(both)],
    // more
    ["two collections", "«…» رواه البخاري ومسلم.", "رواه البخاري ومسلم", hadith(both)],
    ["diacritics", "رَوَاهُ الْبُخَارِيُّ", "رَوَاهُ الْبُخَارِيُّ", hadith(["bukhari"])],
    ["Arabic-Indic number", "رواه مسلم برقم ٢٦٩٩", "رواه مسلم برقم ٢٦٩٩", hadith(["muslim"], "2699")],
    ["bare number", "أخرجه مسلم 2699.", "أخرجه مسلم 2699", hadith(["muslim"], "2699")],
    ["«رقم» with brackets", "رواه البخاري رقم (6018)", "رواه البخاري رقم (6018)", hadith(["bukhari"], "6018")],
    ["«حديث رقم» in brackets", "«…» (صحيح البخاري، حديث رقم 13).", "(صحيح البخاري، حديث رقم 13)", hadith(["bukhari"], "13")],
    ["«الإمام … في صحيحه»", "رواه الإمام مسلم في صحيحه (2699)", "رواه الإمام مسلم في صحيحه (2699)", hadith(["muslim"], "2699")],
    ["verb with «و»", "«…» ورواه مسلم", "ورواه مسلم", hadith(["muslim"])],
    ["«روى»", "روى البخاري عن أنس", "روى البخاري", hadith(["bukhari"])],
    ["«الصحيحين»", "وفي الصحيحين: «…»", "الصحيحين", hadith(both)],
    ["«رواه الشيخان»", "«…» رواه الشيخان", "رواه الشيخان", hadith(both)],
    ["a collection outside the corpus", "«…» رواه الترمذي.", "رواه الترمذي", hadith(["tirmidhi"])],
    ["several other collections", "رواه أبو داود والترمذي وابن ماجه", "رواه أبو داود والترمذي وابن ماجه", hadith(["abudawud", "tirmidhi", "ibnmajah"])],
    ["name alone in brackets", "«…» (البخاري)", "(البخاري)", hadith(["bukhari"])],
    ["name and number in brackets", "«…» [مسلم: 2699]", "[مسلم: 2699]", hadith(["muslim"], "2699")],
    ["volume and page are not a hadith number", "رواه البخاري 1/20", "رواه البخاري", hadith(["bukhari"])],
    ["volume and page in brackets are skipped", "أخرجه أحمد (5/231) والترمذي (2616)", "أخرجه أحمد (5/231) والترمذي (2616)", { type: "hadith", collections: ["ahmad", "tirmidhi"], numbers: { tirmidhi: "2616" } }],
    ["whole bracket with a verb", "«…» (رواه البخاري ومسلم).", "(رواه البخاري ومسلم)", hadith(both)],
    ["«في كتاب …» is a place inside the collection", "رواه البخاري في كتاب الإيمان", "رواه البخاري", hadith(["bukhari"])],
    ["another work of the author drops out of the list", "رواه مسلم والبخاري في الأدب المفرد", "رواه مسلم والبخاري", hadith(["muslim"])],
  ];

  test.each(cases)("%s", (_name, draft, raw, parsed) => {
    const refs = parse(draft);
    expect(refs.map((r) => r.parsed)).toEqual([parsed]);
    expect(refs[0]!.raw).toBe(raw);
  });

  test("each collection keeps its own number", () => {
    const expected = { type: "hadith", collections: ["bukhari", "muslim"], numbers: { bukhari: "6018", muslim: "2564" } };
    expect(parsedOf("«…» رواه البخاري (6018) ومسلم (2564).")).toEqual([expected]);
    expect(parsedOf("«…» (البخاري 6018، مسلم 2564)")).toEqual([expected]);
  });

  test("a number after one of two collections is kept for that collection", () => {
    expect(parsedOf("رواه البخاري ومسلم (2564)")).toEqual([
      { type: "hadith", collections: ["bukhari", "muslim"], numbers: { muslim: "2564" } },
    ]);
  });
});

describe("unknown references", () => {
  test.each([
    ["a book with volume and page", "«…» [تفسير ابن كثير 1/20]"],
    ["«انظر»", "(انظر: فتح الباري 1/15)"],
    ["a surah name that is not in the aliases", "﴿…﴾ (البقرا: 153)"],
    ["a page", "(ص 15)"],
    ["a one-letter surah name without a colon", "[ق 16]"],
    ["a surah cited by its number", "﴿…﴾ [2:153]"],
    ["a surah cited by its number, with a range", "﴿…﴾ (٢:١٥٣-١٥٤)"],
  ])("%s", (_name, draft) => {
    const refs = parse(draft);
    expect(refs.map((r) => r.parsed)).toEqual([{ type: "unknown" }]);
    expect(refs[0]!.raw).toBe(draft.slice(draft.search(/[([]/)));
  });
});

test("another work of a known author is not his collection", () => {
  // al-Adab al-Mufrad is not Sahih al-Bukhari.
  expect(parse("«…» رواه البخاري في الأدب المفرد.")).toEqual([
    { raw: "رواه البخاري", span: { start: 4, end: 16 }, parsed: { type: "unknown" } },
  ]);
});

describe("no false positives", () => {
  test.each([
    ["an ordinary number", "حضر الدرس 153 طالبا من النساء والرجال."],
    ["a name, a colon and a number", "قال محمد: 3 أمور تنفع المؤمن."],
    ["a year", "في عام 2020 زار المسجد 15 رجلا."],
    ["a year in brackets", "بدأ المشروع (عام 2020) ثم توقف."],
    ["list numbering", "(1) الصبر (2) الصلاة [3] الذكر"],
    ["a time and a fraction", "الساعة 10:30 ونسبة 3/4"],
    ["«(ص)» for ﷺ", "قال النبي (ص): «…»"],
    ["a bare surah name in round brackets", "ذكر الله (الناس) و(محمد) في كتابه"],
    ["surah names as ordinary words", "النساء شقائق الرجال، والحج ركن، ونوح نبي، والملك لله"],
    ["«مسلم» as an ordinary word", "كل مسلم يحب الخير، وأحمد ومالك صديقان"],
    ["«متفق عليه» in its everyday sense", "وهذا أمر متفق عليه بين العلماء، وذاك غير متفق عليه"],
    ["a negated narration", "هذا الحديث لم يروه البخاري ولم يخرجه مسلم"],
    ["a narration verb with no collection", "رواه لي صديقي 3 مرات"],
    ["an ordinary parenthesis", "الصبر (وهو حبس النفس) نصف الإيمان"],
    ["a slash after a one-letter surah name", "ص/15"],
    ["a number that is no surah before a colon", "[115:3] و(0:5)"],
  ])("%s", (_name, draft) => {
    expect(rawOf(draft)).toEqual([]);
  });

  test("a number after a surah mention is not an ayah when a word follows it", () => {
    expect(parsedOf("قرأت سورة البقرة 3 مرات")).toEqual([quran(2)]);
    expect(parsedOf("نزلت سورة البقرة عام 2020")).toEqual([quran(2)]);
  });

  test("a number after a collection is not a hadith number when a word follows it", () => {
    expect(parsedOf("رواه البخاري 5 مرات")).toEqual([hadith(["bukhari"])]);
  });
});

describe("parseReferences output", () => {
  test("references come in draft order with exact spans and pass the schema", () => {
    const draft = "قال تعالى: ﴿…﴾ [التوبة: 128]. وقال ﷺ: «…» رواه البخاري (13)، ثم (انظر: الفتح 1/5).";
    const refs = parse(draft);
    expect(refs.map((r) => r.parsed.type)).toEqual(["quran", "hadith", "unknown"]);
    for (const r of refs) {
      expect(ReferenceSchema.safeParse(r).success).toBe(true);
      expect(draft.slice(r.span.start, r.span.end)).toBe(r.raw);
    }
    expect(refs.map((r) => r.raw)).toEqual(["[التوبة: 128]", "رواه البخاري (13)", "(انظر: الفتح 1/5)"]);
  });

  test("an empty draft has no references", () => {
    expect(parse("")).toEqual([]);
  });

  test("the same draft always gives the same result", () => {
    const draft = "﴿…﴾ (البقرة: ١٥٣) و«…» متفق عليه";
    expect(parse(draft)).toEqual(parse(draft));
  });
});

describe("attachReference", () => {
  // The quote is the n-th «…» or ﴿…﴾ of the draft, marks included.
  const attach = (draft: string, n = 0, inner = false): string | undefined => {
    const m = [...draft.matchAll(/«[^»]*»|﴿[^﴾]*﴾/g)][n]!;
    const span = inner ? { start: m.index + 1, end: m.index + m[0].length - 1 } : { start: m.index, end: m.index + m[0].length };
    return attachReference(span, parse(draft), draft)?.raw;
  };

  test("the reference after the quote in the same sentence", () => {
    expect(attach("قال تعالى: ﴿نص﴾ [البقرة: 153]. فمن لزمهما")).toBe("[البقرة: 153]");
    expect(attach("قال ﷺ: «نص» رواه البخاري. فلا تغفل")).toBe("رواه البخاري");
  });

  test("works when the quote span leaves out the quotation marks", () => {
    expect(attach("قال تعالى: ﴿نص﴾ [البقرة: 153].", 0, true)).toBe("[البقرة: 153]");
    expect(attach("في سورة البقرة: ﴿نص﴾ ثم", 0, true)).toBe("سورة البقرة");
  });

  test("words between the quote and the reference, same sentence", () => {
    expect(attach("قال ﷺ: «نص» وهذا الحديث العظيم رواه مسلم.")).toBe("رواه مسلم");
  });

  test("a full stop right after the quote does not separate the reference", () => {
    expect(attach("قال ﷺ: «نص». رواه البخاري.")).toBe("رواه البخاري");
    expect(attach("قال تعالى: ﴿نص﴾.\n[البقرة: 153]")).toBe("[البقرة: 153]");
  });

  test("a reference in a later sentence is not attached", () => {
    expect(attach("قال ﷺ: «نص». وهذا كلام آخر رواه البخاري.")).toBeUndefined();
    expect(attach("﴿نص﴾؟ وهل ذكر في سورة البقرة")).toBeUndefined();
  });

  test("each quote takes its own reference", () => {
    const draft = "قال تعالى: ﴿أ﴾ [طه: 114]. وقال النبي ﷺ: «ب» رواه مسلم.";
    expect(attach(draft, 0)).toBe("[طه: 114]");
    expect(attach(draft, 1)).toBe("رواه مسلم");
  });

  test("the nearest of two references after the quote", () => {
    expect(attach("«نص» رواه البخاري، وهو في صحيح مسلم برقم 5.")).toBe("رواه البخاري");
  });

  test("a reference that follows another quote is not taken", () => {
    const draft = "قال تعالى: ﴿أ﴾ وقال ﷺ: «ب» رواه مسلم.";
    expect(attach(draft, 0)).toBeUndefined();
    expect(attach(draft, 1)).toBe("رواه مسلم");
  });

  test("the reference before the quote when none follows it", () => {
    expect(attach("قال تعالى في سورة البقرة: ﴿نص﴾ فتأمل.")).toBe("سورة البقرة");
    expect(attach("روى البخاري عن أنس رضي الله عنه أن النبي ﷺ قال: «نص».")).toBe("روى البخاري");
  });

  test("the reference after the quote wins over the one before it", () => {
    expect(attach("في سورة البقرة: ﴿نص﴾ [البقرة: 153].")).toBe("[البقرة: 153]");
  });

  test("a reference before the quote that belongs to an earlier quote is not taken", () => {
    const draft = "قال تعالى: ﴿أ﴾ [البقرة: 153]، وقال: ﴿ب﴾ فتدبر.";
    expect(attach(draft, 0)).toBe("[البقرة: 153]");
    expect(attach(draft, 1)).toBeUndefined();
  });

  test("a reference before the quote in an earlier sentence is not taken", () => {
    expect(attach("تأمل سورة البقرة. قال تعالى: ﴿نص﴾ فتدبر.")).toBeUndefined();
  });

  test("a reference too far before the quote is not taken", () => {
    const filler = Array.from({ length: MAX_WORDS_BEFORE_QUOTE + 1 }, () => "كلمة").join(" ");
    expect(attach(`روى البخاري ${filler} «نص»`)).toBeUndefined();
    expect(attach(`روى البخاري ${filler.slice(5)} «نص»`)).toBe("روى البخاري");
  });

  test("no references, no attachment", () => {
    expect(attach("قال ﷺ: «نص» فتأمل.")).toBeUndefined();
    expect(attachReference({ start: 0, end: 3 }, [], "نص.")).toBeUndefined();
  });
});
