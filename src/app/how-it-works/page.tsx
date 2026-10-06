import type { Metadata } from "next";
import { InfoList, InfoPage, InfoSection } from "@/components/SiteChrome";
import { StatusPill } from "@/components/StatusPill";
import { STATUSES, type Status } from "@/core/types";
import { t } from "@/i18n/ar";

export const metadata: Metadata = { title: t("how.title") };
const RESULT_STATUSES = STATUSES.filter((status) => status !== "ERROR");

function StatusDefinition({ status }: { status: Status }) {
  return (
    <div data-status={status} className="status-card status-wash px-4 py-3">
      <dt>
        <StatusPill status={status} />
      </dt>
      <dd className="mt-2 text-base leading-8 text-ink">{t(`how.status.${status}`)}</dd>
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <InfoPage title={t("how.title")} intro={t("how.intro")}>
      <InfoSection title={t("how.steps.title")}>
        <InfoList ordered items={["how.steps.1", "how.steps.2", "how.steps.3", "how.steps.4", "how.steps.5"]} />
      </InfoSection>
      <InfoSection title={t("how.statuses.title")}>
        <dl className="mt-4 space-y-3">
          {RESULT_STATUSES.map((status) => (
            <StatusDefinition key={status} status={status} />
          ))}
        </dl>
        <div className="mt-6 border-t border-line pt-5">
          <p className="eyebrow">{t("how.systemStatus.label")}</p>
          <dl className="mt-2">
            <StatusDefinition status="ERROR" />
          </dl>
        </div>
      </InfoSection>
      <InfoSection title={t("how.limits.title")}>
        <InfoList items={["how.limits.1", "how.limits.2", "how.limits.3", "how.limits.4"]} />
      </InfoSection>
    </InfoPage>
  );
}
