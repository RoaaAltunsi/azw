// Fixture items for the UI tests. AYAH_153 is quran:2:153 as the corpus holds it.
import type { Evidence, ReviewItem } from "@/core/types";

export const AYAH_153 =
  "يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ";

export function evidence(overrides: {
  id: string;
  exactText?: string;
  display?: string;
  collection?: string;
  kind?: string;
  ayahRange?: [number, number];
  diff?: Evidence["diff"];
  correction?: Evidence["correction"];
  grade?: Evidence["record"]["grade"];
  reviewStatus?: "reviewed" | "pending";
  sourceUrl?: string;
}): Evidence {
  return {
    record: {
      id: overrides.id,
      kind: overrides.kind ?? "quran",
      collection: overrides.collection ?? "quran",
      exactText: overrides.exactText ?? AYAH_153,
      citation: { display: overrides.display ?? `مرجع ${overrides.id}` },
      sourceName: "اسم المصدر",
      ...(overrides.sourceUrl ? { sourceUrl: overrides.sourceUrl } : {}),
      edition: "edition",
      license: "license",
      reviewStatus: overrides.reviewStatus ?? "reviewed",
      ...(overrides.grade ? { grade: overrides.grade } : {}),
    },
    score: 1,
    ...(overrides.diff ? { diff: overrides.diff } : {}),
    ...(overrides.ayahRange ? { ayahRange: overrides.ayahRange } : {}),
    ...(overrides.correction ? { correction: overrides.correction } : {}),
  };
}

export function item(overrides: Partial<ReviewItem> & Pick<ReviewItem, "span">): ReviewItem {
  return {
    id: `item-${overrides.span.start}-${overrides.span.end}`,
    claimedKind: "quran",
    status: "MATCH",
    contentLevel: "A",
    reasonCode: "MATCH_NO_REFERENCE",
    reasonAr: "جملة السبب.",
    evidence: [],
    extractedBy: ["regex"],
    ...overrides,
  };
}
