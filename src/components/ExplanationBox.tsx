import type { Explanation } from "@/core/types";
import { t } from "@/i18n/ar";

// Generated text, apart from the source text and dimmer than it, always under its label
// (AGENTS.md §2 rule 2). Nothing fills it until P12.
export function ExplanationBox({ explanation }: { explanation: Explanation }) {
  return (
    <aside className="rounded-lg border border-dashed border-ink/30 bg-ink/5 p-3 text-sm text-ink/80">
      <p className="text-xs font-semibold">{t("explanation.generatedLabel")}</p>
      <p className="mt-1 leading-7">{explanation.text}</p>
    </aside>
  );
}
