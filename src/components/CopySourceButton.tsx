"use client";

import { useState } from "react";
import { t } from "@/i18n/ar";
import { sourceCopyText, type Occurrence } from "./lib/occurrences";

type CopyState = "idle" | "done" | "failed";

// Copies exactText with citation.display. It never touches the draft: the tool offers no
// replacement and no "fix all" (AGENTS.md §9).
export function CopySourceButton({ occurrence }: { occurrence: Occurrence }) {
  const [state, setState] = useState<CopyState>("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(sourceCopyText(occurrence));
      setState("done");
    } catch {
      setState("failed");
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" onClick={copy} className="btn-secondary">
        {t("card.copy")}
      </button>
      <span role="status" className="text-xs text-ink/80">
        {state === "done" && t("card.copy.done")}
        {state === "failed" && t("card.copy.failed")}
      </span>
    </span>
  );
}
