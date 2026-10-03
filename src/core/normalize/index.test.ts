import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  ATTRIBUTION_PREAMBLES,
  HONORIFIC_PHRASES,
  normalizeWithMap,
  stripAttributionPreamble,
  tokenize,
  UTHMANI_VARIANT_OPTIONS,
  type NormalizationLevel,
} from "./index";

const search = (text: string): string => normalizeWithMap(text, "search").norm;
const strict = (text: string): string => normalizeWithMap(text, "strict").norm;

interface CorpusRecord {
  id: string;
  exactText: string;
  searchVariants?: Array<{ label: string; text: string }>;
}
const corpus = (collection: string): CorpusRecord[] =>
  (
    JSON.parse(readFileSync(new URL(`../../../data/corpus/${collection}.json`, import.meta.url), "utf8")) as {
      records: CorpusRecord[];
    }
  ).records;
const quran = corpus("quran");
const ayah = (id: string): string => {
  const record = quran.find((r) => r.id === id);
  if (!record) throw new Error(`${id} is not in data/corpus/quran.json`);
  return record.exactText;
};
const uthmaniVariant = (id: string): string | undefined =>
  quran.find((r) => r.id === id)?.searchVariants?.find((v) => v.label === "uthmani")?.text;

describe('level "search": one rule per row', () => {
  const cases: Array<[string, string, string]> = [
    // marks
    ["harakat", "بِسْمِ", "بسم"],
    ["shadda and tanwin", "مُحَمَّدٌ رَسُولٌ", "محمد رسول"],
    ["combining maddah and hamza (U+0653–U+0655)", "آمن ؤ إن", "امن و ان"],
    ["superscript alef", "الرَّحْمَٰنِ", "الرحمن"],
    ["pause marks", "اللَّهِ ۚ وَاللَّهُ ۖ غَفُورٌ", "الله والله غفور"],
    ["rub al-hizb and sajdah signs", "۞ قل ۩", "قل"],
    ["tatweel", "الرحمـــن", "الرحمن"],
    // punctuation and brackets
    ["Arabic punctuation", "قال: «نعم»، ثم؛ لا؟", "قال نعم ثم لا"],
    ["ornate Quran brackets", "﴿قل هو الله احد﴾", "قل هو الله احد"],
    ["Latin punctuation and brackets", `(a) [b] "c" 'd', e. f: g! h? i…`, "a b c d e f g h i"],
    ["punctuation with no space still separates words", "قال:«نعم»", "قال نعم"],
    ["braces used by the hadith source around ayat", "{ قل هو } - قال", "قل هو قال"],
    // letter folds
    ["أ → ا", "أحمد", "احمد"],
    ["إ → ا", "إيمان", "ايمان"],
    ["آ → ا", "آمن", "امن"],
    ["ٱ → ا", "ٱلله", "الله"],
    ["ى → ي", "على هدى", "علي هدي"],
    ["ة → ه", "رحمة", "رحمه"],
    ["ؤ → و", "مؤمن", "مومن"],
    ["ئ → ي", "شيئا", "شييا"],
    ["ء on the line is kept", "شيء", "شيء"],
    // honorifics
    ["ﷺ", "قال النبي ﷺ: نعم", "قال النبي نعم"],
    ["ﷺ with no spaces", "النبيﷺقال", "النبي قال"],
    ["صلى الله عليه وسلم, with diacritics", "رَسُولَ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ، يَقُولُ", "رسول الله يقول"],
    ["عليه الصلاة والسلام", "قال عليه الصلاة والسلام كذا", "قال كذا"],
    ["رضي الله عنه", "عن عمر رضي الله عنه قال", "عن عمر قال"],
    ["رضي الله عنها", "عن عائشة رضي الله عنها قالت", "عن عايشه قالت"],
    ["رضي الله عنهما", "عن ابن عمر رضي الله عنهما قال", "عن ابن عمر قال"],
    ["رضي الله عنهم", "عن الصحابة رضي الله عنهم أنهم", "عن الصحابه انهم"],
    ["رضى written with ى, between dashes", "حصين، - رضى الله عنهما - قال", "حصين قال"],
    ["a phrase alone leaves nothing", "صلى الله عليه وسلم", ""],
    ["two phrases in a row", "عمر رضي الله عنه عن النبي صلى الله عليه وسلم قال", "عمر عن النبي قال"],
    ["a longer word is not cut: عنهن", "رضي الله عنهن أنهن", "رضي الله عنهن انهن"],
    ["similar matn wording is kept", "صلى الله عليه بها عشرا", "صلي الله عليه بها عشرا"],
    // digits and whitespace
    ["Arabic-Indic digits", "٠١٢٣٤٥٦٧٨٩", "0123456789"],
    ["digits inside a reference", "البقرة: ١٥٣", "البقره 153"],
    ["whitespace collapsed and trimmed", "  قل \t\n هو  الله  ", "قل هو الله"],
    ["direction mark separates words", "قال‏نعم", "قال نعم"],
    ["zero-width joiners are removed", "قا‌ل ن‍عم", "قال نعم"],
    // unchanged
    ["Latin text", "Hello World", "Hello World"],
    ["Latin text keeps its case and digits", "Azw v1 2026", "Azw v1 2026"],
    ["empty string", "", ""],
    ["only marks and punctuation", " ۚ «» ـ ", ""],
  ];
  test.each(cases)("%s", (_name, input, expected) => {
    expect(search(input)).toBe(expected);
  });

  test("keepHonorificPhrases keeps the phrases but still removes ﷺ", () => {
    const options = { keepHonorificPhrases: true };
    expect(normalizeWithMap("رضي الله عنهم ورضوا عنه", "search", options).norm).toBe("رضي الله عنهم ورضوا عنه");
    expect(normalizeWithMap("النبي ﷺ قال", "search", options).norm).toBe("النبي قال");
  });

  test("every listed honorific phrase normalizes to nothing", () => {
    for (const phrase of HONORIFIC_PHRASES) expect(search(`قبل ${phrase} بعد`)).toBe("قبل بعد");
  });
});

describe('level "strict": only harakat, tatweel and annotation marks are removed', () => {
  const cases: Array<[string, string, string]> = [
    ["harakat", "بِسْمِ اللَّهِ", "بسم الله"],
    ["tatweel, superscript alef and pause mark", "الرَّحْمَـٰنِ ۚ", "الرحمن "],
    ["letters are not folded", "أحمد إلى آمن ٱلله على رحمة مؤمن شيئا", "أحمد إلى آمن ٱلله على رحمة مؤمن شيئا"],
    ["punctuation, ﷺ and digits are kept", "قال ﷺ: «١»", "قال ﷺ: «١»"],
    ["honorific phrases are kept", "عمر رضي الله عنه", "عمر رضي الله عنه"],
    ["whitespace is kept as is", "  قل   هو ", "  قل   هو "],
    ["Latin text", "Hello, World!", "Hello, World!"],
  ];
  test.each(cases)("%s", (_name, input, expected) => {
    expect(strict(input)).toBe(expected);
  });

  test("a diacritics-only difference disappears, a letter difference does not", () => {
    expect(strict("إِنَّمَا الأَعْمَالُ")).toBe(strict("إنما الأعمال"));
    expect(strict("رحمة")).not.toBe(strict("رحمت"));
  });
});

describe("offset map", () => {
  const inputs: string[] = [
    "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    "  قال: «نعم»،   ثم ﷺ لا؟  ",
    "عن عمر رضي الله عنه قال: سمعت رسول الله صلى الله عليه وسلم يقول",
    "صلى الله عليه وسلم",
    "آية ١٢٣ (Latin text) 😀 end",
    "",
    ayah("quran:2:255"),
    ayah("quran:98:8"),
    corpus("bukhari")[0]!.exactText,
  ];
  const levels: NormalizationLevel[] = ["search", "strict"];
  const table = inputs.flatMap((input) => levels.map((level): [NormalizationLevel, string] => [level, input]));

  test.each(table)("%s: every norm char traces to its source char — %s", (level, input) => {
    const { norm, map } = normalizeWithMap(input, level);
    expect(map).toHaveLength(norm.length);
    for (let i = 0; i < norm.length; i++) {
      const at = map[i]!;
      expect(Number.isInteger(at) && at >= 0 && at < input.length).toBe(true);
      if (i > 0) expect(at).toBeGreaterThan(map[i - 1]!);
      const source = input[at]!;
      if (level === "strict") expect(source).toBe(norm[i]);
      // A separator (space, punctuation, ﷺ) is the source of a space; on its own it normalizes to "".
      else if (norm[i] === " ") expect(search(source)).toBe("");
      else if (source !== norm[i]) expect(search(source)).toBe(norm[i]);
    }
  });

  test("a match in norm maps back to the exact span of the original", () => {
    const original = "قال: «إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ» رواه";
    const { norm, map } = normalizeWithMap(original, "search");
    const start = norm.indexOf("الاعمال");
    const end = start + "الاعمال".length - 1;
    expect(original.slice(map[start]!, map[end]! + 1)).toBe("الأَعْمَال");
  });

  test("foldHamzaAlef drops the hamza of «ءا» and keeps the map aligned", () => {
    const original = "فِى ٱلْءَاخِرَةِ جُزْءًا";
    const { norm, map } = normalizeWithMap(original, "search", { foldHamzaAlef: true });
    expect(norm).toBe("في الاخره جزا");
    expect(map).toHaveLength(norm.length);
    expect(original[map[norm.indexOf("اخره")]!]).toBe("ا");
    // Off by default: the main search text keeps the hamza.
    expect(search(original)).toBe("في الءاخره جزءا");
    expect(normalizeWithMap("شيء ءامنوا سماء السماء انشقت", "search", { foldHamzaAlef: true }).norm).toBe("شيء امنوا سماء السماء انشقت");
  });

  test("superscriptAlefAsAlef turns U+0670 into a letter that maps to the mark", () => {
    const original = "ذَٰلِكَ ٱلْكِتَٰبُ";
    const { norm, map } = normalizeWithMap(original, "search", { superscriptAlefAsAlef: true });
    expect(norm).toBe("ذالك الكتاب");
    expect(map).toHaveLength(norm.length);
    expect(original[map[norm.lastIndexOf("ا")]!]).toBe("ٰ");
    // Off by default, and never at level "strict".
    expect(search(original)).toBe("ذلك الكتب");
    expect(normalizeWithMap(original, "strict", { superscriptAlefAsAlef: true }).norm).toBe("ذلك ٱلكتب");
  });

  test("the map skips a removed honorific phrase", () => {
    const original = "النبي صلى الله عليه وسلم قال";
    const { norm, map } = normalizeWithMap(original, "search");
    expect(norm).toBe("النبي قال");
    expect(map[norm.indexOf("قال")]).toBe(original.indexOf("قال"));
  });
});

describe("samples from data/corpus/quran.json", () => {
  const cases: Array<[string, string]> = [
    ["quran:1:1", "بسم الله الرحمن الرحيم"],
    ["quran:112:1", "قل هو الله احد"],
    ["quran:7:206", "ان الذين عند ربك لا يستكبرون عن عبادته ويسبحونه وله يسجدون"],
    ["quran:2:207", "ومن الناس من يشري نفسه ابتغاء مرضات الله والله رءوف بالعباد"],
    ["quran:17:34", "ولا تقربوا مال اليتيم الا بالتي هي احسن حتي يبلغ اشده واوفوا بالعهد ان العهد كان مسيولا"],
    [
      "quran:66:10",
      "ضرب الله مثلا للذين كفروا امرات نوح وامرات لوط كانتا تحت عبدين من عبادنا صالحين فخانتاهما فلم يغنيا عنهما من الله شييا وقيل ادخلا النار مع الداخلين",
    ],
  ];
  test.each(cases)("%s", (id, expected) => {
    expect(search(ayah(id))).toBe(expected);
  });

  test("an undiacritized everyday quotation equals the normalized ayah", () => {
    expect(search("بسم الله الرحمن الرحيم")).toBe(search(ayah("quran:1:1")));
    expect(search("إن الذين عند ربك لا يستكبرون عن عبادته ويسبحونه وله يسجدون")).toBe(search(ayah("quran:7:206")));
  });

  test("a paste in Uthmani script equals the normalized ayah when only marks and wasla differ", () => {
    expect(search("بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ")).toBe(search(ayah("quran:1:1")));
    expect(search("قُلْ هُوَ ٱللَّهُ أَحَدٌ")).toBe(search(ayah("quran:112:1")));
  });

  test("«رضي الله عنهم» inside an ayah is kept with keepHonorificPhrases", () => {
    const norm = normalizeWithMap(ayah("quran:98:8"), "search", { keepHonorificPhrases: true }).norm;
    expect(norm).toContain("رضي الله عنهم ورضوا عنه");
    expect(search(ayah("quran:98:8"))).not.toContain("رضي الله عنهم");
  });

  // The "uthmani" search variant (docs/DECISIONS.md D-9): the pasted text below is eval case T-007.
  const plain = (text: string): string => normalizeWithMap(text, "search", { keepHonorificPhrases: true }).norm;
  const uthmani = (text: string): string => normalizeWithMap(text, "search", UTHMANI_VARIANT_OPTIONS).norm;

  test("an Uthmani-script paste equals the ayah's uthmani search variant, not its searchText", () => {
    // The quote of eval case T-007: the Tanzil Uthmani text of 103:2, read from the case file.
    const t007 = readFileSync(new URL("../../../eval/cases/tune.jsonl", import.meta.url), "utf8")
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line) as { id: string; expected: Array<{ quote: string }> })
      .find((c) => c.id === "T-007");
    const paste = t007!.expected[0]!.quote;
    expect(uthmani(paste)).toBe("ان الانسان لفي خسر");
    expect(uthmaniVariant("quran:103:2")).toBe(uthmani(paste));
    // With the plain options the superscript alef is removed, so the paste is not the searchText.
    expect(plain(paste)).toBe("ان الانسن لفي خسر");
    expect(plain(paste)).not.toBe(plain(ayah("quran:103:2")));
  });

  // Uthmani script writes these alefs as a mark. An everyday-script draft that drops the letter
  // has a different word («الكتب», «ملك») and must not be found through the variant.
  const droppedAlef: Array<[string, string]> = [
    ["quran:103:2", "إن الإنسن لفي خسر"],
    ["quran:2:2", "ذلك الكتب لا ريب فيه هدى للمتقين"],
    ["quran:1:4", "ملك يوم الدين"],
  ];
  test.each(droppedAlef)("%s: an everyday-script draft with a dropped alef equals neither search text — %s", (id, draft) => {
    expect(uthmaniVariant(id)).toBeDefined();
    expect(uthmani(draft)).not.toBe(uthmaniVariant(id));
    expect(plain(draft)).not.toBe(plain(ayah(id)));
  });

  test("every Quran record has exactly one uthmani variant, and other collections have none", () => {
    expect(quran.every((r) => r.searchVariants?.length === 1 && r.searchVariants[0]!.label === "uthmani" && r.searchVariants[0]!.text !== "")).toBe(true);
    expect(corpus("bukhari").some((r) => r.searchVariants !== undefined)).toBe(false);
  });

  test("both Uthmani spellings of «الآخرة» equal the uthmani search variant", () => {
    const variant = uthmaniVariant("quran:2:4");
    expect(variant).toContain("وبالاخره هم يوقنون");
    // In turn: a madda on the alef, a separate hamza letter, a hamza mark on a tatweel.
    for (const word of ["وَبِٱلۡأٓخِرَةِ", "وَبِٱلْءَاخِرَةِ", "وَبِٱلْـَٔاخِرَةِ"]) {
      expect(normalizeWithMap(word, "search", UTHMANI_VARIANT_OPTIONS).norm).toBe("وبالاخره");
    }
    // Without the option the second spelling keeps its hamza and would not be found.
    expect(normalizeWithMap("وَبِٱلْءَاخِرَةِ", "search", { keepHonorificPhrases: true }).norm).toBe("وبالءاخره");
  });

  // docs/DECISIONS.md D-9: these rows record what normalization alone does. The mushaf spellings
  // are bridged outside it (ayah-bound variant list, uthmani search variant).
  const spellings: Array<[string, string, boolean]> = [
    ["الملأ", "الملإ", true],
    ["نبأ", "نبإ", true],
    ["رحمة", "رحمت", false],
    ["امرأة", "امرأت", false],
    ["رؤوف", "رءوف", false],
    ["مسؤولا", "مسئولا", false],
    ["داود", "داوود", false],
    ["مئة", "مائة", false],
    ["ٱلْعَـٰلَمِينَ", "الْعَالَمِينَ", false], // Uthmani script writes this alef as a mark
  ];
  test.each(spellings)("everyday or Uthmani «%s» vs the source's «%s»: equal after normalization = %s", (a, b, equal) => {
    expect(search(a) === search(b)).toBe(equal);
  });
});

describe("stripAttributionPreamble", () => {
  const cases: Array<[string, string, string]> = [
    ["قال رسول الله", "قال رسول الله ﷺ: «إنما الأعمال بالنيات»", "انما الاعمال بالنيات"],
    ["قال النبي", "قال النبي صلى الله عليه وسلم: الدين النصيحة", "الدين النصيحه"],
    ["عن النبي أنه قال", "عن النبي ﷺ أنه قال: الدين النصيحة", "الدين النصيحه"],
    ["في الحديث", "في الحديث: «الدين النصيحة»", "الدين النصيحه"],
    ["قال تعالى", "قال تعالى: ﴿قل هو الله أحد﴾", "قل هو الله احد"],
    ["قال الله تعالى", "قال الله تعالى: ﴿قل هو الله أحد﴾", "قل هو الله احد"],
    ["يقول الله تعالى", "يقول الله تعالى: ﴿قل هو الله أحد﴾", "قل هو الله احد"],
    ["two formulas in a row", "في الحديث: قال رسول الله ﷺ: الدين النصيحة", "الدين النصيحه"],
    ["a formula that is not leading stays", "ثم قال النبي كذا", "ثم قال النبي كذا"],
    ["a longer word is not cut", "قال النبيون كذا", "قال النبيون كذا"],
    ["no formula", "الدين النصيحة", "الدين النصيحه"],
    ["only a formula", "قال تعالى", ""],
    ["empty", "", ""],
  ];
  test.each(cases)("%s", (_name, input, expected) => {
    const norm = search(input);
    const rest = stripAttributionPreamble(norm);
    expect(rest).toBe(expected);
    expect(norm.endsWith(rest)).toBe(true); // offset in norm = norm.length - rest.length
  });

  test("every listed formula is stripped", () => {
    for (const formula of ATTRIBUTION_PREAMBLES) expect(stripAttributionPreamble(search(`${formula} نص`))).toBe("نص");
  });
});

describe("tokenize", () => {
  const cases: Array<[string, string, string[]]> = [
    ["normalized text", "قل هو الله احد", ["قل", "هو", "الله", "احد"]],
    ["empty string", "", []],
    ["repeated and edge whitespace (strict output)", "  قل   هو ", ["قل", "هو"]],
    ["single word", "الله", ["الله"]],
  ];
  test.each(cases)("%s", (_name, input, expected) => {
    expect(tokenize(input)).toEqual(expected);
  });
});
