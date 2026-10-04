import type { Metadata } from "next";
import { InfoList, InfoPage, InfoSection } from "@/components/SiteChrome";
import { t, type MessageKey } from "@/i18n/ar";

export const metadata: Metadata = { title: t("privacy.title") };

// The sections of docs/PRIVACY.md, in its order. The page says what that file says, and no more.
const SECTIONS: ReadonlyArray<{ title: MessageKey; items: readonly MessageKey[] }> = [
  { title: "privacy.processed.title", items: ["privacy.processed.1", "privacy.processed.2", "privacy.processed.3"] },
  {
    title: "privacy.notKept.title",
    items: ["privacy.notKept.1", "privacy.notKept.2", "privacy.notKept.3", "privacy.notKept.4"],
  },
  { title: "privacy.recorded.title", items: ["privacy.recorded.1"] },
  { title: "privacy.address.title", items: ["privacy.address.1"] },
  { title: "privacy.retention.title", items: ["privacy.retention.1"] },
  { title: "privacy.limits.title", items: ["privacy.limits.1"] },
];

export default function PrivacyPage() {
  return (
    <InfoPage title={t("privacy.title")} intro={t("privacy.intro")}>
      {SECTIONS.map(({ title, items }) => (
        <InfoSection key={title} title={t(title)}>
          <InfoList items={items} />
        </InfoSection>
      ))}
    </InfoPage>
  );
}
