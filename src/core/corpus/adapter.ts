// SourceAdapter: describes one collection to the CorpusIndex, so that the index never branches on
// a kind or a collection. No I/O here: records and lists arrive already loaded.
// Documented in docs/ARCHITECTURE.md ("Corpus index").
import { normalizeWithMap, tokenize, UTHMANI_VARIANT_OPTIONS, type NormalizeOptions } from "../normalize";
import type { ContentKind, SourceRecord } from "../types";
import type { QuranSpellingVariant } from "./schema";

// One normalized text per record, for retrieval only: never displayed, never diffed, never cited.
export interface SearchLayer {
  name: string;
  // What a query must be normalized with (level "search") to be compared with this layer.
  options: Readonly<NormalizeOptions>;
  text(record: SourceRecord): string;
}

export interface SourceAdapter {
  kind: ContentKind;
  collection: string;
  load(): SourceRecord[];
  // Groups the loaded records into units, in reading order. The index joins the records of one
  // unit, so a quote that runs over several records of a unit is one hit; it never joins two units.
  units(records: readonly SourceRecord[]): SourceRecord[][];
  layers: readonly SearchLayer[];
}

const DEFAULT_LAYER = "default";
const QURAN_OPTIONS: Readonly<NormalizeOptions> = { keepHonorificPhrases: true };

// Hadith: one unit per record, one layer.
export function createHadithAdapter(collection: string, records: readonly SourceRecord[]): SourceAdapter {
  return {
    kind: "hadith",
    collection,
    load: () => [...records],
    units: (loaded) => loaded.map((r) => [r]),
    layers: [{ name: DEFAULT_LAYER, options: {}, text: (r) => r.searchText }],
  };
}

const ayahKey = (r: SourceRecord): string => `${r.citation.surah}:${r.citation.ayah}`;

// The "everyday" text of every ayah the list names: searchText with each sourceForm replaced by
// its everydayForm, as whole words. Throws when the list names an ayah or a word that is not in
// the records: the list and the corpus are then out of step.
function everydayTexts(records: readonly SourceRecord[], variants: readonly QuranSpellingVariant[]): Map<string, string> {
  const norm = (form: string): string => normalizeWithMap(form, "search", QURAN_OPTIONS).norm;
  const pairsByAyah = new Map<string, Map<string, string>>();
  for (const v of variants) {
    for (const ayah of v.ayat) {
      const pairs = pairsByAyah.get(ayah) ?? new Map<string, string>();
      pairs.set(norm(v.sourceForm), norm(v.everydayForm));
      pairsByAyah.set(ayah, pairs);
    }
  }
  const byAyah = new Map(records.map((r) => [ayahKey(r), r]));
  const texts = new Map<string, string>();
  for (const [ayah, pairs] of pairsByAyah) {
    const record = byAyah.get(ayah);
    if (!record) throw new Error(`Quran spelling list names ayah ${ayah}, which is not in the records`);
    const words = tokenize(record.searchText);
    for (const source of pairs.keys()) {
      if (!words.includes(source)) throw new Error(`Quran spelling list: «${source}» is not a word of ayah ${ayah}`);
    }
    texts.set(record.id, words.map((w) => pairs.get(w) ?? w).join(" "));
  }
  return texts;
}

// Quran: one unit per surah with its ayat in order, three layers (docs/DECISIONS.md D-9).
// The adapter only names the layers. Whether a hit on "uthmani" or "everyday" may end MATCH is a
// status rule, not decided here.
export function createQuranAdapter(records: readonly SourceRecord[], spellingVariants: readonly QuranSpellingVariant[]): SourceAdapter {
  const everyday = everydayTexts(records, spellingVariants);
  return {
    kind: "quran",
    collection: "quran",
    load: () => [...records],
    units: (loaded) => {
      const surahs = new Map<number, SourceRecord[]>();
      for (const r of loaded) {
        const { surah, ayah } = r.citation;
        if (surah === undefined || ayah === undefined) throw new Error(`Quran record ${r.id} has no surah or ayah`);
        const unit = surahs.get(surah) ?? [];
        unit.push(r);
        surahs.set(surah, unit);
      }
      return [...surahs.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, unit]) => unit.sort((a, b) => a.citation.ayah! - b.citation.ayah!));
    },
    layers: [
      { name: DEFAULT_LAYER, options: QURAN_OPTIONS, text: (r) => r.searchText },
      {
        name: "uthmani",
        options: UTHMANI_VARIANT_OPTIONS,
        text: (r) => {
          const variant = r.searchVariants?.find((v) => v.label === "uthmani");
          if (!variant) throw new Error(`Quran record ${r.id} has no "uthmani" search variant`);
          return variant.text;
        },
      },
      // Derived here from the owner-approved list, never written to data/corpus. Ayat the list
      // does not name keep their searchText, so a unit is still one continuous text.
      { name: "everyday", options: QURAN_OPTIONS, text: (r) => everyday.get(r.id) ?? r.searchText },
    ],
  };
}
