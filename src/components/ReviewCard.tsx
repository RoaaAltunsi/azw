"use client";

import { useId, useState } from "react";
import type { ReviewItem } from "@/core/types";
import { format, t } from "@/i18n/ar";
import { CopySourceButton } from "./CopySourceButton";
import { DiffLegend, DiffText } from "./DiffText";
import { ExplanationBox } from "./ExplanationBox";
import { ScriptureBlock, SourceText } from "./ScriptureBlock";
import { StatusPill } from "./StatusPill";
import { kindLabel } from "./lib/labels";
import { groupOccurrences, occurrenceCitation, type Occurrence } from "./lib/occurrences";
import { draftSegments, hasDiff, hasDifference } from "./lib/segments";

export const cardId = (itemId: string): string => `card-${itemId}`;

interface ReviewCardProps {
  item: ReviewItem;
  index: number; // 1-based place in the result
}

export function ReviewCard({ item, index }: ReviewCardProps) {
  const titleId = useId();
  const compareId = useId();
  const [selected, setSelected] = useState(0);
  const [comparing, setComparing] = useState(false);

  // An ERROR item shows its reasonAr and nothing from a source, whatever the body holds
  // (AGENTS.md §4). The API sends none; this is the UI's own gate.
  const failed = item.status === "ERROR";
  const occurrences = failed ? [] : groupOccurrences(item.evidence);
  const occurrence = occurrences[Math.min(selected, occurrences.length - 1)];
  const entries = occurrence?.entries ?? [];

  return (
    <article
      id={cardId(item.id)}
      tabIndex={-1}
      aria-labelledby={titleId}
      data-status={item.status}
      className="status-card scroll-mt-4 rounded-xl bg-white p-4 shadow-sm"
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h4 id={titleId} className="text-sm font-bold text-ink">
          {format("card.title", { index })}
        </h4>
        <StatusPill status={item.status} />
        <span className="text-xs text-ink/80">{format("card.claimedAs", { kind: kindLabel(item.claimedKind) })}</span>
      </header>

      <section className="mt-3" aria-label={t("card.draft.label")}>
        <h5 className="text-xs font-semibold text-ink/80">{t("card.draft.label")}</h5>
        <blockquote className="mt-1 rounded-lg bg-tint p-3 font-quote text-lg leading-[2.2] text-ink">
          <DiffText segments={draftSegments(item.span, entries)} side="draft" />
        </blockquote>
        {item.citedReference && item.citedReference.raw !== "" && (
          <p className="mt-1 text-xs text-ink/80">{format("card.citedReference", { raw: item.citedReference.raw })}</p>
        )}
      </section>

      {occurrence && (
        <>
          <div className="trace-line" aria-hidden="true" />
          {occurrences.length > 1 && (
            <OccurrencePicker occurrences={occurrences} selected={occurrences.indexOf(occurrence)} onSelect={setSelected} />
          )}
          <ScriptureBlock occurrence={occurrence} />
        </>
      )}

      <p className="mt-3 text-sm leading-7 text-ink">
        <span className="font-semibold">{t("card.reason.label")}: </span>
        {item.reasonAr}
      </p>

      {occurrence && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {hasDiff(entries) && (
            <button
              type="button"
              className="btn-secondary"
              aria-expanded={comparing}
              aria-controls={compareId}
              onClick={() => setComparing((open) => !open)}
            >
              {comparing ? t("card.compare.hide") : t("card.compare.show")}
            </button>
          )}
          <CopySourceButton occurrence={occurrence} />
        </div>
      )}

      {occurrence && comparing && <CompareView id={compareId} item={item} occurrence={occurrence} />}
      {occurrence && hasDifference(entries) && (
        <div className="mt-3">
          <DiffLegend />
        </div>
      )}

      {!failed && item.explanation && (
        <div className="mt-3">
          <ExplanationBox explanation={item.explanation} />
        </div>
      )}
    </article>
  );
}

// A quote that stands in several places: one button per place. The chosen place drives the source
// block and the marks in both texts.
function OccurrencePicker({
  occurrences,
  selected,
  onSelect,
}: {
  occurrences: readonly Occurrence[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div role="group" aria-label={t("card.occurrences.label")} className="mb-2 flex flex-wrap gap-2">
      {occurrences.map((occurrence, i) => (
        <button
          key={occurrence.entries[0]!.record.id}
          type="button"
          aria-pressed={i === selected}
          onClick={() => onSelect(i)}
          className="rounded-full border border-ink/40 bg-white px-3 py-1 text-xs text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white"
        >
          {format("card.occurrences.item", { index: i + 1, ref: occurrenceCitation(occurrence) })}
        </button>
      ))}
    </div>
  );
}

// «قارن النصين»: the quote and the stretch of the source it was aligned to, side by side (stacked
// on a narrow screen), joined by the trace line.
function CompareView({ id, item, occurrence }: { id: string; item: ReviewItem; occurrence: Occurrence }) {
  return (
    <section id={id} aria-label={t("card.compare.title")} className="mt-3 rounded-lg border border-ink/20 p-3">
      <h5 className="text-xs font-semibold text-ink/80">{t("card.compare.title")}</h5>
      <div className="mt-2 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        <div>
          <h6 className="text-xs font-semibold text-ink/80">{t("card.compare.draft")}</h6>
          <p className="mt-1 rounded-lg bg-tint p-3 font-quote text-xl leading-[2.4] text-ink">
            <DiffText segments={draftSegments(item.span, occurrence.entries)} side="draft" />
          </p>
        </div>
        <div
          aria-hidden="true"
          className="border-t-2 border-dashed border-vermilion md:border-s-2 md:border-t-0"
        />
        <div>
          <h6 className="text-xs font-semibold text-ink/80">{t("card.compare.source")}</h6>
          <div className="mt-1 rounded-lg border border-ink/20 bg-[#fbf8f0] p-3">
            {occurrence.entries.map((entry) => (
              <SourceText key={entry.record.id} entry={entry} aligned />
            ))}
            <p className="mt-2 text-xs text-ink/80">{occurrenceCitation(occurrence)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
