"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ReviewResult } from "@/core/types";
import { format, t } from "@/i18n/ar";
import { ResultsSkeleton, ResultsView } from "./ResultsView";
import { requestReview } from "./lib/api-client";
import { coverageNames, summaryText } from "./lib/labels";
import { useHealth, type HealthState } from "./useHealth";

type Phase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  // `draft` is the text that was reviewed: the spans of the result are offsets into it.
  | { kind: "done"; result: ReviewResult; draft: string };

// The home screen. The draft lives in this component's state only: it is not written to any
// browser storage, and it leaves the page only in the review request (docs/PRIVACY.md).
export function ReviewApp() {
  const health = useHealth();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const request = useRef<AbortController | null>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => () => request.current?.abort(), []);

  // After a review, the focus goes to the result's heading, so the next Tab is in the result.
  useEffect(() => {
    if (phase.kind === "done") resultsHeading.current?.focus();
  }, [phase]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase.kind === "loading") return;
    if (text.trim() === "") {
      setPhase({ kind: "error", message: t("api.error.EMPTY_DRAFT") });
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPhase({ kind: "loading" });
    const draft = text;
    const outcome = await requestReview(draft, { signal: controller.signal });
    if (outcome.kind === "aborted") return;
    setPhase(outcome.kind === "result" ? { kind: "done", result: outcome.result, draft } : outcome);
  }

  const loading = phase.kind === "loading";

  return (
    <>
      <ScopeNote health={health} />

      <form onSubmit={submit} className="mt-6" aria-busy={loading}>
        <label htmlFor="draft" className="block text-sm font-semibold text-ink">
          {t("home.draft.label")}
        </label>
        <textarea
          id="draft"
          name="draft"
          dir="rtl"
          lang="ar"
          rows={9}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("home.draft.placeholder")}
          aria-describedby="draft-hint"
          autoComplete="off"
          className="mt-1 block w-full rounded-xl border border-ink/40 bg-white p-4 text-lg leading-9 text-ink placeholder:text-ink/60"
        />
        <p id="draft-hint" className="mt-1 text-xs text-ink/80">
          {t("home.draft.hint")}
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="submit" className="btn-primary grow sm:grow-0 sm:px-8" aria-disabled={loading}>
            {loading ? t("home.submit.loading") : t("home.submit")}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setText(t("home.example.draft"))}>
            {t("home.example")}
          </button>
        </div>
      </form>

      <SourcesLine health={health} />

      {/* What changed, for assistive technology. The visible result follows. */}
      <p role="status" className="sr-only">
        {loading && t("state.loading")}
        {phase.kind === "done" &&
          (phase.result.items.length === 0 ? t("state.noQuotes.title") : summaryText(phase.result))}
      </p>

      {phase.kind === "idle" && <p className="mt-8 text-center text-sm text-ink/80">{t("state.empty")}</p>}
      {loading && <ResultsSkeleton />}
      {phase.kind === "error" && (
        <div role="alert" data-status="ERROR" className="status-card mt-8 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-ink">{t("state.error.title")}</h2>
          <p className="mt-1 text-sm leading-7 text-ink">{phase.message}</p>
        </div>
      )}
      {phase.kind === "done" && (
        <ResultsView result={phase.result} draft={phase.draft} stale={text !== phase.draft} headingRef={resultsHeading} />
      )}
    </>
  );
}

// «يراجع النقول من: …», built from the coverage of GET /api/v1/health. Until that answer is here,
// and when it does not come, no source is named.
function ScopeNote({ health }: { health: HealthState }) {
  return (
    <p className="mt-4 text-center text-base leading-7 text-ink" aria-live="polite">
      {health.status === "ready" && format("home.scope", { coverage: coverageNames(health.health.coverage) })}
      {health.status === "loading" && t("home.scope.loading")}
      {health.status === "unavailable" && t("home.scope.unavailable")}
    </p>
  );
}

function SourcesLine({ health }: { health: HealthState }) {
  if (health.status !== "ready") return null;
  const { coverage, corpusVersion } = health.health;
  return (
    <p className="mt-3 text-xs text-ink/80">
      {format("home.sourcesLine", { coverage: coverageNames(coverage), version: corpusVersion })}
    </p>
  );
}
