// In-memory search over every adapter's records. It answers two questions about a normalized
// quote: where exactly it occurs, and which records are closest to it. It does not score beyond
// bigram containment, align, diff or decide a status, and it never logs or stores a query (a query
// is draft content, AGENTS.md §2 rule 8). Documented in docs/ARCHITECTURE.md ("Corpus index").
import { normalizeWithMap, tokenize, type NormalizeOptions, type Normalized } from "../normalize";
import type { ContentKind, SourceRecord } from "../types";
import type { SourceAdapter } from "./adapter";

// A layer of one collection. Layers with the same name in two collections are different layers:
// their NormalizeOptions may differ (Quran "default" keeps honorific phrases, hadith "default" does not).
export interface LayerRef {
  collection: string;
  layer: string;
}

export interface LayerInfo extends LayerRef {
  kind: ContentKind;
  options: Readonly<NormalizeOptions>;
}

export interface ExactHit {
  collection: string;
  layer: string;
  // The records the occurrence runs over, in unit order. More than one only inside a unit.
  recordIds: string[];
  records: SourceRecord[];
  // Offsets into the layer text of the first record (start) and of the last record (end, exclusive).
  start: number;
  end: number;
}

export interface Candidate {
  collection: string;
  layer: string;
  record: SourceRecord;
  // |bigrams shared with the record| / |bigrams of the query|, over distinct word bigrams.
  score: number;
}

export interface CorpusIndex {
  layers: readonly LayerInfo[];
  recordCount: number;
  record(id: string): SourceRecord | undefined;
  // The text of a record on a layer: what the offsets of an ExactHit point into.
  layerText(layer: LayerRef, recordId: string): string | undefined;
  // Level "search" with the layer's options: the only way to normalize a query for that layer.
  normalizeFor(layer: LayerRef, text: string): Normalized;
  // Every occurrence of the query on the layer that starts and ends on word boundaries.
  findExact(normQuery: string, layer: LayerRef): ExactHit[];
  // The k records sharing most word bigrams with the query, best first, ties by record id.
  // A query of fewer than two words has no bigrams: the result is [].
  candidates(normQuery: string, layer: LayerRef, k?: number): Candidate[];
}

// Separates units inside a layer's text. Normalized text never contains it, so no hit crosses it.
const UNIT_SEPARATOR = "\n";

interface BuiltLayer {
  info: LayerInfo;
  records: SourceRecord[]; // in unit order
  texts: string[]; // layer text per record
  text: string; // records of a unit joined by " ", units by UNIT_SEPARATOR
  starts: Int32Array; // offset of each record's text in `text`
  position: Map<string, number>; // record id → index in `records`
  bigrams: Map<string, number[]>; // "w1 w2" → ascending record indices
}

const layerKey = (ref: LayerRef): string => `${ref.collection}\u0000${ref.layer}`;

function bigramsOf(words: readonly string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i + 1 < words.length; i++) out.push(`${words[i]} ${words[i + 1]}`);
  return out;
}

function buildLayer(info: LayerInfo, units: SourceRecord[][], textOf: (r: SourceRecord) => string): BuiltLayer {
  const records: SourceRecord[] = [];
  const texts: string[] = [];
  const starts: number[] = [];
  const position = new Map<string, number>();
  const bigrams = new Map<string, number[]>();
  const parts: string[] = [];
  let offset = 0;
  for (const unit of units) {
    if (parts.length > 0) offset += UNIT_SEPARATOR.length;
    const unitTexts: string[] = [];
    for (const record of unit) {
      const text = textOf(record);
      if (text.includes(UNIT_SEPARATOR)) throw new Error(`${record.id}: layer "${info.layer}" text is not normalized`);
      if (unitTexts.length > 0) offset += 1;
      const index = records.length;
      records.push(record);
      texts.push(text);
      starts.push(offset);
      position.set(record.id, index);
      offset += text.length;
      unitTexts.push(text);
      for (const bigram of bigramsOf(tokenize(text))) {
        const posting = bigrams.get(bigram);
        if (!posting) bigrams.set(bigram, [index]);
        else if (posting[posting.length - 1] !== index) posting.push(index);
      }
    }
    parts.push(unitTexts.join(" "));
  }
  return { info, records, texts, text: parts.join(UNIT_SEPARATOR), starts: Int32Array.from(starts), position, bigrams };
}

// Index of the last record whose text starts at or before `offset`.
function recordAt(starts: Int32Array, offset: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid]! <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

const isBoundary = (ch: string | undefined): boolean => ch === undefined || ch === " " || ch === UNIT_SEPARATOR;

export function buildCorpusIndex(adapters: readonly SourceAdapter[]): CorpusIndex {
  const byId = new Map<string, SourceRecord>();
  const built = new Map<string, BuiltLayer>();
  for (const adapter of adapters) {
    const loaded = adapter.load();
    for (const record of loaded) {
      if (byId.has(record.id)) throw new Error(`Duplicate record id ${record.id}`);
      byId.set(record.id, record);
    }
    const units = adapter.units(loaded);
    const grouped = units.reduce((n, unit) => n + unit.length, 0);
    if (grouped !== loaded.length) throw new Error(`${adapter.collection}: units hold ${grouped} records, ${loaded.length} were loaded`);
    for (const layer of adapter.layers) {
      const info: LayerInfo = { collection: adapter.collection, kind: adapter.kind, layer: layer.name, options: layer.options };
      if (built.has(layerKey(info))) throw new Error(`Duplicate layer "${layer.name}" for collection ${adapter.collection}`);
      built.set(layerKey(info), buildLayer(info, units, (r) => layer.text(r)));
    }
  }

  // The message names the layer only, never the query.
  const get = (ref: LayerRef): BuiltLayer => {
    const layer = built.get(layerKey(ref));
    if (!layer) throw new Error(`Unknown layer "${ref.layer}" for collection "${ref.collection}"`);
    return layer;
  };

  return {
    layers: [...built.values()].map((l) => l.info),
    recordCount: byId.size,
    record: (id) => byId.get(id),
    layerText: (ref, recordId) => {
      const layer = get(ref);
      const index = layer.position.get(recordId);
      return index === undefined ? undefined : layer.texts[index];
    },
    normalizeFor: (ref, text) => normalizeWithMap(text, "search", get(ref).info.options),

    findExact(normQuery, ref) {
      const layer = get(ref);
      // Single spaces only: a query that still holds a line break could otherwise span two units.
      const query = tokenize(normQuery).join(" ");
      const hits: ExactHit[] = [];
      if (query === "") return hits;
      const { text, starts, records } = layer;
      for (let at = text.indexOf(query); at !== -1; at = text.indexOf(query, at + 1)) {
        const stop = at + query.length;
        if (!isBoundary(text[at - 1]) || !isBoundary(text[stop])) continue;
        const first = recordAt(starts, at);
        const last = recordAt(starts, stop - 1);
        const span = records.slice(first, last + 1);
        hits.push({
          collection: layer.info.collection,
          layer: layer.info.layer,
          recordIds: span.map((r) => r.id),
          records: span,
          start: at - starts[first]!,
          end: stop - starts[last]!,
        });
      }
      return hits;
    },

    candidates(normQuery, ref, k = 10) {
      const layer = get(ref);
      const queryBigrams = new Set(bigramsOf(tokenize(normQuery)));
      if (queryBigrams.size === 0 || k <= 0) return [];
      const shared = new Map<number, number>();
      for (const bigram of queryBigrams) {
        for (const index of layer.bigrams.get(bigram) ?? []) shared.set(index, (shared.get(index) ?? 0) + 1);
      }
      return [...shared.entries()]
        .map(([index, count]) => ({ record: layer.records[index]!, score: count / queryBigrams.size }))
        .sort((a, b) => b.score - a.score || (a.record.id < b.record.id ? -1 : a.record.id > b.record.id ? 1 : 0))
        .slice(0, k)
        .map(({ record, score }) => ({ collection: layer.info.collection, layer: layer.info.layer, record, score }));
    },
  };
}
