import type { Ref } from "react";
import type { ReviewResult } from "@/core/types";
import { t } from "@/i18n/ar";
import { DraftView } from "./DraftView";
import { ReviewCard } from "./ReviewCard";
import { summaryText, warningText } from "./lib/labels";

interface ResultsViewProps {
  result: ReviewResult;
  draft: string; // the text that was reviewed, not what the textarea holds now
  stale: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
}

export function ResultsView({ result, draft, stale, headingRef }: ResultsViewProps) {
  const empty = result.items.length === 0;
  return (
    <section aria-labelledby="results-title" className="mt-8">
      <h2 id="results-title" ref={headingRef} tabIndex={-1} className="text-xl font-bold text-ink quiet-focus">
        {t("results.title")}
      </h2>

      {stale && <p className="mt-2 rounded-lg border border-ink/30 bg-white p-3 text-sm text-ink">{t("state.stale")}</p>}

      {!empty && <p className="mt-2 text-base font-semibold text-ink">{summaryText(result)}</p>}

      {result.warnings.length > 0 && (
        <ul aria-label={t("results.notices")} className="mt-3 space-y-1">
          {result.warnings.map((code) => (
            <li key={code} className="rounded-lg border border-ink/20 bg-white px-3 py-2 text-xs leading-6 text-ink/80">
              {warningText(code)}
            </li>
          ))}
        </ul>
      )}

      {empty ? (
        <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
          <h3 className="text-base font-bold text-ink">{t("state.noQuotes.title")}</h3>
          <p className="mt-2 text-sm leading-7 text-ink">{t("extract.formsNote")}</p>
          <p className="mt-1 text-sm leading-7 text-ink">{t("state.noQuotes.body")}</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
          <div className="lg:sticky lg:top-4">
            <DraftView draft={draft} items={result.items} />
          </div>
          <section aria-labelledby="cards-title" className="space-y-4">
            <h3 id="cards-title" className="sr-only">
              {t("results.cards.title")}
            </h3>
            {result.items.map((item, i) => (
              <ReviewCard key={item.id} item={item} index={i + 1} />
            ))}
          </section>
        </div>
      )}
    </section>
  );
}

// The loading state: the shape of a result, with nothing in it.
export function ResultsSkeleton() {
  return (
    <div aria-hidden="true" className="mt-8 space-y-4">
      <div className="h-6 w-2/3 rounded bg-ink/10 motion-safe:animate-pulse" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="h-5 w-40 rounded-full bg-ink/10 motion-safe:animate-pulse" />
          <div className="h-12 rounded-lg bg-ink/10 motion-safe:animate-pulse" />
          <div className="h-20 rounded-lg bg-ink/5 motion-safe:animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-ink/10 motion-safe:animate-pulse" />
        </div>
      ))}
    </div>
  );
}
