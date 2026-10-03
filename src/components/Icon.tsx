// The UI's line icons, drawn on the 16px grid of the status icons (StatusPill.tsx). They are
// decoration: the text beside an icon always says what it means.
const ICON_PATHS = {
  lock: "M4.5 7.5h7a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1zM5.5 7.5v-2a2.5 2.5 0 0 1 5 0v2",
  copy: "M6 5.5h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1zM3 10.5v-7a1 1 0 0 1 1-1h7",
  compare: "M8 2.5v11M2.5 4.5h3M2.5 8h3M2.5 11.5h3M10.5 4.5h3M10.5 8h3M10.5 11.5h3",
  info: "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM8 7.5V11M8 5v.01",
  alert: "M8 2.5l6 11H2l6-11zM8 6.5V10M8 12v.01",
  // Points to the right: "back" in a right-to-left page.
  back: "M3 8h10M9.5 4.5L13 8l-3.5 3.5",
  external: "M6.5 3.5h-3v9h9v-3M9.5 3H13v3.5M13 3L7.5 8.5",
  paste: "M5.5 3.5h-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1M6 2.5h4v2H6z",
  search: "M7 11.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zM10.5 10.5l3 3",
  spark: "M7 2.5l1.2 3.3L11.5 7 8.2 8.2 7 11.5 5.8 8.2 2.5 7l3.3-1.2L7 2.5zM12.5 10.5v3M11 12h3",
  spinner: "M8 2.5A5.5 5.5 0 1 1 2.5 8",
} as const;

export type IconName = keyof typeof ICON_PATHS;

export function Icon({ name, size = 16, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${name === "spinner" ? "spinner" : ""} ${className}`}
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
