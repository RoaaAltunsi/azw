import type { Metadata } from "next";
import { InfoPage } from "@/components/SiteChrome";
import { SourcesRegister } from "@/components/SourcesRegister";
import { t } from "@/i18n/ar";

export const metadata: Metadata = { title: t("sources.title") };

export default function SourcesPage() {
  return (
    <InfoPage title={t("sources.title")} intro={t("sources.intro")}>
      <SourcesRegister />
    </InfoPage>
  );
}
