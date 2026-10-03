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
} as const;

export type MessageKey = keyof typeof ar;

export function t(key: MessageKey): string {
  return ar[key];
}
