import { t } from "@/i18n/ar";

// The mark: two quotations facing each other (the draft's and the source's), and between them the
// line that joins a quote to its source.
// The same drawing is the app icon, src/app/icon.svg: change both together.
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 96 72" height={size} width={(size * 96) / 72} className={className}>
      <g fill="var(--azw-ink)">
        <path d="M11 6h24a7 7 0 0 1 7 7v22a7 7 0 0 1-2.4 5.3L14.5 63.4a1.6 1.6 0 0 1-2.4-1.9L21 42H11a7 7 0 0 1-7-7V13a7 7 0 0 1 7-7z" />
        <path d="M85 6H61a7 7 0 0 0-7 7v22a7 7 0 0 0 2.4 5.3l25.1 23.1a1.6 1.6 0 0 0 2.4-1.9L75 42h10a7 7 0 0 0 7-7V13a7 7 0 0 0-7-7z" />
      </g>
      <path
        d="M45.5 11c3 0 5 2 5.5 5 .5 3 2.500 4.500 6 4.500h1.500a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H57c-4 0-6.500 2.500-6.500 6.500V61c-3 0-5-2-5.500-5-.5-3-2.500-4.500-6-4.500h-1.500a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2H39c4 0 6.500-2.500 6.500-6.500z"
        fill="var(--azw-vermilion)"
        stroke="var(--azw-surface)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        paintOrder="stroke"
      />
    </svg>
  );
}

// The mark with the name beside it.
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} className="shrink-0" />
      <span className="font-quote text-3xl font-bold leading-none text-ink">{t("app.name")}</span>
    </span>
  );
}
