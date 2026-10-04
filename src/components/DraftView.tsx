"use client";

import type { ReviewItem } from "@/core/types";
import { format, t } from "@/i18n/ar";
import { CopyButton } from "./CopyButton";
import { Icon } from "./Icon";
import { cardId, DRAFT_VIEW_ID } from "./ReviewCard";
import { draftPieces, hasCorrections, openItems, type Applied } from "./lib/revised-draft";

interface DraftViewProps {
  draft: string;
  items: readonly ReviewItem[];
  // The corrections the writer applied (item id → record id). The textarea is never touched: this
  // view shows the revised text, and «انسخ المسودة المعدّلة» copies it.
  applied?: Applied;
  // The item whose card is shown now: its quote stands out in the draft.
  currentId?: string;
  // A tap on a highlighted quote: show its card. Without it the link's own #anchor is followed.
  onSelect?: (itemId: string) => void;
}

// The reviewed draft, read-only, with every detected span marked by its status: color, an
// underline style of its own, and the status named for assistive technology. With corrections
// applied it is the revised draft: each one stands in its place, under the trace line.
export function DraftView({ draft, items, applied = {}, currentId, onSelect }: DraftViewProps) {
  const pieces = draftPieces(draft, items, applied);
  const revised = pieces.some((piece) => piece.corrected);
  const open = openItems(items, applied);
  return (
    <section id={DRAFT_VIEW_ID} aria-labelledby="draft-view-title" className="card scroll-mt-4 p-4 sm:p-6 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto">
      <h3 id="draft-view-title" className="flex items-center gap-2 text-lg font-bold text-ink">
        <Icon name="doc" size={20} />
        {t(revised ? "results.draft.revised.title" : "results.draft.title")}
      </h3>
      {items.length > 0 && <p className="mt-1 text-xs text-muted">{t("results.draft.hint")}</p>}
      <p className="mt-3 whitespace-pre-wrap break-words border-t border-line pt-3 text-base leading-9 text-ink" lang="ar">
        {pieces.map((piece, i) => {
          const { item, index } = piece;
          if (!item || index === undefined) return <span key={i}>{piece.text}</span>;
          const label = piece.corrected
            ? format("results.draft.revised.markLabel", { index })
            : format("results.draft.markLabel", { index, status: t(`status.${item.status}`) });
          return (
            <a
              key={i}
              href={`#${cardId(item.id)}`}
              className={piece.corrected ? "draft-applied" : "draft-mark"}
              data-status={piece.corrected ? undefined : item.status}
              aria-current={item.id === currentId ? "true" : undefined}
              title={label}
              onClick={(event) => {
                if (!onSelect) return;
                event.preventDefault();
                onSelect(item.id);
              }}
            >
              <span className="sr-only">{label}: </span>
              {piece.text}
            </a>
          );
        })}
      </p>
      {/* The copy button is always here, so the writer knows where the whole post is taken from. */}
      {items.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-line pt-3 text-xs leading-6 text-muted">
          {!revised && hasCorrections(items) && <p>{t("results.draft.correctable")}</p>}
          {revised && <p>{t("results.draft.revised.note")}</p>}
          {revised && open > 0 && (
            <p className="font-semibold text-ink">{format("results.draft.revised.open", { label: t("status.MATCH"), count: open })}</p>
          )}
          <CopyButton
            key={revised ? "revised" : "reviewed"}
            label={t(revised ? "results.draft.revised.copy" : "results.draft.copy")}
            doneText={t(revised ? "results.draft.revised.copy.done" : "results.draft.copy.done")}
            getText={() => pieces.map((piece) => piece.text).join("")}
          />
        </div>
      )}
    </section>
  );
}
