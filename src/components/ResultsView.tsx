"use client";

import { useState, type Ref } from "react";
import type { ReviewResult } from "@/core/types";
import { format, t } from "@/i18n/ar";
import { CopyReportButton } from "./CopyReportButton";
import { DraftView } from "./DraftView";
import { Notice } from "./Notice";
import { ReviewCard } from "./ReviewCard";
import { StatusIcon } from "./StatusPill";
import { coverageNames, summaryParts, summaryText, warningText } from "./lib/labels";
import type { Applied } from "./lib/revised-draft";

// The two columns of a result: the reviewed draft, and the cards.
const RESULT_GRID = "grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start";

interface ResultsViewProps {
  result: ReviewResult;
  draft: string; // the text that was reviewed, not what the textarea holds now
  stale: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
}

export function ResultsView({ result, draft, stale, headingRef }: ResultsViewProps) {
  const empty = result.items.length === 0;
  // The corrections the writer chose to apply. They live here only: the textarea and the reviewed
  // draft are never changed, and a new review starts with none.
  const [applied, setApplied] = useState<Applied>({});
  const apply = (itemId: string, recordId: string | undefined) =>
    setApplied((current) => ({
      ...Object.fromEntries(Object.entries(current).filter(([id]) => id !== itemId)),
      ...(recordId === undefined ? {} : { [itemId]: recordId }),
    }));
  return (
    <section aria-labelledby="results-title" className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line pb-4">
        <h2 id="results-title" ref={headingRef} tabIndex={-1} className="text-xl font-bold text-ink quiet-focus">
          {t("results.title")}
        </h2>
        {!empty && <SummaryRow result={result} />}
        {!empty && <CopyReportButton result={result} />}
      </div>

      {/* What this review searched, from the result itself (AGENTS.md §6, "Coverage must be true"). */}
      {result.coverage.length > 0 && (
        <p className="mt-3 text-xs leading-6 text-muted">
          {format("results.searched", { coverage: coverageNames(result.coverage), version: result.corpusVersion })}
        </p>
      )}

      {stale && <Notice className="mt-4">{t("state.stale")}</Notice>}

      {result.warnings.length > 0 && (
        <ul aria-label={t("results.notices")} className="mt-4 space-y-2">
          {result.warnings.map((code) => (
            <li key={code}>
              <Notice>{warningText(code)}</Notice>
            </li>
          ))}
        </ul>
      )}

      {empty ? (
        <div className="card mx-auto mt-6 max-w-3xl p-5 text-center">
          <h3 className="text-base font-bold text-ink">{t("state.noQuotes.title")}</h3>
          <p className="mt-2 text-sm leading-7 text-muted">{t("extract.formsNote")}</p>
          <p className="mt-1 text-sm leading-7 text-muted">{t("state.noQuotes.body")}</p>
        </div>
      ) : (
        <div className={`mt-4 ${RESULT_GRID}`}>
          <div className="lg:sticky lg:top-4">
            <DraftView draft={draft} items={result.items} applied={applied} />
          </div>
          <section aria-labelledby="cards-title" className="space-y-4">
            <h3 id="cards-title" className="sr-only">
              {t("results.cards.title")}
            </h3>
            {result.items.map((item, i) => (
              <ReviewCard
                key={item.id}
                item={item}
                index={i + 1}
                appliedRecordId={applied[item.id]}
                onApply={(recordId) => apply(item.id, recordId)}
              />
            ))}
          </section>
        </div>
      )}
    </section>
  );
}

// The counts of the result: one sentence for assistive technology, and the same counts as one
// chip per status (icon + words) for the eye.
function SummaryRow({ result }: { result: ReviewResult }) {
  return (
    <>
      <p className="sr-only">{summaryText(result)}</p>
      <ul aria-hidden="true" className="flex flex-wrap gap-2">
        {summaryParts(result.summary).map(({ status, text }) => (
          <li key={status} data-status={status} className="status-pill">
            <StatusIcon status={status} />
            {text}
          </li>
        ))}
      </ul>
    </>
  );
}

// The loading state: the shape of a result, with nothing in it.
export function ResultsSkeleton() {
  return (
    <div aria-hidden="true" className="mt-10">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div className="skeleton h-7 w-36" />
        <div className="skeleton h-7 w-56 rounded-full" />
      </div>
      <div className={`mt-4 ${RESULT_GRID}`}>
        <div className="card space-y-3 p-4">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-11/12" />
          <div className="skeleton h-4 w-3/4" />
        </div>
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="card space-y-3 p-4">
              <div className="skeleton h-6 w-44 rounded-full" />
              <div className="skeleton h-14" />
              <div className="skeleton h-24" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
