import { ReviewApp } from "@/components/ReviewApp";
import { t } from "@/i18n/ar";

export default function HomePage() {
  return (
    <main id="main" className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mx-auto flex max-w-2xl flex-col items-center gap-3 pt-2 text-center sm:pt-6">
        <h1 className="font-quote text-3xl font-bold leading-relaxed text-ink sm:text-4xl sm:leading-relaxed">
          {t("app.tagline")}
        </h1>
        <span aria-hidden="true" className="trace-rule w-24" />
        <p className="text-sm leading-7 text-muted sm:text-base">{t("app.description")}</p>
      </header>
      <ReviewApp />
    </main>
  );
}
