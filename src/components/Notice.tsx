import type { ReactNode } from "react";
import { Icon } from "./Icon";

type NoticeTone = "info" | "error";

const TONE_CLASS: Record<NoticeTone, string> = {
  info: "border-line bg-surface text-muted",
  error: "border-vermilion/50 bg-surface text-ink",
};

interface NoticeProps {
  tone?: NoticeTone;
  title?: string;
  role?: "alert" | "note";
  className?: string;
  children: ReactNode; // the message, and an action under it when there is one
}

// A sentence of the tool about its own state (a warning, a fault, a missing setting): an icon and
// words, never color alone.
export function Notice({ tone = "info", title, role, className = "", children }: NoticeProps) {
  return (
    <div role={role} className={`flex gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-7 ${TONE_CLASS[tone]} ${className}`}>
      <Icon
        name={tone === "error" ? "alert" : "info"}
        size={18}
        className={`mt-1 ${tone === "error" ? "text-vermilion" : ""}`}
      />
      <div className="min-w-0 flex-1">
        {title && <p className="font-bold text-ink">{title}</p>}
        {children}
      </div>
    </div>
  );
}
