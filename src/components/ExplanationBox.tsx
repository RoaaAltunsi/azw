import type { Explanation } from "@/core/types";
import { t } from "@/i18n/ar";
import { Icon } from "./Icon";

// Generated text, apart from the source text and dimmer than it, always under its label
// (AGENTS.md §2 rule 2). Nothing fills it until P12.
export function ExplanationBox({ explanation }: { explanation: Explanation }) {
  return (
    <aside className="rounded-xl border border-dashed border-line-strong bg-ink/5 p-3 text-sm text-muted">
      <p className="flex items-center gap-1.5 text-xs font-semibold">
        <Icon name="spark" size={14} />
        {t("explanation.generatedLabel")}
      </p>
      <p className="mt-1 leading-7">{explanation.text}</p>
    </aside>
  );
}
