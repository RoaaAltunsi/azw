// What «انسخ التقرير» puts on the clipboard: a result as plain text, one field per line, each line
// opening with its Arabic label so that it reads right-to-left wherever it is pasted. It holds
// what the API sent and nothing else: no generated explanation and no grade.
import type { ReviewItem, ReviewResult } from "@/core/types";
import { format, t } from "@/i18n/ar";
import { coverageNames, warningText } from "./labels";
import { groupOccurrences, occurrenceCitation, occurrenceText } from "./occurrences";

// The day on the reader's own calendar, as YYYY-MM-DD.
const isoDay = (date: Date): string =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((n) => String(n).padStart(2, "0")).join("-");

function itemLines(item: ReviewItem, index: number): string[] {
  const lines = [
    format("card.title", { index }),
    format("report.status", { status: t(`status.${item.status}`) }),
    format("report.quote", { text: item.span.text }),
  ];
  // As on the card: an ERROR item shows nothing from a source, whatever it holds.
  const [occurrence] = item.status === "ERROR" ? [] : groupOccurrences(item.evidence);
  if (item.status !== "ERROR" && item.citedReference && item.citedReference.raw !== "") {
    lines.push(format("card.citedReference", { raw: item.citedReference.raw }));
  }
  if (occurrence) {
    lines.push(
      format("report.source", { text: occurrenceText(occurrence) }),
      format("card.source.reference", { ref: occurrenceCitation(occurrence) }),
      format("card.source.link", { name: occurrence.entries[0]!.record.sourceName }),
    );
  }
  lines.push(format("report.reason", { reason: item.reasonAr }));
  return lines;
}

// `date`: the reader's clock when the report is copied. A result itself holds no time.
export function reportText(result: ReviewResult, date: Date): string {
  const header = [
    t("report.title"),
    format("report.date", { date: isoDay(date) }),
    format("sources.version", { version: result.corpusVersion }),
    format("report.coverage", { coverage: coverageNames(result.coverage) }),
    ...result.warnings.map((code) => format("report.warning", { text: warningText(code) })),
  ];
  const blocks = [header, ...result.items.map((item, i) => itemLines(item, i + 1)), [t("report.footer")]];
  return blocks.map((lines) => lines.join("\n")).join("\n\n");
}
