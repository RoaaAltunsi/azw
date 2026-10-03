import type { Metadata } from "next";
import { InfoList, InfoPage, InfoSection } from "@/components/SiteChrome";
import { StatusPill } from "@/components/StatusPill";
import { STATUSES } from "@/core/types";
import { t } from "@/i18n/ar";

export const metadata: Metadata = { title: t("how.title") };

export default function HowItWorksPage() {
  return (
    <InfoPage title={t("how.title")} intro={t("how.intro")}>
      <InfoSection title={t("how.steps.title")}>
        <InfoList ordered items={["how.steps.1", "how.steps.2", "how.steps.3", "how.steps.4", "how.steps.5"]} />
      </InfoSection>
      <InfoSection title={t("how.statuses.title")}>
        <dl className="mt-3 space-y-4">
          {STATUSES.map((status) => (
            <div key={status}>
              <dt>
                <StatusPill status={status} />
              </dt>
              <dd className="mt-1 text-base leading-8 text-ink">{t(`how.status.${status}`)}</dd>
            </div>
          ))}
        </dl>
      </InfoSection>
      <InfoSection title={t("how.limits.title")}>
        <InfoList items={["how.limits.1", "how.limits.2", "how.limits.3", "how.limits.4"]} />
      </InfoSection>
    </InfoPage>
  );
}
