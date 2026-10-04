"use client";

import { t } from "@/i18n/ar";
import { CopyButton } from "./CopyButton";
import { sourceCopyText, type Occurrence } from "./lib/occurrences";

// Copies exactText with citation.display. It never touches the draft: the tool offers no
// replacement and no "fix all" (AGENTS.md §9).
export function CopySourceButton({ occurrence }: { occurrence: Occurrence }) {
  return <CopyButton label={t("card.copy")} doneText={t("card.copy.done")} getText={() => sourceCopyText(occurrence)} />;
}
