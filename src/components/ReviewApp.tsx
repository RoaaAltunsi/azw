"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ReviewResult } from "@/core/types";
import { format, t, type MessageKey } from "@/i18n/ar";
import { Icon, type IconName } from "./Icon";
import { LogoMark } from "./Logo";
import { Notice } from "./Notice";
import { ResultsSkeleton, ResultsView } from "./ResultsView";
import { ReviewProgress } from "./ReviewProgress";
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

// The home screen: the draft box, then the wait, then the result in its place. The draft lives in
// this component's state only: it is not written to any browser storage, and it leaves the page
// only in the review request (docs/PRIVACY.md).
export function ReviewApp() {
  const health = useHealth();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const request = useRef<AbortController | null>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => () => request.current?.abort(), []);

  // The wait and the result take the place of the draft box, so each starts at the top of the
  // page. After a review, the focus goes to the result's heading, so the next Tab is in the result.
  useEffect(() => {
    if (phase.kind === "loading" || phase.kind === "done") window.scrollTo({ top: 0 });
    if (phase.kind === "done") resultsHeading.current?.focus({ preventScroll: true });
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

  // Back to the draft box, with the draft as the writer left it.
  function backToDraft() {
    request.current?.abort();
    setPhase({ kind: "idle" });
  }

  return (
    <>
      {/* What changed, for assistive technology. The visible state follows. */}
      <p role="status" className="sr-only">
        {phase.kind === "loading" && t("state.loading")}
        {phase.kind === "done" &&
          (phase.result.items.length === 0 ? t("state.noQuotes.title") : summaryText(phase.result))}
      </p>

      {/* The draft box has its own heading; the wait and the result stand under the tool's name. */}
      {(phase.kind === "loading" || phase.kind === "done") && <h1 className="sr-only">{t("app.name")}</h1>}

      {phase.kind === "loading" && (
        <>
          <ReviewProgress onCancel={backToDraft} />
          <ResultsSkeleton />
        </>
      )}

      {phase.kind === "done" && (
        <ResultsView result={phase.result} draft={phase.draft} headingRef={resultsHeading} onBack={backToDraft} />
      )}

      {(phase.kind === "idle" || phase.kind === "error") && (
        <>
          <Hero />
          <div className="mt-6 grid gap-4 lg:mt-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-stretch">
            <div>
              <form id={FORM_ID} onSubmit={submit} className="card p-4 sm:p-6">
                <label htmlFor="draft" className="flex items-center gap-2 text-base font-bold text-ink">
                  <Icon name="doc" size={20} />
                  {t("home.draft.label")}
                </label>
                <div className="composer mt-3 overflow-hidden rounded-xl border border-line-strong bg-surface">
                  <textarea
                    id="draft"
                    name="draft"
                    dir="rtl"
                    lang="ar"
                    rows={6}
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder={t("home.draft.placeholder")}
                    aria-describedby="draft-hint"
                    autoComplete="off"
                    className="block w-full resize-none bg-transparent px-4 py-3 text-lg leading-9 text-ink placeholder:text-ink/55"
                  />
                  <div className="flex items-start justify-between gap-3 px-4 pb-3 text-xs leading-5 text-muted">
                    <p id="draft-hint" className="flex items-start gap-1.5">
                      <Icon name="lock" size={14} className="mt-0.5" />
                      {t("home.draft.hint")}
                    </p>
                    <p className="shrink-0 tabular-nums">{format("home.draft.count", { count: text.length })}</p>
                  </div>
                </div>

                {phase.kind === "error" && (
                  <Notice tone="error" role="alert" title={t("state.error.title")} className="mt-4">
                    <p>{phase.message}</p>
                  </Notice>
                )}

                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <ScopeNote health={health} />
                  <div className="flex shrink-0 gap-2">
                    <button type="button" className="btn-secondary px-6" onClick={() => setText(t("home.example.draft"))}>
                      {t("home.example")}
                    </button>
                    <button type="submit" className="btn-primary grow sm:px-6">
                      {phase.kind === "error" ? t("state.error.retry") : t("home.submit")}
                      <Icon name="next" />
                    </button>
                  </div>
                </div>
              </form>
              <DataLine health={health} />
            </div>
            <AfterReview />
          </div>
        </>
      )}
    </>
  );
}

// The opening of the home screen: what the tool is for, in one line, beside the mark.
function Hero() {
  return (
    <header className="flex items-center justify-between gap-6 pt-2 lg:pt-4">
      <div>
        <h1 className="text-3xl font-bold leading-snug text-ink sm:text-4xl lg:text-5xl lg:leading-snug">
          {t("home.hero.title")}
        </h1>
        <p className="mt-2 text-base leading-8 text-muted sm:text-lg lg:mt-3 lg:text-xl">{t("home.hero.subtitle")}</p>
        <span aria-hidden="true" className="mt-4 block h-0.5 w-12 rounded-full bg-vermilion" />
      </div>
      <div className="hidden shrink-0 border-s border-vermilion/40 ps-8 md:block lg:me-8">
        <LogoMark size={120} />
      </div>
    </header>
  );
}

// «يراجع النقول من: …», built from the coverage of GET /api/v1/health. Until that answer is here,
// and when it does not come, no source is named.
function ScopeNote({ health }: { health: HealthState }) {
  return (
    <div aria-live="polite" className="min-w-0 grow text-sm leading-6 text-muted">
      {health.status === "ready" && <p>{format("home.scope", { coverage: coverageNames(health.health.coverage) })}</p>}
      {health.status === "loading" && (
        <p>
          <span className="sr-only">{t("home.scope.loading")}</span>
          <span aria-hidden="true" className="skeleton block h-6 w-4/5 max-w-md" />
        </p>
      )}
      {health.status === "unavailable" && <p>{t("home.scope.unavailable")}</p>}
    </div>
  );
}

// Under the draft box: the data version, and whether the server has no LLM keys (LLM_PROVIDER,
// LLM_MODEL, LLM_API_KEY), as GET /api/v1/health reports it.
function DataLine({ health }: { health: HealthState }) {
  if (health.status !== "ready") return null;
  const { corpusVersion, llmConfigured } = health.health;
  return (
    <div className="mt-3 space-y-1 px-1 text-xs leading-6 text-muted">
      <p>{format("sources.version", { version: corpusVersion })}</p>
      {!llmConfigured && (
        <p className="flex items-start gap-1.5">
          <Icon name="info" size={14} className="mt-1" />
          {t("home.llm.notConfigured")}
        </p>
      )}
    </div>
  );
}

const AFTER_REVIEW: ReadonlyArray<{ icon: IconName; title: MessageKey; body: MessageKey; accent?: boolean }> = [
  { icon: "doc", title: "home.after.text.title", body: "home.after.text.body" },
  { icon: "book", title: "home.after.reference.title", body: "home.after.reference.body", accent: true },
  { icon: "compare", title: "home.after.diff.title", body: "home.after.diff.body" },
];

// Beside the draft box: what a review gives back.
function AfterReview() {
  return (
    <aside aria-labelledby="after-title" className="rounded-2xl border border-line bg-tint p-4 sm:p-6">
      <h2 id="after-title" className="border-b border-line pb-3 text-lg font-bold text-ink">
        {t("home.after.title")}
      </h2>
      <p className="mt-3 text-sm text-muted">{t("home.after.lead")}</p>
      <ul className="divide-y divide-line">
        {AFTER_REVIEW.map(({ icon, title, body, accent }) => (
          <li key={title} className="flex items-center gap-3 py-4 last:pb-0">
            <span
              className={`flex size-11 shrink-0 items-center justify-center rounded-full ${accent ? "bg-vermilion/15 text-vermilion" : "bg-ink/10 text-ink"}`}
            >
              <Icon name={icon} size={20} />
            </span>
            <span>
              <span className="block font-semibold text-ink">{t(title)}</span>
              <span className="block text-sm leading-6 text-muted">{t(body)}</span>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
