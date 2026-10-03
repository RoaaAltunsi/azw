// All UI strings live here (AGENTS.md §6). No hard-coded UI text in components.
// The status labels are fixed by AGENTS.md §4: do not rename them.
export const ar = {
  "app.name": "عَزْو",
  "app.tagline": "انقل النص كما ورد، ومن حيث ورد.",
  "app.description": "أداة مساعدة لكتّاب المحتوى الدعوي: تطابق الآيات والأحاديث المنقولة مع مصادرها المعتمدة.",

  "status.MATCH": "مطابق لنص المصدر",
  "status.DIFFERS": "مختلف في اللفظ أو المرجع",
  "status.NOT_FOUND": "لم يُتحقق منه ضمن المصادر المتاحة",
  "status.NEEDS_SPECIALIST": "يحتاج مراجعة مختص",
  "status.ERROR": "تعذّر إكمال التحقق",

  "explanation.generatedLabel": "شرح مولّد آلياً",

  "kind.quran": "آية قرآنية",
  "kind.hadith": "حديث نبوي",

  // The covered sources by name (book titles, as the sources are known).
  "collection.quran": "القرآن الكريم",
  "collection.bukhari": "صحيح البخاري",
  "collection.muslim": "صحيح مسلم",

  // One sentence per reason code (src/core/status). {ref} is the citation of the source record,
  // {kind} a kind label, {coverage} the covered sources. Gentle wording; the word «صحيح» is never
  // used here, because it can be read as a judgment on authenticity (tested).
  "reason.MATCH_REF_OK": "النص مطابق لنص المصدر، والمرجع المذكور في المسودة يوافقه: {ref}.",
  "reason.MATCH_NO_REFERENCE": "النص مطابق لنص المصدر. لم يُذكر له مرجع في المسودة، ويُستحسن إضافته: {ref}.",
  "reason.REF_MISMATCH_AYAH": "النص مطابق للآية، لكن رقمها في المسودة لا يطابق المصدر. المرجع في المصدر: {ref}.",
  "reason.REF_MISMATCH_SURAH": "النص مطابق للآية، لكن السورة المذكورة في المسودة لا توافق المصدر. المرجع في المصدر: {ref}.",
  "reason.WORDING_DIFF": "في النص المنقول اختلاف في اللفظ عن نص المصدر ({ref}). يُرجى مراجعة نص المصدر المعروض واعتماده عند النقل.",
  "reason.KIND_MISMATCH": "هذا النص موجود في المصادر المغطاة بوصفه {kind} ({ref})، وهذا يخالف نسبته في المسودة. يُرجى مراجعة النسبة.",
  "reason.NO_RECORD_IN_COVERED_SOURCES": "لم نجد هذا النص في المصادر المغطاة ({coverage}). هذا لا يعني الحكم عليه؛ راجعه قبل النشر.",
  "reason.REF_NOT_CHECKED": "النص مطابق لنص المصدر ({ref})، لكننا لم نتمكن من التحقق من المرجع المذكور في المسودة. يُرجى مقارنته بمرجع المصدر قبل النشر.",
  "reason.LOW_CONFIDENCE_MATCH": "وجدنا في المصادر المغطاة نصاً قريباً ({ref})، لكن التشابه لا يكفي للجزم بأنه المقصود. يُرجى مراجعة مختص أو الرجوع إلى المصدر قبل النشر.",
  "reason.AMBIGUOUS_CANDIDATES": "يشبه هذا النص أكثر من موضع في المصادر المغطاة بألفاظ مختلفة، ولا يمكننا تحديد المقصود منها. يُرجى مراجعة مختص.",
  "reason.SOURCE_NOT_REVIEWED": "وجدنا هذا النص في سجل لم تكتمل مراجعته بعد ({ref})، فلا نعتمد عليه في المطابقة. يُرجى الرجوع إلى المصدر مباشرة.",
  "reason.UNCLEAR_ATTRIBUTION": "نسبة هذا النص في المسودة غير محددة (لم يُذكر قائل ولا كتاب بعينه)، فلا يمكننا التحقق منها. يُرجى مراجعة مختص.",
  "reason.INTERPRETIVE_CLAIM": "هذه العبارة تتضمن استنباطاً أو تفسيراً، والأداة لا تفسّر النصوص ولا تؤيد الاستنباط ولا تنفيه. يُرجى مراجعة مختص.",
  "reason.PERSONAL_RULING": "هذه العبارة تتضمن حكماً في حالة خاصة، والأداة لا تصدر الفتاوى. يُرجى الرجوع إلى جهة إفتاء مؤهلة.",

  // The system state ERROR for one item (src/core/review.ts): a fault of the tool, never a statement
  // about the text.
  "item.error.INTERNAL_ERROR": "تعذّر إكمال التحقق من هذا النص بسبب خلل في الأداة، ولا يدل ذلك على شيء في النص نفسه. يُرجى إعادة المحاولة.",

  // Parts of {ref} and {coverage}.
  "reason.ref.range": "من {first} إلى {last}",
  "reason.ref.more": "{ref} (وفي {count} من المواضع الأخرى)",
  "list.separator": "، ",

  // API v1 error messages (src/server/review-handler.ts), one per code of API_ERROR_CODES.
  "api.error.INVALID_REQUEST": "صيغة الطلب غير صالحة. المطلوب نص المسودة في الحقل text.",
  "api.error.EMPTY_DRAFT": "المسودة فارغة. يُرجى لصق النص المراد مراجعته.",
  "api.error.DRAFT_TOO_LONG": "المسودة أطول من الحد المسموح به ({max} حرفاً). يُرجى تقسيمها ومراجعة كل جزء على حدة.",
  "api.error.ORIGIN_NOT_ALLOWED": "هذا الموقع غير مصرّح له باستخدام الخدمة.",
  "api.error.RATE_LIMITED": "عدد الطلبات كبير في وقت قصير. يُرجى الانتظار قليلاً ثم إعادة المحاولة.",
  "api.error.INTERNAL_ERROR": "تعذّر إكمال التحقق، ولم تُراجَع المسودة. يُرجى إعادة المحاولة لاحقاً.",
} as const;

export type MessageKey = keyof typeof ar;

export function t(key: MessageKey): string {
  return ar[key];
}

// t() with every {name} replaced. A placeholder with no value is a programming error: it throws
// rather than show a sentence with a hole in it.
export function format(key: MessageKey, values: Readonly<Record<string, string | number>>): string {
  return ar[key].replace(/\{(\w+)\}/g, (_match, name: string) => {
    if (!Object.hasOwn(values, name)) throw new Error(`Message "${key}" needs a value for {${name}}`);
    return String(values[name]);
  });
}
