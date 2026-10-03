"use client";

import { format, t, type MessageKey } from "@/i18n/ar";
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
  if (health.status === "loading") return <p className="mt-6 text-sm text-ink/80">{t("sources.loading")}</p>;
  if (health.status === "unavailable") {
    return (
      <p role="alert" className="mt-6 text-sm text-ink">
        {t("sources.unavailable")}
      </p>
    );
  }
  const { coverage, corpusVersion } = health.health;
  return (
    <>
      <p className="mt-3 text-sm text-ink/80">{format("sources.version", { version: corpusVersion })}</p>
      {searchedSources(coverage).map((source) => (
        <InfoSection key={source.id} title={t(`sources.${source.id}.title`)}>
          <dl className="mt-3 space-y-3 text-base leading-8 text-ink">
            {FIELDS.map((field) => (
              <div key={field}>
                <dt className="text-sm font-semibold text-ink/80">{t(`sources.field.${field}`)}</dt>
                <dd>{t(`sources.${source.id}.${field}` satisfies MessageKey)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm">
            <a href={source.url} target="_blank" rel="noreferrer noopener" className="text-ink underline underline-offset-4">
              {t(`sources.${source.id}.linkLabel`)}
            </a>
          </p>
        </InfoSection>
      ))}
    </>
  );
}
