// Names the UI shows for ids that come from the API. An id without a name in src/i18n/ar.ts is
// shown as it is; nothing here names a collection or a kind the API did not send.
import type { ReviewResult, Status } from "@/core/types";
import { ar, format, t, type MessageKey } from "@/i18n/ar";

function lookup(key: string): string | undefined {
  return Object.hasOwn(ar, key) ? t(key as MessageKey) : undefined;
}

export const collectionName = (id: string): string => lookup(`collection.${id}`) ?? id;

// The covered sources as one phrase, from `coverage` of a result or of GET /api/v1/health.
export const coverageNames = (coverage: readonly string[]): string =>
  coverage.map(collectionName).join(t("list.separator"));

// What the draft presents a quote as («kind.<id>»).
export const kindLabel = (kind: string): string => lookup(`kind.${kind}`) ?? kind;

export const warningText = (code: string): string => lookup(`warning.${code}`) ?? format("warning.unknown", { code });

// The order of the summary row. ERROR is a system state: it is counted only when it happened.
const SUMMARY_ORDER = ["MATCH", "DIFFERS", "NEEDS_SPECIALIST", "NOT_FOUND", "ERROR"] as const satisfies readonly Status[];

export function summaryText(result: Pick<ReviewResult, "items" | "summary">): string {
  const parts = SUMMARY_ORDER.filter((status) => status !== "ERROR" || result.summary.ERROR > 0).map((status) =>
    format(`results.summary.${status}`, { n: result.summary[status] }),
  );
  return format("results.summary", { count: result.items.length, parts: parts.join(t("results.summary.separator")) });
}
