"use client";

import type { MouseEvent } from "react";
import type { ReviewItem } from "@/core/types";
import { format, t } from "@/i18n/ar";
import { cardId } from "./ReviewCard";
import { draftPieces } from "./lib/segments";

// Scrolls to a card and moves the focus to it, so that a keyboard or screen-reader user lands
// where a sighted user looks. Without JavaScript the link's own #anchor does the same.
function goToCard(event: MouseEvent<HTMLAnchorElement>, id: string) {
  const card = document.getElementById(id);
  if (!card) return;
  event.preventDefault();
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  card.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
  card.focus({ preventScroll: true });
}

// The reviewed draft, read-only, with every detected span marked by its status: color, an
// underline style of its own, and the status named for assistive technology.
export function DraftView({ draft, items }: { draft: string; items: readonly ReviewItem[] }) {
  return (
    <section aria-labelledby="draft-view-title" className="card p-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto">
      <h3 id="draft-view-title" className="text-sm font-bold text-ink">
        {t("results.draft.title")}
      </h3>
      {items.length > 0 && <p className="mt-1 text-xs text-muted">{t("results.draft.hint")}</p>}
      <p className="mt-3 whitespace-pre-wrap break-words border-t border-line pt-3 text-base leading-9 text-ink" lang="ar">
        {draftPieces(draft, items).map((piece, i) => {
          const { item, index } = piece;
          if (!item || index === undefined) return <span key={i}>{piece.text}</span>;
          const label = format("results.draft.markLabel", { index, status: t(`status.${item.status}`) });
          return (
            <a
              key={i}
              href={`#${cardId(item.id)}`}
              className="draft-mark"
              data-status={item.status}
              title={label}
              onClick={(event) => goToCard(event, cardId(item.id))}
            >
              <span className="sr-only">{label}: </span>
              {piece.text}
            </a>
          );
        })}
      </p>
    </section>
  );
}
