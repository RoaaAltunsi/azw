"use client";

import { useEffect, useState } from "react";
import { format, t } from "@/i18n/ar";
import { estimatedProgress, progressStage } from "./lib/progress";

const TICK_MS = 250;

// The wait: an estimated percentage, the step the pipeline is likely at, and a way out. It mounts
// when a review starts, so its clock starts at 0.
export function ReviewProgress({ onCancel }: { onCancel: () => void }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - started), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const percent = estimatedProgress(elapsed);
  return (
    <section aria-labelledby="progress-title" className="card mx-auto mt-4 max-w-xl p-5 text-center sm:mt-10 sm:p-8">
      <h2 id="progress-title" className="text-lg font-bold text-ink">
        {t("state.loading")}
      </h2>
      {/* The number is not announced on every tick: the bar carries it for assistive technology. */}
      <p aria-hidden="true" className="mt-3 text-5xl font-bold tabular-nums text-ink">
        {format("progress.percent", { percent })}
      </p>
      <div
        role="progressbar"
        aria-label={t("progress.label")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="progress-track mt-4"
      >
        <div className="progress-bar" style={{ inlineSize: `${percent}%` }} />
      </div>
      <p className="mt-4 text-sm font-medium text-ink">{t(progressStage(percent))}</p>
      <p className="mt-1 text-xs leading-6 text-muted">{t("progress.note")}</p>
      <button type="button" className="btn-secondary mt-4" onClick={onCancel}>
        {t("progress.cancel")}
      </button>
    </section>
  );
}
