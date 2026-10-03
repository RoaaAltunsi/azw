import type { ReactNode } from "react";
import type { Status } from "@/core/types";
import { t } from "@/i18n/ar";

// One icon per status, so that a status is never conveyed by color alone (AGENTS.md §8). The record
// is typed over Status: a new status does not compile without an icon.
const ICON_PATHS: Record<Status, ReactNode> = {
  // check
  MATCH: <path d="M3.5 8.5l3 3 6-7" />,
  // not equal
  DIFFERS: <path d="M3 6h10M3 10h10M10.5 3l-5 10" />,
  // magnifier with nothing in it
  NOT_FOUND: <path d="M7 11.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zM10.5 10.5l3 3M5.5 7h3" />,
  // person
  NEEDS_SPECIALIST: <path d="M8 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM3 13.5c.6-2.4 2.5-3.5 5-3.5s4.4 1.1 5 3.5" />,
  // warning triangle
  ERROR: <path d="M8 2.5l6 11H2l6-11zM8 6.5v3.5M8 12v.01" />,
};

export function StatusIcon({ status }: { status: Status }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {ICON_PATHS[status]}
    </svg>
  );
}

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className="status-pill" data-status={status}>
      <StatusIcon status={status} />
      {t(`status.${status}`)}
    </span>
  );
}
