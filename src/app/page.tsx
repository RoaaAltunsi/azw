import { ReviewApp } from "@/components/ReviewApp";
import { t } from "@/i18n/ar";

export default function HomePage() {
  return (
    <main id="main" className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="font-quote text-6xl font-bold text-ink">{t("app.name")}</h1>
        <p className="font-quote text-xl text-ink">{t("app.tagline")}</p>
        <span aria-hidden="true" className="h-px w-24 border-t-2 border-dashed border-vermilion" />
      </header>
      <ReviewApp />
    </main>
  );
}
