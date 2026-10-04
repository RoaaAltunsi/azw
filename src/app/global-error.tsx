"use client";

import { Notice } from "@/components/Notice";
import { t } from "@/i18n/ar";
import "./globals.css";

// Shown when a page itself fails to render. It replaces the root layout, so it carries the AI
// banner of its own (AGENTS.md §2 rule 7), and it says what happened in the tool's fixed words:
// nothing of the error is shown or logged here, and no result.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8">
          <Notice tone="error" role="alert" title={t("state.error.title")}>
            <p>{t("state.error.page")}</p>
            <button type="button" className="btn-secondary mt-2" onClick={reset}>
              {t("state.error.retry")}
            </button>
          </Notice>
        </main>
      </body>
    </html>
  );
}
