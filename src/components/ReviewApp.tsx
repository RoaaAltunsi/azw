"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ReviewResult } from "@/core/types";
import { format, t, type MessageKey } from "@/i18n/ar";
import { Icon, type IconName } from "./Icon";
import { Notice } from "./Notice";
import { ResultsSkeleton, ResultsView } from "./ResultsView";
import { requestReview } from "./lib/api-client";
import { coverageNames, summaryText } from "./lib/labels";
import { useHealth, type HealthState } from "./useHealth";

const FORM_ID = "review-form";

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
      <div className="mx-auto mt-6 max-w-3xl">
        <ScopeNote health={health} />

        <form id={FORM_ID} onSubmit={submit} className="card composer mt-4 overflow-hidden" aria-busy={loading}>
          <label htmlFor="draft" className="eyebrow block px-4 pt-3">
            {t("home.draft.label")}
          </label>
          <textarea
            id="draft"
            name="draft"
            dir="rtl"
            lang="ar"
            rows={7}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("home.draft.placeholder")}
            aria-describedby="draft-hint"
            autoComplete="off"
            className="block w-full resize-y bg-transparent px-4 py-2 text-lg leading-9 text-ink placeholder:text-ink/55"
          />
          <div className="flex flex-col gap-3 border-t border-line bg-tint/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p id="draft-hint" className="flex items-center gap-1.5 text-xs leading-5 text-muted">
              <Icon name="lock" size={14} />
              {t("home.draft.hint")}
            </p>
            <div className="flex shrink-0 gap-2">
              <button type="button" className="btn-secondary" onClick={() => setText(t("home.example.draft"))}>
                {t("home.example")}
              </button>
              <button type="submit" className="btn-primary grow sm:px-6" aria-disabled={loading}>
                {loading && <Icon name="spinner" />}
                {loading ? t("home.submit.loading") : t("home.submit")}
              </button>
            </div>
          </div>
        </form>

        <SourcesLine health={health} />

        {phase.kind === "idle" && <UsageGuide />}
        {phase.kind === "error" && (
          <Notice tone="error" role="alert" title={t("state.error.title")} className="mt-8">
            <p>{phase.message}</p>
            <button type="submit" form={FORM_ID} className="btn-secondary mt-2">
              {t("state.error.retry")}
            </button>
          </Notice>
        )}
      </div>

      {/* What changed, for assistive technology. The visible result follows. */}
      <p role="status" className="sr-only">
        {loading && t("state.loading")}
        {phase.kind === "done" &&
          (phase.result.items.length === 0 ? t("state.noQuotes.title") : summaryText(phase.result))}
      </p>

      {loading && <ResultsSkeleton />}
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
    <div aria-live="polite" className="text-center text-sm leading-7 text-ink sm:text-base">
      {health.status === "ready" && <p>{format("home.scope", { coverage: coverageNames(health.health.coverage) })}</p>}
      {health.status === "loading" && (
        <p>
          <span className="sr-only">{t("home.scope.loading")}</span>
          <span aria-hidden="true" className="skeleton mx-auto block h-7 w-4/5 max-w-md" />
        </p>
      )}
      {health.status === "unavailable" && <Notice className="text-start">{t("home.scope.unavailable")}</Notice>}
    </div>
  );
}

// Under the draft box: what is searched and the data version, and whether the server has no LLM
// keys (LLM_PROVIDER, LLM_MODEL, LLM_API_KEY), as GET /api/v1/health reports it.
function SourcesLine({ health }: { health: HealthState }) {
  if (health.status !== "ready") return null;
  const { coverage, corpusVersion, llmConfigured } = health.health;
  return (
    <div className="mt-3 space-y-1 px-1 text-xs leading-6 text-muted">
      <p>{format("home.sourcesLine", { coverage: coverageNames(coverage), version: corpusVersion })}</p>
      {!llmConfigured && (
        <p className="flex items-start gap-1.5">
          <Icon name="info" size={14} className="mt-1" />
          {t("home.llm.notConfigured")}
        </p>
      )}
    </div>
  );
}

const GUIDE_STEPS: ReadonlyArray<{ icon: IconName; label: MessageKey }> = [
  { icon: "paste", label: "home.guide.1" },
  { icon: "search", label: "home.guide.2" },
  { icon: "compare", label: "home.guide.3" },
];

// The idle state: the three steps, joined by the trace line.
function UsageGuide() {
  return (
    <section aria-label={t("home.guide.title")} className="mt-10">
      <ol className="flex items-start justify-center">
        {GUIDE_STEPS.map(({ icon, label }, i) => (
          <li key={label} className="flex items-start">
            {i > 0 && <span aria-hidden="true" className="trace-rule mt-5 w-6 sm:w-16" />}
            <span className="flex w-24 flex-col items-center gap-2 text-center text-xs font-medium text-ink sm:w-28 sm:text-sm">
              <span className="flex size-10 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-card">
                <Icon name={icon} size={18} />
              </span>
              {t(label)}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-5 text-center text-sm text-muted">{t("state.empty")}</p>
    </section>
  );
}
