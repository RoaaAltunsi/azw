import Link from "next/link";
import type { ReactNode } from "react";
import { t, type MessageKey } from "@/i18n/ar";

// Shown on every page: the tool is AI-assisted, not a scholar (AGENTS.md §2 rule 7).
export function AiBanner() {
  return (
    <p role="note" className="bg-ink px-4 py-1.5 text-center text-xs text-white">
      {t("banner.aiTool")}
    </p>
  );
}

const FOOTER_LINKS: ReadonlyArray<{ href: string; label: MessageKey }> = [
  { href: "/privacy", label: "footer.privacy" },
  { href: "/sources", label: "footer.sources" },
  { href: "/how-it-works", label: "footer.how" },
];

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-dashed border-vermilion px-4 py-6">
      <nav aria-label={t("footer.nav")}>
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
          {FOOTER_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} className="text-ink underline underline-offset-4">
                {t(label)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}

// The frame of the three text pages.
export function InfoPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8">
      <p className="text-sm">
        <Link href="/" className="text-ink underline underline-offset-4">
          {t("page.backHome")}
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-bold text-ink">{title}</h1>
      <p className="mt-3 text-base leading-8 text-ink">{intro}</p>
      {children}
    </main>
  );
}

export function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function InfoList({ items, ordered = false }: { items: readonly MessageKey[]; ordered?: boolean }) {
  const List = ordered ? "ol" : "ul";
  return (
    <List className={`mt-3 space-y-2 ps-6 text-base leading-8 text-ink ${ordered ? "list-decimal" : "list-disc"}`}>
      {items.map((key) => (
        <li key={key}>{t(key)}</li>
      ))}
    </List>
  );
}
