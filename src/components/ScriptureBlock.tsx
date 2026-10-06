import Link from "next/link";
import type { Evidence } from "@/core/types";
import { format, t } from "@/i18n/ar";
import { DiffText } from "./DiffText";
import { Icon } from "./Icon";
import { kindUi } from "./lib/kind-ui";
import { occurrenceCitation, type Occurrence } from "./lib/occurrences";
import { alignedSourceSegments, sourceSegments } from "./lib/segments";

// A text beside its label: the label above it on a narrow screen, at its start on a wide one,
// with the accent line between them. The draft's quote and the source's text share it.
export const QUOTE_ROW = "sm:grid sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-4";
export const QUOTE_ROW_BODY = "mt-1 min-w-0 sm:mt-0 sm:border-s-2 sm:border-vermilion/60 sm:ps-4";

// The text of one source record: record.exactText between the marks of its kind, and nothing else
// (AGENTS.md §2 rules 1–2). The marks stand outside the text and are not part of it.
export function SourceText({ entry, aligned = false }: { entry: Evidence; aligned?: boolean }) {
  const ui = kindUi(entry.record.kind);
  return (
    <p className={`${ui.textClass} text-xl leading-[2.4] text-ink`} lang="ar">
      {ui.open}
      <DiffText segments={aligned ? alignedSourceSegments(entry) : sourceSegments(entry)} side="source" quietContext />
      {ui.close}
    </p>
  );
}

// The "scripture" block: source text only, visually apart from the tool's sentences and from any
// generated text. Everything below the text comes from the record as the API sent it.
export function ScriptureBlock({ occurrence }: { occurrence: Occurrence }) {
  const several = occurrence.entries.length > 1;
  return (
    <section className={`rounded-xl border border-line bg-paper p-4 ${QUOTE_ROW}`} aria-label={t("card.source.label")}>
      <h4 className="eyebrow">{t("card.source.label")}</h4>
      <div className={QUOTE_ROW_BODY}>
        {occurrence.entries.map((entry) => (
          <div key={entry.record.id}>
            <SourceText entry={entry} />
            <RecordFacts entry={entry} showCitation={several} />
          </div>
        ))}
        <p className="mt-3 border-t border-line pt-3 text-sm font-semibold text-ink">
          {format("card.source.reference", { ref: occurrenceCitation(occurrence) })}
        </p>
        <SourceLink entry={occurrence.entries[0]!} />
      </div>
    </section>
  );
}

// What the record says about itself: its own citation (when the occurrence runs over several
// records), a grade only when the record has one, with its «by» (AGENTS.md §2 rule 4), and whether
// the record is still pending.
function RecordFacts({ entry, showCitation }: { entry: Evidence; showCitation: boolean }) {
  const { record } = entry;
  if (!showCitation && !record.grade && record.reviewStatus === "reviewed") return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {showCitation && <li>{record.citation.display}</li>}
      {record.grade && <li>{format("card.grade", { text: record.grade.text, by: record.grade.by })}</li>}
      {record.reviewStatus === "pending" && <li>{t("card.source.pending")}</li>}
    </ul>
  );
}

function SourceLink({ entry }: { entry: Evidence }) {
  const { sourceUrl, sourceName } = entry.record;
  const label = format("card.source.link", { name: sourceName });
  if (!sourceUrl) return <p className="mt-1 text-xs text-muted">{label}</p>;
  const externalLabel = sourceUrl.endsWith(".json") ? t("card.source.openJson") : t("card.source.openWebsite");
  return (
    <div className="mt-1 text-xs text-muted">
      <p>{label}</p>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/sources" className="text-link">
          {t("card.source.details")}
        </Link>
        <a href={sourceUrl} target="_blank" rel="noreferrer noopener" className="text-link inline-flex items-center gap-1.5">
          {externalLabel}
          <Icon name="external" size={12} />
        </a>
      </div>
    </div>
  );
}
