import Link from "next/link";
import type { ReactNode } from "react";
import { t, type MessageKey } from "@/i18n/ar";
import { Icon } from "./Icon";
import { Logo, LogoMark } from "./Logo";

// Shown on every page: the tool is AI-assisted, not a scholar (AGENTS.md §2 rule 7).
export function AiBanner() {
  return (
    <p role="note" className="flex items-center justify-center gap-1.5 bg-ink px-4 py-1.5 text-center text-xs text-white">
      <Icon name="spark" size={14} />
      {t("banner.aiTool")}
    </p>
  );
}

const NAV_LINKS: ReadonlyArray<{ href: string; label: MessageKey }> = [
  { href: "/how-it-works", label: "footer.how" },
  { href: "/sources", label: "footer.sources" },
  { href: "/privacy", label: "footer.privacy" },
];

function NavLinks({ className }: { className: string }) {
  return (
    <ul className={className}>
      {NAV_LINKS.map(({ href, label }) => (
        <li key={href}>
          <Link href={href} className="rounded-md px-1 py-2 text-muted hover:text-ink">
            {t(label)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label={t("header.home")} className="rounded-lg">
          <Logo />
        </Link>
        {/* On a narrow screen the same links are in the footer. */}
        <nav aria-label={t("header.nav")} className="hidden sm:block">
          <NavLinks className="flex items-center gap-5 text-sm font-medium" />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between">
        <p className="flex items-center gap-2.5 font-quote text-base text-ink">
          <LogoMark size={28} />
          {t("app.tagline")}
        </p>
        <nav aria-label={t("footer.nav")}>
          <NavLinks className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm" />
        </nav>
      </div>
    </footer>
  );
}

// The frame of the three text pages.
export function InfoPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href="/" className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted hover:text-ink">
        <Icon name="back" />
        {t("page.backHome")}
      </Link>
      <article className="card mt-4 p-5 sm:p-8">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
        <p className="mt-3 text-base leading-8 text-muted">{intro}</p>
        {children}
      </article>
    </main>
  );
}

export function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 border-t border-line pt-6">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function InfoList({ items, ordered = false }: { items: readonly MessageKey[]; ordered?: boolean }) {
  const List = ordered ? "ol" : "ul";
  return (
    <List
      className={`mt-3 space-y-2 ps-6 text-base leading-8 text-ink marker:text-vermilion ${ordered ? "list-decimal marker:font-semibold" : "list-disc"}`}
    >
      {items.map((key) => (
        <li key={key}>{t(key)}</li>
      ))}
    </List>
  );
}
