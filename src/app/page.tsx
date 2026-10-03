import { t } from "@/i18n/ar";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-quote text-6xl font-bold text-ink">{t("app.name")}</h1>
      <p className="font-quote text-xl text-ink/80">{t("app.tagline")}</p>
      <span aria-hidden className="h-px w-24 border-t border-dashed border-vermilion" />
    </main>
  );
}
