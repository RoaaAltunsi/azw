"use client";

import { useId, useState, type ReactNode } from "react";
import type { ReviewItem } from "@/core/types";
import { format, t } from "@/i18n/ar";
import { CopySourceButton } from "./CopySourceButton";
import { DiffLegend, DiffText } from "./DiffText";
import { ExplanationBox } from "./ExplanationBox";
import { Icon } from "./Icon";
import { QUOTE_ROW, QUOTE_ROW_BODY, ScriptureBlock, SourceText } from "./ScriptureBlock";
import { StatusIcon, StatusPill } from "./StatusPill";
import { kindLabel } from "./lib/labels";
import { groupOccurrences, occurrenceCitation, type Occurrence } from "./lib/occurrences";
import { draftSegments, hasDiff, hasDifference } from "./lib/segments";

// The anchors the parts of a result link to each other by.
export const cardId = (itemId: string): string => `card-${itemId}`;
export const DRAFT_VIEW_ID = "draft-view";

interface ReviewCardProps {
  item: ReviewItem;
  index: number; // 1-based place in the result
  // The evidence record whose correction the writer applied to the revised draft, if any.
  appliedRecordId?: string;
  // Applies the correction of that record, or takes the item's correction back (undefined).
  onApply?: (recordId: string | undefined) => void;
  // The way to the other cards, when one card is shown at a time. It stands in the header.
  pager?: ReactNode;
}

// The frame of a card stays in place when the shown quote changes, so the pager in its header
// keeps the focus; the body is the quote's own and starts afresh with each quote.
export function ReviewCard({ item, index, pager, ...body }: ReviewCardProps) {
  const titleId = useId();
  return (
    <article
      id={cardId(item.id)}
      tabIndex={-1}
      aria-labelledby={titleId}
      data-status={item.status}
      className="card scroll-mt-4 p-4 sm:p-6"
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h4 id={titleId} className="text-lg font-bold text-ink">
          {format("card.title", { index })}
        </h4>
        <StatusPill status={item.status} />
        {pager && <div className="ms-auto">{pager}</div>}
      </header>
      <p className="mt-1 text-xs leading-5 text-muted">{format("card.claimedAs", { kind: kindLabel(item.claimedKind) })}</p>
      <CardBody key={item.id} item={item} {...body} />
    </article>
  );
}

function CardBody({ item, appliedRecordId, onApply }: Omit<ReviewCardProps, "index" | "pager">) {
  const compareId = useId();
  const [selected, setSelected] = useState(0);
  const [comparing, setComparing] = useState(false);

  // An ERROR item shows its reasonAr and nothing from a source, whatever the body holds
  // (AGENTS.md §4). The API sends none; this is the UI's own gate.
  const failed = item.status === "ERROR";
  const occurrences = failed ? [] : groupOccurrences(item.evidence);
  const occurrence = occurrences[Math.min(selected, occurrences.length - 1)];
  const entries = occurrence?.entries ?? [];
  // A correction belongs to one record: the place the writer is looking at.
  const [entry] = entries.length === 1 ? entries : [];
  const correction = onApply ? entry?.correction : undefined;
  const applied = correction !== undefined && appliedRecordId === entry?.record.id;

  return (
    <>
      <section className={`mt-4 rounded-xl border border-line bg-tint/60 p-4 ${QUOTE_ROW}`} aria-label={t("card.draft.label")}>
        <h5 className="eyebrow">{t("card.draft.label")}</h5>
        <div className={QUOTE_ROW_BODY}>
          <blockquote className="font-quote text-xl leading-[2.2] text-ink">
            <DiffText segments={draftSegments(item.span, entries)} side="draft" />
          </blockquote>
          {item.citedReference && item.citedReference.raw !== "" && (
            <p className="mt-1.5 text-xs text-muted">{format("card.citedReference", { raw: item.citedReference.raw })}</p>
          )}
        </div>
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

      <div className="status-wash mt-4 flex gap-2.5 px-3.5 py-3 text-sm leading-7 text-ink">
        <span className="status-ink mt-1.5">
          <StatusIcon status={item.status} />
        </span>
        <p>
          <span className="font-semibold">{t("card.reason.label")}: </span>
          {item.reasonAr}
        </p>
      </div>

      {!failed && item.explanation && (
        <div className="mt-3">
          <ExplanationBox explanation={item.explanation} />
        </div>
      )}

      {occurrence && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/* The correction is the step that changes the writer's post, so it leads. */}
          {correction && (
            <button
              type="button"
              className={applied ? "btn-secondary" : "btn-primary"}
              onClick={() => onApply?.(applied ? undefined : entry?.record.id)}
            >
              <Icon name={applied ? "undo" : "check"} />
              {applied ? t("card.apply.undo") : t(`card.apply.${correction.target}`)}
            </button>
          )}
          {hasDiff(entries) && (
            <button
              type="button"
              className={correction ? "btn-secondary" : "btn-primary"}
              aria-expanded={comparing}
              aria-controls={compareId}
              onClick={() => setComparing((open) => !open)}
            >
              <Icon name="compare" />
              {comparing ? t("card.compare.hide") : t("card.compare.show")}
            </button>
          )}
          <CopySourceButton occurrence={occurrence} />
        </div>
      )}
      {/* What was put in the revised draft, in the correction's own words. Nothing is changed unasked. */}
      {correction && (
        <p role="status" className="mt-2 text-xs leading-6 text-muted">
          {applied && (
            <>
              {format("card.apply.done", { text: correction.text })}{" "}
              <a href={`#${DRAFT_VIEW_ID}`} className="text-link">
                {t("card.apply.goToDraft")}
              </a>
            </>
          )}
        </p>
      )}

      {occurrence && comparing && <CompareView id={compareId} item={item} occurrence={occurrence} />}
      {occurrence && hasDifference(entries) && (
        <div className="mt-3">
          <DiffLegend />
        </div>
      )}
    </>
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
          className="cursor-pointer rounded-full border border-line-strong bg-surface px-3 py-1.5 text-xs text-ink hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white"
        >
          {format("card.occurrences.item", { index: i + 1, ref: occurrenceCitation(occurrence) })}
        </button>
      ))}
    </div>
  );
}

// «قارن النصين»: the quote and the stretch of the source it was aligned to, one above the other,
// joined by the trace line.
function CompareView({ id, item, occurrence }: { id: string; item: ReviewItem; occurrence: Occurrence }) {
  return (
    <section id={id} aria-label={t("card.compare.title")} className="mt-3 rounded-xl border border-line p-3">
      <h5 className="eyebrow">{t("card.compare.title")}</h5>
      <div className="mt-2 grid gap-3">
        <div>
          <h6 className="eyebrow">{t("card.compare.draft")}</h6>
          <p className="mt-1 rounded-xl bg-tint p-3 font-quote text-xl leading-[2.4] text-ink">
            <DiffText segments={draftSegments(item.span, occurrence.entries)} side="draft" />
          </p>
        </div>
        <div aria-hidden="true" className="trace-rule" />
        <div>
          <h6 className="eyebrow">{t("card.compare.source")}</h6>
          <div className="mt-1 rounded-xl border border-line bg-paper p-3">
            {occurrence.entries.map((entry) => (
              <SourceText key={entry.record.id} entry={entry} aligned />
            ))}
            <p className="mt-2 text-xs text-muted">{occurrenceCitation(occurrence)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
