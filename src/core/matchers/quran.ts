// QuranMatcher: where a quote stands in the Quran records. It reports the layer and the spelling
// route of every candidate; whether that ends MATCH is decided in src/core/status.
// Rules: docs/ARCHITECTURE.md ("Quran matcher"), docs/DECISIONS.md D-9, D-10 item 2, D-11.
import type { CorpusIndex, ExactHit, LayerRef } from "../corpus";
import { alignTokens, wordsOf, type Alignment, type Word } from "../diff";
import { stripAttributionPreamble } from "../normalize";
import type { Reference } from "../references";
import type { QuoteInput, SourceRecord } from "../types";
import { layerWords, type LayerWord } from "./layer-words";
import type { MatchCandidate, Matcher, ReferenceCheck } from "./matcher";
import { hasSuperscriptAlef, hasUthmaniSigns, spellsOutSuperscriptAlef } from "./uthmani-spelling";

const KIND = "quran";
const COLLECTION = "quran";
const DEFAULT = "default";
const EVERYDAY = "everyday";
const UTHMANI = "uthmani";
const layerRef = (layer: string): LayerRef => ({ collection: COLLECTION, layer });

// Fuzzy search: how many index candidates are aligned per layer, how many ayat on each side of a
// candidate the alignment may run into, and how many candidates are returned.
const FUZZY_CANDIDATES = 5;
const WINDOW_AYAT = 2;
const MAX_FUZZY_RESULTS = 5;

// Ayah numbers typed between the ayat of a quote («… (1) … (2)»). The Quran text has no digits.
const AYAH_NUMBER = /^\d+$/;

interface QuoteWords {
  norm: string; // normalized for the layer, attribution formula and ayah numbers left out
  words: Word[]; // ranges in the draft
}

function quoteWords(index: CorpusIndex, layer: LayerRef, quote: QuoteInput): QuoteWords {
  const normalized = index.normalizeFor(layer, quote.span.text);
  const from = normalized.norm.length - stripAttributionPreamble(normalized.norm).length;
  const words = wordsOf(normalized, quote.span.text, from, quote.span.start).filter((w) => !AYAH_NUMBER.test(w.key));
  return { norm: words.map((w) => w.key).join(" "), words };
}

const surahOf = (record: SourceRecord): number => record.citation.surah!;
const ayahOf = (record: SourceRecord): number => record.citation.ayah!;

// A cited ayah range must be the range the quote covers, not merely contain or touch it.
function checkReference(reference: Reference | undefined, surah: number, [first, last]: [number, number]): ReferenceCheck {
  if (!reference) return { result: "none" };
  const cited = reference.parsed;
  if (cited.type !== KIND) return { result: "unchecked" };
  // The surah was read even when the ayat were not: a wrong surah is wrong either way.
  if (cited.surah !== surah) return { result: "mismatch", reasonCode: "REF_MISMATCH_SURAH" };
  if (cited.partial) return { result: "unchecked" };
  if (cited.ayahStart === undefined) return { result: "consistent" };
  const agrees = cited.ayahStart === first && (cited.ayahEnd ?? cited.ayahStart) === last;
  return agrees ? { result: "consistent" } : { result: "mismatch", reasonCode: "REF_MISMATCH_AYAH" };
}

// Occurrences that agree with the cited reference first, then the nearest misses.
function referenceRank(check: ReferenceCheck): number {
  if (check.result !== "mismatch") return check.result === "unchecked" ? 1 : 0;
  return check.reasonCode === "REF_MISMATCH_AYAH" ? 2 : 3;
}

function toCandidate(
  quote: QuoteInput,
  records: SourceRecord[],
  found: Pick<MatchCandidate, "layer" | "hit" | "spelling" | "score" | "alignment">,
): MatchCandidate {
  const ayahRange: [number, number] = [ayahOf(records[0]!), ayahOf(records[records.length - 1]!)];
  return {
    kind: KIND,
    collection: COLLECTION,
    recordIds: records.map((r) => r.id),
    records,
    ayahRange,
    ...found,
    reference: checkReference(quote.reference, surahOf(records[0]!), ayahRange),
  };
}

// The layer words an exact hit covers, over all its records.
function stretchOf(index: CorpusIndex, layer: LayerRef, hit: ExactHit): LayerWord[] {
  const last = hit.records.length - 1;
  return hit.records.flatMap((record, i) =>
    layerWords(index, layer, record).filter((w) => (i > 0 || w.at >= hit.start) && (i < last || w.at < hit.end)),
  );
}

// The main search text of the words of exactText that one layer word stands for.
function mainKeysOf(index: CorpusIndex, word: LayerWord): string[] {
  return layerWords(index, layerRef(DEFAULT), index.record(word.recordId)!)
    .filter((w) => w.start < word.end && w.end > word.start)
    .map((w) => w.key);
}

// A quote that equals the "uthmani" layer, word for word. Whether it may match there is decided
// per word: a word that reads as the main text does needs no bridge; every other word must be in
// Uthmani script and spelt as the mushaf spells it (./uthmani-spelling.ts). One word that is not
// makes the candidate a spelling error. Such a word is then compared as the main text reads it,
// on both sides, so the word diff shows exactly the misspelt words as differences.
function uthmaniCandidate(quote: QuoteInput, index: CorpusIndex, hit: ExactHit, words: Word[], stretch: LayerWord[]): MatchCandidate {
  const main = layerRef(DEFAULT);
  const inUthmaniScript = hasUthmaniSigns(quote.span.text);
  const quoteSide: Word[] = [];
  const sourceSide: LayerWord[] = [];
  let misspelt = 0;
  stretch.forEach((layerWord, i) => {
    const word = words[i]!;
    const written = quote.span.text.slice(word.start - quote.span.start, word.end - quote.span.start);
    const asWritten = index.normalizeFor(main, written).norm;
    const mainKeys = mainKeysOf(index, layerWord);
    const asTheMushaf =
      asWritten === mainKeys.join(" ") ||
      ((inUthmaniScript || hasSuperscriptAlef(written)) && !spellsOutSuperscriptAlef(written, mainKeys.join("")));
    if (!asTheMushaf) misspelt++;
    quoteSide.push(asTheMushaf ? word : { ...word, key: asWritten });
    sourceSide.push(asTheMushaf ? layerWord : { ...layerWord, key: mainKeys.join(" ") });
  });
  return toCandidate(quote, hit.records, {
    layer: UTHMANI,
    hit: "exact",
    spelling: misspelt === 0 ? "bridged" : "error",
    score: (words.length - misspelt) / words.length,
    alignment: { quote: quoteSide, source: sourceSide },
  });
}

// Every place the quote occurs word for word, each on the first layer that finds it there:
// "default", then "everyday" (an approved spelling), then "uthmani". A place is where the stretch
// starts in exactText, so the same occurrence found on two layers is one candidate (D-10 item 2).
function exactCandidates(quote: QuoteInput, index: CorpusIndex): MatchCandidate[] {
  const places = new Set<string>();
  const found: MatchCandidate[] = [];
  for (const layerName of [DEFAULT, EVERYDAY, UTHMANI]) {
    const layer = layerRef(layerName);
    const { norm, words } = quoteWords(index, layer, quote);
    for (const hit of index.findExact(norm, layer)) {
      const stretch = stretchOf(index, layer, hit);
      const place = `${stretch[0]!.recordId}@${stretch[0]!.start}`;
      if (places.has(place)) continue;
      places.add(place);
      found.push(
        layerName === UTHMANI
          ? uthmaniCandidate(quote, index, hit, words, stretch)
          : toCandidate(quote, hit.records, {
              layer: layerName,
              hit: "exact",
              spelling: layerName === DEFAULT ? "same" : "bridged",
              score: 1,
              alignment: { quote: words, source: stretch },
            }),
      );
    }
  }
  // A misspelt occurrence matters only when the quote is found nowhere as it stands.
  const accepted = found.filter((c) => c.spelling !== "error");
  return (accepted.length > 0 ? accepted : found).sort(inMushafOrder);
}

const inMushafOrder = (a: MatchCandidate, b: MatchCandidate): number =>
  surahOf(a.records[0]!) - surahOf(b.records[0]!) ||
  ayahOf(a.records[0]!) - ayahOf(b.records[0]!) ||
  a.alignment.source[0]!.start - b.alignment.source[0]!.start;

interface Aligned {
  layer: string;
  order: number; // position of the layer in the search order
  score: number;
  alignment: Alignment;
  records: SourceRecord[];
  // Where the stretch stands: [ayah, offset in exactText] of its start and end.
  from: [number, number];
  to: [number, number];
}

const before = (a: [number, number], b: [number, number]): boolean => a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]);
const samePlace = (a: Aligned, b: Aligned): boolean =>
  surahOf(a.records[0]!) === surahOf(b.records[0]!) && !before(a.to, b.from) && !before(b.to, a.from);

function fuzzyCandidates(quote: QuoteInput, index: CorpusIndex, layers: readonly string[]): MatchCandidate[] {
  const found: Aligned[] = [];
  layers.forEach((layerName, order) => {
    const layer = layerRef(layerName);
    const { norm, words } = quoteWords(index, layer, quote);
    const keys = words.map((w) => w.key);
    for (const { record } of index.candidates(norm, layer, FUZZY_CANDIDATES)) {
      const window: LayerWord[] = [];
      for (let ayah = ayahOf(record) - WINDOW_AYAT; ayah <= ayahOf(record) + WINDOW_AYAT; ayah++) {
        const neighbour = index.record(`${COLLECTION}:${surahOf(record)}:${ayah}`);
        if (neighbour) window.push(...layerWords(index, layer, neighbour));
      }
      const local = alignTokens(
        keys,
        window.map((w) => w.key),
        "local",
      );
      if (local.matched === 0) continue;
      const source = window.slice(local.bStart, local.bEnd);
      const records = [...new Set(source.map((w) => w.recordId))].map((id) => index.record(id)!);
      const first = source[0]!;
      const last = source[source.length - 1]!;
      found.push({
        layer: layerName,
        order,
        score: local.matched / keys.length,
        alignment: { quote: words, source },
        records,
        from: [ayahOf(records[0]!), first.start],
        to: [ayahOf(records[records.length - 1]!), last.end],
      });
    }
  });
  // Best first; equal scores by layer order, then by place in the mushaf. Windows of neighbouring
  // candidates overlap, so the same place is found several times: only its best reading is kept.
  found.sort(
    (a, b) =>
      b.score - a.score ||
      a.order - b.order ||
      surahOf(a.records[0]!) - surahOf(b.records[0]!) ||
      a.from[0] - b.from[0] ||
      a.from[1] - b.from[1],
  );
  const kept: Aligned[] = [];
  for (const candidate of found) {
    if (!kept.some((other) => samePlace(candidate, other))) kept.push(candidate);
  }
  return kept.slice(0, MAX_FUZZY_RESULTS).map((c) =>
    toCandidate(quote, c.records, {
      layer: c.layer,
      hit: "fuzzy",
      spelling: c.layer === DEFAULT ? "same" : "bridged",
      score: c.score,
      alignment: c.alignment,
    }),
  );
}

const byReference = (candidates: MatchCandidate[]): MatchCandidate[] =>
  candidates
    .map((candidate, i) => ({ candidate, i }))
    .sort((a, b) => referenceRank(a.candidate.reference) - referenceRank(b.candidate.reference) || a.i - b.i)
    .map(({ candidate }) => candidate);

export const quranMatcher: Matcher = {
  kind: KIND,
  match(quote, index) {
    if (!index.layers.some((l) => l.collection === COLLECTION)) return [];
    if (quoteWords(index, layerRef(DEFAULT), quote).words.length === 0) return [];
    const exact = exactCandidates(quote, index);
    if (exact.length > 0) return byReference(exact);
    // Close candidates are never a match, so here any mushaf mark is enough to try "uthmani" too.
    const fromMushaf = hasUthmaniSigns(quote.span.text) || hasSuperscriptAlef(quote.span.text);
    return fuzzyCandidates(quote, index, fromMushaf ? [DEFAULT, EVERYDAY, UTHMANI] : [DEFAULT, EVERYDAY]);
  },
};
