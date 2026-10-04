"use client";

import { useState } from "react";
import { t } from "@/i18n/ar";
import { Icon } from "./Icon";

type CopyState = "idle" | "done" | "failed";

interface CopyButtonProps {
  label: string;
  doneText: string;
  // Called on the click, so the text is built only when it is asked for.
  getText: () => string;
}

// A button that puts text on the clipboard and says, in a status line, whether it did.
export function CopyButton({ label, doneText, getText }: CopyButtonProps) {
  const [state, setState] = useState<CopyState>("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(getText());
      setState("done");
    } catch {
      setState("failed");
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" onClick={copy} className="btn-secondary">
        <Icon name="copy" />
        {label}
      </button>
      <span role="status" className="text-xs text-muted">
        {state === "done" && doneText}
        {state === "failed" && t("card.copy.failed")}
      </span>
    </span>
  );
}
