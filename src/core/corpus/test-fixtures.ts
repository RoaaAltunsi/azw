// Small records for the corpus tests. Test data only: exactText is written without diacritics and
// the "uthmani" variants are typed by hand, so nothing here is source text.
import { normalizeWithMap } from "../normalize";
import type { SourceRecord } from "../types";
import type { QuranSpellingVariant } from "./schema";

const base = { sourceName: "fixture", edition: "fixture", license: "fixture", reviewStatus: "reviewed" } as const;

export function ayah(surah: number, number: number, exactText: string, uthmani?: string): SourceRecord {
  const searchText = normalizeWithMap(exactText, "search", { keepHonorificPhrases: true }).norm;
  return {
    ...base,
    id: `quran:${surah}:${number}`,
    kind: "quran",
    collection: "quran",
    exactText,
    searchText,
    searchVariants: [{ label: "uthmani", text: uthmani ?? searchText }],
    citation: { display: `سورة ${surah}، الآية ${number}`, surah, ayah: number },
  };
}

export function hadith(collection: string, number: string | null, exactText: string, overrides: Partial<SourceRecord> = {}): SourceRecord {
  return {
    ...base,
    id: `${collection}:${number ?? "x"}`,
    kind: "hadith",
    collection,
    exactText,
    searchText: normalizeWithMap(exactText, "search").norm,
    citation: number === null ? { display: `${collection} (بلا رقم)`, number: null } : { display: `${collection}، حديث رقم ${number}`, number },
    ...overrides,
  };
}

// Deliberately out of order: the adapter, not the caller, puts ayat in reading order.
export const QURAN_FIXTURE: SourceRecord[] = [
  ayah(113, 1, "قل أعوذ برب الفلق"),
  ayah(2, 154, "ولا تقولوا لمن يقتل في سبيل الله أموات بل أحياء ولكن لا تشعرون", "ولا تقولوا لمن يقتل في سبيل الله اموات بل احياء ولاكن لا تشعرون"),
  ayah(2, 153, "يا أيها الذين آمنوا استعينوا بالصبر والصلاة إن الله مع الصابرين", "ياايها الذين امنوا استعينوا بالصبر والصلواه ان الله مع الصابرين"),
  ayah(7, 56, "ولا تفسدوا في الأرض بعد إصلاحها وادعوه خوفا وطمعا إن رحمت الله قريب من المحسنين"),
  ayah(19, 2, "ذكر رحمت ربك عبده زكريا"),
  ayah(112, 3, "لم يلد ولم يولد"),
  ayah(112, 4, "ولم يكن له كفوا أحد"),
];

// «رحمت» is listed for 7:56 only, so 19:2 shows that a pair stays inside its ayat.
export const SPELLING_FIXTURE: QuranSpellingVariant[] = [
  { group: "open-ta", sourceForm: "رحمت", everydayForm: "رحمة", ayat: ["7:56"] },
];

// Plain sentences, not hadith text. "alpha:2" and "alpha:3" hold the same text; "beta:1" holds it too.
export const ALPHA_FIXTURE: SourceRecord[] = [
  hadith("alpha", "1", "حدثنا فلان قال خرجنا في سفر طويل ثم رجعنا إلى المدينة بعد شهر"),
  hadith("alpha", "2", "أخبرنا فلان أن الماء كان قليلا في تلك السنة"),
  hadith("alpha", "3", "أخبرنا فلان أن الماء كان قليلا في تلك السنة", { reviewStatus: "pending" }),
  hadith("alpha", "4", "رأيت المؤمن الله أعلم بحاله"),
];
export const BETA_FIXTURE: SourceRecord[] = [
  hadith("beta", "1", "حدثنا آخر قال أخبرنا فلان أن الماء كان قليلا في تلك السنة فصبرنا"),
  hadith("beta", null, "نص بلا رقم في بيانات المصدر", { reviewStatus: "pending" }),
];
