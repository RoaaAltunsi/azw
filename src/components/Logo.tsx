import { t } from "@/i18n/ar";

// The mark: a quotation («) and, under it, the dashed trace that leads to its source (the dot).
// The same drawing is the app icon, src/app/icon.svg: change both together.
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" width={size} height={size} className={className}>
      <rect width="48" height="48" rx="12" fill="var(--azw-ink)" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5">
        <path d="M22 11l-8 8 8 8M33 11l-8 8 8 8" stroke="#fff" />
        <path d="M13 36h5M23 36h5" stroke="var(--azw-vermilion)" />
      </g>
      <circle cx="35" cy="36" r="3.25" fill="var(--azw-vermilion)" />
    </svg>
  );
}

// The mark with the name beside it.
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} className="shrink-0" />
      <span className="font-quote text-3xl font-bold leading-none text-ink">{t("app.name")}</span>
    </span>
  );
}
