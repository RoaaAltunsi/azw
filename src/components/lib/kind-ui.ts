// How a kind's source text is presented. The UI never branches on a specific kind (AGENTS.md §6):
// a new kind adds an entry here, or is shown with the defaults.
import { t } from "@/i18n/ar";

export interface KindUi {
  // The marks the source text stands between; empty when the kind has none.
  open: string;
  close: string;
  // The font class of the source text (src/app/globals.css). The Quran font is Amiri:
  // docs/DECISIONS.md D-19.
  textClass: string;
}

const DEFAULT_KIND_UI: KindUi = { open: "", close: "", textClass: "font-quote" };

const KIND_UI: Readonly<Record<string, KindUi>> = {
  quran: { open: t("quote.quran.open"), close: t("quote.quran.close"), textClass: "font-quran" },
};

export function kindUi(kind: string): KindUi {
  return Object.hasOwn(KIND_UI, kind) ? KIND_UI[kind]! : DEFAULT_KIND_UI;
}
