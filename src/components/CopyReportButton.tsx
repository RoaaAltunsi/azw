"use client";

import type { ReviewResult } from "@/core/types";
import { t } from "@/i18n/ar";
import { CopyButton } from "./CopyButton";
import { reportText } from "./lib/report";

// «انسخ التقرير»: the result as plain text, dated by the reader's clock at the click.
export function CopyReportButton({ result }: { result: ReviewResult }) {
  return <CopyButton label={t("report.copy")} doneText={t("report.copy.done")} getText={() => reportText(result, new Date())} />;
}
