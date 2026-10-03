// Loads data/corpus and data/aliases from disk and builds the CorpusIndex. Server-only, and the
// only runtime code that touches fs: src/core receives everything already loaded.
// Every failure throws. A partly loaded corpus must never serve requests.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  buildCorpusIndex,
  CollectionAliasFileSchema,
  CorpusFileSchema,
  CorpusManifestSchema,
  createHadithAdapter,
  createQuranAdapter,
  QuranSpellingVariantsSchema,
  SurahAliasFileSchema,
  type CorpusFile,
  type CorpusIndex,
  type CorpusManifest,
  type QuranSpellingVariant,
  type SourceAdapter,
} from "../core/corpus";
import type { ReferenceAliases } from "../core/references";

export interface LoadedCorpus {
  index: CorpusIndex;
  corpusVersion: string;
  coverage: string[];
  aliases: ReferenceAliases;
}

const MANIFEST_PATH = "data/corpus/manifest.json";
const SURAHS_PATH = "data/aliases/surahs.json";
const COLLECTIONS_PATH = "data/aliases/collections.json";
const SPELLING_PATH = "data/aliases/quran-spelling-variants.json";

// One adapter factory per kind. A corpus file of a kind without a factory is refused.
const adapterFactories: Record<string, (file: CorpusFile, lists: { spelling: QuranSpellingVariant[] }) => SourceAdapter> = {
  quran: (file, lists) => createQuranAdapter(file.records, lists.spelling),
  hadith: (file) => createHadithAdapter(file.collection, file.records),
};

export interface RawCorpus {
  manifest: unknown;
  files: Array<{ path: string; sha256: string; json: unknown }>;
  surahs: unknown;
  collections: unknown;
  spelling: unknown;
}

export interface ValidatedCorpus {
  manifest: CorpusManifest;
  files: CorpusFile[];
  aliases: ReferenceAliases;
  spelling: QuranSpellingVariant[];
}

function parseJson(root: string, path: string): { json: unknown; sha256: string } {
  let buffer: Buffer;
  try {
    buffer = readFileSync(join(root, path));
  } catch (cause) {
    throw new Error(`Corpus loader: cannot read ${path}`, { cause });
  }
  try {
    return { json: JSON.parse(buffer.toString("utf8")), sha256: createHash("sha256").update(buffer).digest("hex") };
  } catch (cause) {
    throw new Error(`Corpus loader: ${path} is not valid JSON`, { cause });
  }
}

function validate<T>(schema: z.ZodType<T>, json: unknown, path: string): T {
  const parsed = schema.safeParse(json);
  if (parsed.success) return parsed.data;
  const issues = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`);
  throw new Error(`Corpus loader: ${path} does not match its schema (${issues.join("; ")})`);
}

// Step 1: read and parse. The manifest names the corpus files, so only its file paths are read here.
export function readCorpus(root: string): RawCorpus {
  const manifest = parseJson(root, MANIFEST_PATH).json;
  const { sources } = validate(CorpusManifestSchema, manifest, MANIFEST_PATH);
  return {
    manifest,
    files: sources.map((s) => ({ path: s.file.path, ...parseJson(root, s.file.path) })),
    surahs: parseJson(root, SURAHS_PATH).json,
    collections: parseJson(root, COLLECTIONS_PATH).json,
    spelling: parseJson(root, SPELLING_PATH).json,
  };
}

// Step 2: every file against its schema, and every corpus file against the manifest.
export function validateCorpus(raw: RawCorpus): ValidatedCorpus {
  const manifest = validate(CorpusManifestSchema, raw.manifest, MANIFEST_PATH);
  const files = manifest.sources.map((source, i) => {
    const { path, sha256, json } = raw.files[i]!;
    if (sha256 !== source.file.sha256) throw new Error(`Corpus loader: sha256 of ${path} differs from the manifest`);
    const file = validate(CorpusFileSchema, json, path);
    if (file.recordCount !== source.counts.records || file.records.length !== file.recordCount) {
      throw new Error(`Corpus loader: ${path} holds ${file.records.length} records, its recordCount is ${file.recordCount}, the manifest says ${source.counts.records}`);
    }
    if (file.collection !== source.collection || file.kind !== source.kind) {
      throw new Error(`Corpus loader: ${path} is ${file.kind}/${file.collection}, the manifest says ${source.kind}/${source.collection}`);
    }
    const stray = file.records.find((r) => r.collection !== file.collection || r.kind !== file.kind);
    if (stray) throw new Error(`Corpus loader: record ${stray.id} in ${path} belongs to another collection or kind`);
    return file;
  });
  const collections = new Set(files.map((f) => f.collection));
  const uncovered = manifest.coverage.filter((c) => !collections.has(c));
  if (uncovered.length > 0 || collections.size !== manifest.coverage.length) {
    throw new Error(`Corpus loader: manifest coverage [${manifest.coverage.join(", ")}] differs from its corpus files [${[...collections].join(", ")}]`);
  }
  return {
    manifest,
    files,
    aliases: {
      surahs: validate(SurahAliasFileSchema, raw.surahs, SURAHS_PATH).surahs,
      collections: validate(CollectionAliasFileSchema, raw.collections, COLLECTIONS_PATH).entries,
    },
    spelling: validate(QuranSpellingVariantsSchema, raw.spelling, SPELLING_PATH).variants,
  };
}

// Step 3: adapters and index.
export function buildCorpus(corpus: ValidatedCorpus): LoadedCorpus {
  const adapters = corpus.files.map((file) => {
    const factory = Object.hasOwn(adapterFactories, file.kind) ? adapterFactories[file.kind] : undefined;
    if (!factory) throw new Error(`Corpus loader: no adapter for kind "${file.kind}" (${file.collection})`);
    return factory(file, { spelling: corpus.spelling });
  });
  return {
    index: buildCorpusIndex(adapters),
    corpusVersion: corpus.manifest.corpusVersion,
    coverage: [...corpus.manifest.coverage],
    aliases: corpus.aliases,
  };
}

// One load per root and server instance. A failed load is not cached: the next call throws again.
const cache = new Map<string, LoadedCorpus>();

export function loadCorpus(root: string = process.cwd()): LoadedCorpus {
  const cached = cache.get(root);
  if (cached) return cached;
  const loaded = buildCorpus(validateCorpus(readCorpus(root)));
  cache.set(root, loaded);
  return loaded;
}
