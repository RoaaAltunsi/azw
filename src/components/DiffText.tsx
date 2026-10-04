import { t, type MessageKey } from "@/i18n/ar";
import type { DiffMark, Segment } from "./lib/segments";

export type DiffSide = "draft" | "source";

// What a mark means on each side. "equal" is not marked.
const MARK_TITLES: Record<DiffSide, Partial<Record<DiffMark, MessageKey>>> = {
  draft: { replace: "diff.replace.draft", insert: "diff.insert" },
  source: { replace: "diff.replace.source", delete: "diff.delete" },
};

interface DiffTextProps {
  segments: readonly Segment[];
  side: DiffSide;
  // Show the text outside every op in a quieter color (the rest of a source record).
  quietContext?: boolean;
}

// The pieces of a text, in order. Every character comes from the segments: nothing is added to a
// source text, so it can be selected and copied as it stands.
export function DiffText({ segments, side, quietContext = false }: DiffTextProps) {
  return (
    <>
      {segments.map((segment, i) => {
        const title = segment.mark ? MARK_TITLES[side][segment.mark] : undefined;
        if (title) {
          return (
            <mark key={i} className={`diff-mark diff-${segment.mark}`} title={t(title)}>
              {segment.text}
            </mark>
          );
        }
        return (
          <span key={i} className={quietContext && segment.mark === undefined ? "diff-context" : undefined}>
            {segment.text}
          </span>
        );
      })}
    </>
  );
}

// The legend of the marks, shown with a diff that holds a difference.
export function DiffLegend() {
  const entries: Array<[DiffMark, MessageKey]> = [
    ["replace", "diff.replace.draft"],
    ["insert", "diff.insert"],
    ["delete", "diff.delete"],
  ];
  return (
    <details className="text-xs leading-6 text-muted">
      <summary className="w-fit cursor-pointer rounded font-semibold">{t("diff.legend")}</summary>
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5">
        {entries.map(([mark, key]) => (
          <li key={mark}>
            <span className={`diff-mark diff-${mark} px-1`}>{t(key)}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
