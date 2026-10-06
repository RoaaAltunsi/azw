"use client";

import { useRef, useState, type Ref } from "react";
import type { ReviewResult } from "@/core/types";
import { format, t } from "@/i18n/ar";
import { CopyReportButton } from "./CopyReportButton";
import { DraftView } from "./DraftView";
import { Icon } from "./Icon";
import { Notice } from "./Notice";
import { ReviewCard } from "./ReviewCard";
import { StatusIcon } from "./StatusPill";
import { coverageNames, summaryParts, summaryText, warningText } from "./lib/labels";
import type { Applied } from "./lib/revised-draft";

// The two columns of a result: the reviewed draft, and the card of one quote.
const RESULT_GRID = "grid gap-4 lg:grid-cols-2 lg:items-start";

interface ResultsViewProps {
  result: ReviewResult;
  draft: string; // the text that was reviewed
  headingRef?: Ref<HTMLHeadingElement>;
  // Back to the draft box. Without it no such button is shown.
  onBack?: () => void;
}

export function ResultsView({ result, draft, headingRef, onBack }: ResultsViewProps) {
  const { items } = result;
  const empty = items.length === 0;
  // One card is shown at a time: the quote the writer is looking at.
  const [current, setCurrent] = useState(0);
  const cards = useRef<HTMLElement>(null);
  // The corrections the writer chose to apply. They live here only: the textarea and the reviewed
  // draft are never changed, and a new review starts with none.
  const [applied, setApplied] = useState<Applied>({});
  const apply = (itemId: string, recordId: string | undefined) =>
    setApplied((current) => ({
      ...Object.fromEntries(Object.entries(current).filter(([id]) => id !== itemId)),
      ...(recordId === undefined ? {} : { [itemId]: recordId }),
    }));

  // A tap on a highlighted quote: its card is shown, and the focus goes to the cards, so that a
  // keyboard or screen-reader user lands where a sighted user looks.
  function showCard(itemId: string) {
    const index = items.findIndex((item) => item.id === itemId);
    if (index === -1) return;
    setCurrent(index);
    const section = cards.current;
    if (!section) return;
    // The page moves only when the top of the card is out of sight (a narrow screen, mostly).
    const { top } = section.getBoundingClientRect();
    if (top < 0 || top > window.innerHeight / 2) {
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      section.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    }
    section.focus({ preventScroll: true });
  }

  const item = items[current];
  return (
    <section aria-labelledby="results-title">
      <header className="text-center">
        <h2 id="results-title" ref={headingRef} tabIndex={-1} className="text-3xl font-bold text-ink quiet-focus sm:text-4xl">
          {t("results.title")}
        </h2>
        <span aria-hidden="true" className="mx-auto mt-3 block h-0.5 w-16 rounded-full bg-vermilion" />
        {/* What this review searched, from the result itself (AGENTS.md §6, "Coverage must be true"). */}
        {result.coverage.length > 0 && (
          <p className="mt-3 text-sm leading-6 text-muted">
            {format("results.searched", { coverage: coverageNames(result.coverage) })}
          </p>
        )}
      </header>

      <div className="card mt-5 flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
        {!empty && <SummaryRow result={result} />}
        <div className="flex flex-wrap items-center gap-2 lg:ms-auto">
          {!empty && <CopyReportButton result={result} />}
          {onBack && (
            <button type="button" className="btn-secondary" onClick={onBack}>
              <Icon name="edit" />
              {t("results.back")}
            </button>
          )}
        </div>
      </div>

      {result.warnings.length > 0 && (
        <ul aria-label={t("results.notices")} className="mt-4 space-y-2">
          {result.warnings.map((code) => (
            <li key={code}>
              <Notice>{warningText(code)}</Notice>
            </li>
          ))}
        </ul>
      )}

      {empty || !item ? (
        <div className="card mx-auto mt-6 max-w-3xl p-5 text-center">
          <h3 className="text-base font-bold text-ink">{t("state.noQuotes.title")}</h3>
          <p className="mt-2 text-sm leading-7 text-muted">{t("extract.formsNote")}</p>
          <p className="mt-1 text-sm leading-7 text-muted">{t("state.noQuotes.body")}</p>
        </div>
      ) : (
        <div className={`mt-4 ${RESULT_GRID}`}>
          {/* On a narrow screen the card comes first; on a wide one the draft stands at the start. */}
          <section ref={cards} tabIndex={-1} aria-labelledby="cards-title" className="scroll-mt-4 quiet-focus lg:order-2">
            <h3 id="cards-title" className="sr-only">
              {t("results.cards.title")}
            </h3>
            <ReviewCard
              item={item}
              index={current + 1}
              appliedRecordId={applied[item.id]}
              onApply={(recordId) => apply(item.id, recordId)}
              pager={items.length > 1 && <Pager index={current} count={items.length} onChange={setCurrent} />}
            />
          </section>
          <div className="lg:sticky lg:top-4">
            <DraftView draft={draft} items={items} applied={applied} currentId={item.id} onSelect={showCard} />
          </div>
        </div>
      )}
    </section>
  );
}

// The counts of the result: one sentence for assistive technology, and the same counts as a number
// over a short name per status (with its icon) for the eye.
function SummaryRow({ result }: { result: ReviewResult }) {
  return (
    <>
      <p className="sr-only">{summaryText(result)}</p>
      <ul aria-hidden="true" className="grid grow grid-cols-2 gap-y-3 sm:flex sm:divide-x sm:divide-line">
        {summaryParts(result.summary).map(({ status }) => (
          <li key={status} data-status={status} className="status-ink flex flex-col items-center gap-0.5 px-3 sm:flex-1">
            <span className="font-quote text-4xl font-bold leading-none tabular-nums">{result.summary[status]}</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <StatusIcon status={status} />
              {t(`results.stat.${status}`)}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

// «1 / 3» between the two arrows: which quote is shown, and the way to the next one.
function Pager({ index, count, onChange }: { index: number; count: number; onChange: (index: number) => void }) {
  return (
    <nav aria-label={t("results.pager.label")} className="flex items-center gap-1">
      <button
        type="button"
        className="pager-btn"
        aria-label={t("results.pager.previous")}
        aria-disabled={index === 0}
        onClick={() => index > 0 && onChange(index - 1)}
      >
        <Icon name="previous" />
      </button>
      <span className="min-w-12 text-center text-sm tabular-nums text-muted" dir="ltr">
        {format("results.pager.position", { index: index + 1, count })}
      </span>
      <button
        type="button"
        className="pager-btn"
        aria-label={t("results.pager.next")}
        aria-disabled={index === count - 1}
        onClick={() => index < count - 1 && onChange(index + 1)}
      >
        <Icon name="next" />
      </button>
    </nav>
  );
}

// Under the progress of a review: the shape of a result, with nothing in it.
export function ResultsSkeleton() {
  return (
    <div aria-hidden="true" className={`mt-6 ${RESULT_GRID}`}>
      {[0, 1].map((i) => (
        <div key={i} className="card space-y-3 p-4">
          <div className="skeleton h-6 w-44 rounded-full" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-11/12" />
          <div className="skeleton h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}
