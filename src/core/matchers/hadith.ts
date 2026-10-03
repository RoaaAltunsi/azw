// HadithMatcher: where a quote stands in the records of the hadith collections. It reports what it
// found and how the cited reference compares with it; whether that ends MATCH is decided in
// src/core/status. It adds no grade: a grade is only ever read from a record.
// Rules: docs/ARCHITECTURE.md ("Hadith matcher"), docs/DECISIONS.md D-22.
import type { CorpusIndex, ExactHit, LayerRef } from "../corpus";
import { alignTokens, wordsOf, type Alignment, type Word } from "../diff";
import { stripAttributionPreamble } from "../normalize";
import type { Reference } from "../references";
import type { QuoteInput, SourceRecord } from "../types";
import { wordsOnLayer, type LayerWord } from "./layer-words";
import type { MatchCandidate, Matcher, ReferenceCheck } from "./matcher";

const KIND = "hadith";
const DEFAULT = "default";

// «قال الله تعالى» before a text is the claim of a verse, and also a form of citing a hadith qudsi
// (D-20 item 9, D-22 item 2). ﴿…﴾ claims a verse and nothing else.
const DIVINE_SPEECH_CLAIM = "quran";

// Fuzzy search: how many index candidates are aligned per collection, and how many are returned.
const FUZZY_CANDIDATES = 10;
const MAX_FUZZY_RESULTS = 5;
// A record is a close candidate only when at least this many words of the quote stand in it in
// order. Records are long and hold the chain, so two neighbouring words of almost any sentence
// stand in some record: sharing them shows nothing (D-22 item 9).
const MIN_MATCHED_WORDS = 3;

const UNCHECKED: ReferenceCheck = { result: "unchecked" };

// The search layer of every hadith collection the index holds, in corpus order.
const layersOf = (index: CorpusIndex): LayerRef[] =>
  index.layers.filter((l) => l.kind === KIND && l.layer === DEFAULT).map(({ collection, layer }) => ({ collection, layer }));

interface QuoteWords {
  norm: string; // normalized for the layer, attribution formula left out
  words: Word[]; // ranges in the draft
}

function quoteWords(index: CorpusIndex, layer: LayerRef, quote: QuoteInput): QuoteWords {
  const normalized = index.normalizeFor(layer, quote.span.text);
  const from = normalized.norm.length - stripAttributionPreamble(normalized.norm).length;
  const words = wordsOf(normalized, quote.span.text, from, quote.span.start);
  return { norm: words.map((w) => w.key).join(" "), words };
}

// Where the quote was found, by collection: what a reference that names several books, or
// another book, is compared with.
interface Found {
  exact: boolean;
  searched: ReadonlySet<string>; // the collections the tool has a copy of
  held: Set<string>; // those with a record that holds the quote
  reviewed: Set<string>; // those with a reviewed record that holds it
}

function foundIn(records: readonly SourceRecord[], searched: ReadonlySet<string>, exact: boolean): Found {
  const found: Found = { exact, searched, held: new Set(), reviewed: new Set() };
  for (const record of records) {
    found.held.add(record.collection);
    if (record.reviewStatus === "reviewed") found.reviewed.add(record.collection);
  }
  return found;
}

// «007» and «7» are one number. Nothing else is bridged: the number is compared with
// citation.number, the numbering the corpus cites by (docs/SOURCES.md).
const sameNumber = (cited: string, source: string): boolean => cited.replace(/^0+(?=\d)/, "") === source.replace(/^0+(?=\d)/, "");

// The cited reference against one record that holds the quote (D-22 item 1).
function checkReference(reference: Reference | undefined, record: SourceRecord, found: Found): ReferenceCheck {
  if (!reference) return { result: "none" };
  const cited = reference.parsed;
  if (cited.type !== KIND) return UNCHECKED;
  // A book the tool has no copy of: what is cited to it can be neither confirmed nor contradicted.
  if (cited.collections.some((c) => !found.searched.has(c))) return UNCHECKED;
  // The collection was read even when the rest was not: another book is another book either way.
  if (!cited.collections.includes(record.collection)) return { result: "mismatch", reasonCode: "REF_MISMATCH_COLLECTION" };
  if (cited.partial) return UNCHECKED;
  // Several books cited («متفق عليه»): each must hold the quote. Close candidates are the best few
  // only, so there a missing book proves nothing.
  if (cited.collections.some((c) => !found.held.has(c))) return found.exact ? { result: "mismatch", reasonCode: "REF_NOT_AGREED_UPON" } : UNCHECKED;
  const number = cited.number ?? cited.numbers?.[record.collection];
  if (number !== undefined) {
    if (record.citation.number == null) return UNCHECKED;
    if (!sameNumber(number, record.citation.number)) return { result: "mismatch", reasonCode: "REF_MISMATCH_NUMBER" };
  }
  // A pending record holds the text but confirms nothing: a cited book counts as confirmed only
  // through a reviewed record.
  return cited.collections.every((c) => found.reviewed.has(c)) ? { result: "consistent" } : UNCHECKED;
}

// Occurrences that agree with the cited reference first, then the nearest misses.
const MISMATCH_RANK: Readonly<Record<string, number>> = { REF_MISMATCH_NUMBER: 2, REF_NOT_AGREED_UPON: 3, REF_MISMATCH_COLLECTION: 4 };
function referenceRank(check: ReferenceCheck): number {
  if (check.result !== "mismatch") return check.result === "unchecked" ? 1 : 0;
  return MISMATCH_RANK[check.reasonCode] ?? 5;
}

const byReference = (candidates: MatchCandidate[]): MatchCandidate[] =>
  candidates
    .map((candidate, i) => ({ candidate, i }))
    .sort((a, b) => referenceRank(a.candidate.reference) - referenceRank(b.candidate.reference) || a.i - b.i)
    .map(({ candidate }) => candidate);

interface Place {
  record: SourceRecord;
  hit: MatchCandidate["hit"];
  score: number;
  // Built when it is read. A short quote stands in hundreds of records, and only the few that
  // are shown need their words.
  align: () => Alignment;
}

function toCandidates(quote: QuoteInput, places: readonly Place[], found: Found): MatchCandidate[] {
  const claimAdmitted = quote.claimedKind === DIVINE_SPEECH_CLAIM && !quote.verseMarks;
  return places.map(({ record, hit, score, align }) => {
    let alignment: Alignment | undefined;
    return {
      kind: KIND,
      collection: record.collection,
      recordIds: [record.id],
      records: [record],
      score,
      layer: DEFAULT,
      hit,
      spelling: "same",
      reference: checkReference(quote.reference, record, found),
      ...(claimAdmitted ? { claimAdmitted } : {}),
      get alignment() {
        return (alignment ??= align());
      },
    };
  });
}

// The layer words an exact hit covers.
const stretchOf = (index: CorpusIndex, layer: LayerRef, hit: ExactHit): LayerWord[] =>
  wordsOnLayer(index, layer, hit.records[0]!).filter((w) => w.at >= hit.start && w.at < hit.end);

// Every record that holds the quote word for word, once: collections in corpus order, records in
// source order. A second occurrence inside the same record is the same place.
function exactPlaces(quote: QuoteInput, index: CorpusIndex, layers: readonly LayerRef[]): Place[] {
  const places: Place[] = [];
  for (const layer of layers) {
    const { norm, words } = quoteWords(index, layer, quote);
    const seen = new Set<string>();
    for (const hit of index.findExact(norm, layer)) {
      const record = hit.records[0]!;
      if (seen.has(record.id)) continue;
      seen.add(record.id);
      places.push({ record, hit: "exact", score: 1, align: () => ({ quote: words, source: stretchOf(index, layer, hit) }) });
    }
  }
  return places;
}

// The closest records by word bigrams, each aligned with the quote (Smith-Waterman on words). Best
// first; equal scores keep the corpus order of the collections and the index's order inside one.
function fuzzyPlaces(quote: QuoteInput, index: CorpusIndex, layers: readonly LayerRef[]): Place[] {
  const places: Place[] = [];
  for (const layer of layers) {
    const { norm, words } = quoteWords(index, layer, quote);
    const keys = words.map((w) => w.key);
    for (const { record } of index.candidates(norm, layer, FUZZY_CANDIDATES)) {
      const source = wordsOnLayer(index, layer, record);
      const local = alignTokens(
        keys,
        source.map((w) => w.key),
        "local",
      );
      if (local.matched < MIN_MATCHED_WORDS) continue;
      const alignment = { quote: words, source: source.slice(local.bStart, local.bEnd) };
      places.push({ record, hit: "fuzzy", score: local.matched / keys.length, align: () => alignment });
    }
  }
  return places
    .map((place, i) => ({ place, i }))
    .sort((a, b) => b.place.score - a.place.score || a.i - b.i)
    .slice(0, MAX_FUZZY_RESULTS)
    .map(({ place }) => place);
}

export const hadithMatcher: Matcher = {
  kind: KIND,
  match(quote, index) {
    const layers = layersOf(index);
    if (layers.length === 0) return [];
    if (quoteWords(index, layers[0]!, quote).words.length === 0) return [];
    const searched = new Set(layers.map((l) => l.collection));
    const exact = exactPlaces(quote, index, layers);
    const places = exact.length > 0 ? exact : fuzzyPlaces(quote, index, layers);
    const found = foundIn(
      places.map((p) => p.record),
      searched,
      exact.length > 0,
    );
    const candidates = toCandidates(quote, places, found);
    return exact.length > 0 ? byReference(candidates) : candidates;
  },
};
