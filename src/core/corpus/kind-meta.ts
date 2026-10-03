// kindMeta registry: what the UI and the status rules need to know about a content kind, so that
// neither branches on a specific kind (AGENTS.md §6). A new kind adds an entry here.
import { t } from "../../i18n/ar";
import type { SourceRecord } from "../types";

export interface KindMeta {
  labelAr: string;
  // The citation as shown to the user. It builds on record.citation and never invents a number.
  citationFormatter(record: SourceRecord): string;
}

// citation.display is written by the corpus build from the source data. A record without a
// citation number (citation.number = null) already says so there, so it is returned as it is.
const displayCitation = (record: SourceRecord): string => record.citation.display;

export const kindMeta: Readonly<Record<string, KindMeta>> = {
  quran: { labelAr: t("kind.quran"), citationFormatter: displayCitation },
  hadith: { labelAr: t("kind.hadith"), citationFormatter: displayCitation },
};

export function getKindMeta(kind: string): KindMeta | undefined {
  return Object.hasOwn(kindMeta, kind) ? kindMeta[kind] : undefined;
}
