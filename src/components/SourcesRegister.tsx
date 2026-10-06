"use client";

import { t, type MessageKey } from "@/i18n/ar";
import { Icon } from "./Icon";
import { Notice } from "./Notice";
import { InfoSection } from "./SiteChrome";
import { useHealth } from "./useHealth";

// The sources of docs/SOURCES.md, each with the collections it supplies. An entry is shown only
// when every one of its collections is in the API's coverage: a source nothing searches is not
// named in the UI (AGENTS.md §6, docs/DECISIONS.md D-19).
interface SourceEntry {
  id: "quran" | "hadith";
  collections: readonly string[];
  url: string;
}

const SOURCES: readonly SourceEntry[] = [
  { id: "quran", collections: ["quran"], url: "https://quranpedia.net" },
  { id: "hadith", collections: ["bukhari", "muslim"], url: "https://github.com/fawazahmed0/hadith-api" },
];

const FIELDS = ["source", "version", "license", "numbering", "review", "notes"] as const;

export const searchedSources = (coverage: readonly string[]): SourceEntry[] =>
  SOURCES.filter((source) => source.collections.every((collection) => coverage.includes(collection)));

export function SourcesRegister() {
  const health = useHealth();
  if (health.status === "loading") {
    return (
      <div role="status" className="mt-8 space-y-3 border-t border-line pt-6">
        <span className="sr-only">{t("sources.loading")}</span>
        <div className="skeleton h-6 w-40" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-2/3" />
      </div>
    );
  }
  if (health.status === "unavailable") {
    return (
      <Notice tone="error" role="alert" className="mt-6">
        {t("sources.unavailable")}
      </Notice>
    );
  }
  const { coverage } = health.health;
  return (
    <>
      {searchedSources(coverage).map((source) => (
        <InfoSection key={source.id} title={t(`sources.${source.id}.title`)}>
          <dl className="mt-3 divide-y divide-line text-base leading-8 text-ink">
            {FIELDS.map((field) => (
              <div key={field} className="py-3 sm:grid sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
                <dt className="eyebrow sm:pt-1.5">{t(`sources.field.${field}`)}</dt>
                <dd>{t(`sources.${source.id}.${field}` satisfies MessageKey)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm">
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-link inline-flex items-center gap-1.5"
            >
              {t(`sources.${source.id}.linkLabel`)}
              <Icon name="external" size={14} />
            </a>
          </p>
        </InfoSection>
      ))}
    </>
  );
}
