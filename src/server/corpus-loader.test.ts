import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { getKindMeta, type LayerRef } from "../core/corpus";
import { ALPHA_FIXTURE, QURAN_FIXTURE, SPELLING_FIXTURE } from "../core/corpus/test-fixtures";
import { tokenize } from "../core/normalize";
import type { SourceRecord } from "../core/types";
import { loadCorpus, type LoadedCorpus } from "./corpus-loader";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

// --- a small corpus on disk, for the failure cases ---------------------------------------------
const tmpRoots: string[] = [];
afterAll(() => {
  for (const dir of tmpRoots) rmSync(dir, { recursive: true, force: true });
});

interface FixtureOptions {
  // Applied to a corpus file after its sha256 went into the manifest.
  tamper?: (path: string) => void;
  // Applied to the corpus file object before it is written and hashed.
  editFile?: (file: { recordCount: number; records: SourceRecord[]; kind: string }) => void;
  editManifest?: (manifest: { coverage: string[]; sources: Array<{ kind: string; counts: { records: number }; file: { path: string } }> }) => void;
  skip?: string;
}

function writeCorpus(options: FixtureOptions = {}): string {
  const root = mkdtempSync(join(tmpdir(), "azw-corpus-"));
  tmpRoots.push(root);
  const write = (path: string, content: string): void => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  const sources = [
    { collection: "quran", kind: "quran", records: QURAN_FIXTURE },
    { collection: "alpha", kind: "hadith", records: ALPHA_FIXTURE },
  ].map(({ collection, kind, records }) => {
    const file = { schemaVersion: 1, collection, kind, recordCount: records.length, records: [...records] };
    if (collection === "alpha") options.editFile?.(file);
    const content = JSON.stringify(file);
    const path = `data/corpus/${collection}.json`;
    if (path !== options.skip) write(path, content);
    return {
      collection,
      kind,
      file: { path, bytes: Buffer.byteLength(content), sha256: createHash("sha256").update(content).digest("hex") },
      counts: { records: records.length },
    };
  });
  const manifest = { manifestVersion: 1, corpusVersion: "fixture-1", coverage: ["quran", "alpha"], sources };
  options.editManifest?.(manifest);
  write("data/corpus/manifest.json", JSON.stringify(manifest));
  write("data/aliases/surahs.json", JSON.stringify({ surahs: [{ number: 2, bareName: "البقرة", spellingVariants: [], alternateNames: [] }] }));
  write("data/aliases/collections.json", JSON.stringify({ entries: [{ collections: ["alpha"], names: ["ألفا"], phrases: [] }] }));
  write("data/aliases/quran-spelling-variants.json", JSON.stringify({ approvedBy: "fixture", approvedAt: "2026-10-03", variants: SPELLING_FIXTURE }));
  if (options.tamper) options.tamper(join(root, "data/corpus/alpha.json"));
  return root;
}

describe("loader on a small corpus", () => {
  test("loads the files the manifest lists and returns one entry point", () => {
    const loaded = loadCorpus(writeCorpus());
    expect(loaded.corpusVersion).toBe("fixture-1");
    expect(loaded.coverage).toEqual(["quran", "alpha"]);
    expect(loaded.index.recordCount).toBe(QURAN_FIXTURE.length + ALPHA_FIXTURE.length);
    expect(loaded.index.layers.map((l) => `${l.collection}/${l.layer}`)).toEqual(["quran/default", "quran/uthmani", "quran/everyday", "alpha/default"]);
    expect(loaded.aliases.surahs[0]?.bareName).toBe("البقرة");
    expect(loaded.aliases.collections[0]?.collections).toEqual(["alpha"]);
    // The spelling list reached the Quran adapter.
    expect(loaded.index.layerText({ collection: "quran", layer: "everyday" }, "quran:7:56")).toContain("رحمه الله");
  });

  test("reviewStatus is read from the record, not recomputed", () => {
    const { index } = loadCorpus(writeCorpus());
    expect(index.record("alpha:3")?.reviewStatus).toBe("pending");
    expect(index.record("alpha:2")?.reviewStatus).toBe("reviewed");
  });

  test("the built corpus is cached per root", () => {
    const root = writeCorpus();
    const first = loadCorpus(root);
    rmSync(join(root, "data"), { recursive: true });
    expect(loadCorpus(root)).toBe(first);
  });

  test("throws when a corpus file's sha256 differs from the manifest", () => {
    const root = writeCorpus({ tamper: (path) => writeFileSync(path, `${readFileSync(path, "utf8")}\n`) });
    expect(() => loadCorpus(root)).toThrow(/sha256 of data\/corpus\/alpha\.json differs/);
  });

  test("throws when recordCount differs from the manifest", () => {
    // The file is consistent with itself and its sha256 is the manifest's; only the count differs.
    const root = writeCorpus({ editManifest: (m) => void (m.sources[1]!.counts.records += 1) });
    expect(() => loadCorpus(root)).toThrow(/the manifest says 5/);
  });

  test("throws when recordCount differs from the number of records", () => {
    const root = writeCorpus({ editFile: (file) => void (file.recordCount -= 1) });
    expect(() => loadCorpus(root)).toThrow(/holds 4 records, its recordCount is 3/);
  });

  test("throws when a corpus file is missing", () => {
    expect(() => loadCorpus(writeCorpus({ skip: "data/corpus/alpha.json" }))).toThrow(/cannot read data\/corpus\/alpha\.json/);
  });

  test("throws when a record does not match the schema", () => {
    const root = writeCorpus({ editFile: (file) => void (file.records[0] = { ...file.records[0]!, exactText: "" }) });
    expect(() => loadCorpus(root)).toThrow(/does not match its schema/);
  });

  test("throws when a file's kind differs from the manifest, or a record's from its file", () => {
    expect(() => loadCorpus(writeCorpus({ editFile: (file) => void (file.kind = "dua") }))).toThrow(/the manifest says hadith/);
    const root = writeCorpus({ editFile: (file) => void (file.records[1] = { ...file.records[1]!, collection: "beta" }) });
    expect(() => loadCorpus(root)).toThrow(/alpha:2 .* belongs to another collection or kind/);
  });

  test("throws when a kind has no adapter", () => {
    const root = writeCorpus({
      editFile: (file) => {
        file.kind = "dua";
        file.records = file.records.map((r) => ({ ...r, kind: "dua" }));
      },
      editManifest: (m) => void (m.sources[1]!.kind = "dua"),
    });
    expect(() => loadCorpus(root)).toThrow(/no adapter for kind "dua"/);
  });

  test("throws when coverage names a collection without a file", () => {
    expect(() => loadCorpus(writeCorpus({ editManifest: (m) => void m.coverage.push("muslim") }))).toThrow(/coverage/);
  });

  test("throws when the manifest is missing or is not valid", () => {
    const missing = writeCorpus();
    rmSync(join(missing, "data/corpus/manifest.json"));
    expect(() => loadCorpus(missing)).toThrow(/cannot read data\/corpus\/manifest\.json/);
    const broken = writeCorpus();
    writeFileSync(join(broken, "data/corpus/manifest.json"), "{");
    expect(() => loadCorpus(broken)).toThrow(/manifest\.json is not valid JSON/);
    const wrong = writeCorpus();
    writeFileSync(join(wrong, "data/corpus/manifest.json"), JSON.stringify({ manifestVersion: 1 }));
    expect(() => loadCorpus(wrong)).toThrow(/manifest\.json does not match its schema/);
  });

  test("a failed load is not cached", () => {
    const root = writeCorpus({ skip: "data/corpus/alpha.json" });
    expect(() => loadCorpus(root)).toThrow();
    expect(() => loadCorpus(root)).toThrow();
  });

  test("an alias file that fails validation stops the load", () => {
    const root = writeCorpus();
    writeFileSync(join(root, "data/aliases/quran-spelling-variants.json"), JSON.stringify({ variants: [] }));
    expect(() => loadCorpus(root)).toThrow(/quran-spelling-variants\.json does not match/);
  });
});

// --- the real corpus -----------------------------------------------------------------------------
describe("the real corpus", () => {
  let corpus: LoadedCorpus;
  const Q: LayerRef = { collection: "quran", layer: "default" };
  const Q_UTHMANI: LayerRef = { collection: "quran", layer: "uthmani" };
  const Q_EVERYDAY: LayerRef = { collection: "quran", layer: "everyday" };
  const BUKHARI: LayerRef = { collection: "bukhari", layer: "default" };
  const MUSLIM: LayerRef = { collection: "muslim", layer: "default" };
  const ids = (layer: LayerRef, text: string): string[][] =>
    corpus.index.findExact(corpus.index.normalizeFor(layer, text).norm, layer).map((h) => h.recordIds);
  const record = (id: string): SourceRecord => {
    const found = corpus.index.record(id);
    if (!found) throw new Error(`${id} is not in the corpus`);
    return found;
  };

  beforeAll(() => {
    corpus = loadCorpus(ROOT);
  }, 60_000);

  // The fixture ayat are typed by hand. This ties them to the source, so that the unit tests do
  // not rest on text from memory.
  test("the Quran test fixture agrees with the corpus", () => {
    for (const fixture of QURAN_FIXTURE) {
      expect(fixture.searchText, fixture.id).toBe(record(fixture.id).searchText);
    }
    for (const id of ["quran:2:153", "quran:2:154"]) {
      const typed = QURAN_FIXTURE.find((r) => r.id === id)?.searchVariants?.[0]?.text;
      expect(typed, id).toBe(corpus.index.layerText(Q_UTHMANI, id));
    }
  });

  test("matches the manifest", () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, "data/corpus/manifest.json"), "utf8")) as {
      corpusVersion: string;
      coverage: string[];
      sources: Array<{ counts: { records: number } }>;
    };
    expect(corpus.corpusVersion).toBe(manifest.corpusVersion);
    expect(corpus.coverage).toEqual(manifest.coverage);
    expect(corpus.index.recordCount).toBe(manifest.sources.reduce((n, s) => n + s.counts.records, 0));
    expect(corpus.index.layers.map((l) => `${l.collection}/${l.layer}`)).toEqual(["quran/default", "quran/uthmani", "quran/everyday", "bukhari/default", "muslim/default"]);
    expect(corpus.aliases.surahs).toHaveLength(114);
    expect(corpus.aliases.collections.some((e) => e.collections.includes("bukhari"))).toBe(true);
  });

  test("a whole ayah, from its diacritized source text", () => {
    const hits = corpus.index.findExact(corpus.index.normalizeFor(Q, record("quran:2:255").exactText).norm, Q);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ recordIds: ["quran:2:255"], start: 0, end: record("quran:2:255").searchText.length });
  });

  test("part of an ayah", () => {
    expect(ids(Q, "الحي القيوم لا تأخذه سنة ولا نوم")).toEqual([["quran:2:255"]]);
  });

  test("a quote spanning 2:153 into 2:154 is one hit", () => {
    expect(ids(Q, "إن الله مع الصابرين ولا تقولوا لمن يقتل في سبيل الله أموات")).toEqual([["quran:2:153", "quran:2:154"]]);
  });

  test("no hit across the end of al-Fatiha and the start of al-Baqara", () => {
    expect(ids(Q, "ولا الضالين").some((h) => h[0] === "quran:1:7")).toBe(true);
    expect(ids(Q, "ولا الضالين الم")).toEqual([]);
  });

  test("no hit on a partial word", () => {
    expect(ids(Q, "الرحمن الرحيم").length).toBeGreaterThan(1);
    expect(ids(Q, "رحمن الرحيم")).toEqual([]);
  });

  test("a hadith fragment in the middle of a record", () => {
    const hits = corpus.index.findExact(corpus.index.normalizeFor(BUKHARI, "إنما الأعمال بالنيات").norm, BUKHARI);
    const hit = hits.find((h) => h.recordIds[0] === "bukhari:1");
    expect(hit?.start).toBeGreaterThan(0);
    expect(hit?.end).toBeLessThan(record("bukhari:1").searchText.length);
  });

  test("2:154 through uthmani with «ولاكن», through default with «ولكن», each missing on the other", () => {
    expect(ids(Q_UTHMANI, "بل أحياء ولاكن لا تشعرون")).toEqual([["quran:2:154"]]);
    expect(ids(Q, "بل أحياء ولاكن لا تشعرون")).toEqual([]);
    expect(ids(Q, "بل أحياء ولكن لا تشعرون")).toEqual([["quran:2:154"]]);
    expect(ids(Q_UTHMANI, "بل أحياء ولكن لا تشعرون")).toEqual([]);
  });

  test("an Uthmani-script paste is found through the uthmani layer", () => {
    expect(ids(Q_UTHMANI, "ذَٰلِكَ ٱلۡكِتَٰبُ لَا رَيۡبَۛ فِيهِۛ هُدٗى لِّلۡمُتَّقِينَ")).toEqual([["quran:2:2"]]);
  });

  test("«رحمة» is found through everyday in 7:56, which the list names for «رحمت»", () => {
    expect(ids(Q_EVERYDAY, "إن رحمة الله قريب من المحسنين")).toEqual([["quran:7:56"]]);
    expect(ids(Q, "إن رحمة الله قريب من المحسنين")).toEqual([]);
  });

  test("«لعنت» is bridged in 3:61 and not in 7:38, which the list does not name", () => {
    expect(ids(Q_EVERYDAY, "فنجعل لعنة الله على الكاذبين")).toEqual([["quran:3:61"]]);
    expect(ids(Q_EVERYDAY, "كلما دخلت أمة لعنة أختها")).toEqual([]);
    expect(ids(Q_EVERYDAY, "كلما دخلت أمة لعنت أختها")).toEqual([["quran:7:38"]]);
  });

  test("a text the source repeats under several numbers returns every record", () => {
    expect(record("bukhari:272").searchText).toBe(record("bukhari:273").searchText);
    const found = corpus.index.findExact(record("bukhari:272").searchText, BUKHARI).map((h) => h.recordIds[0]);
    expect(found).toEqual(expect.arrayContaining(["bukhari:272", "bukhari:273"]));
  });

  test("a hadith in both collections is found in each", () => {
    expect(ids(MUSLIM, "بني الإسلام على خمس").length).toBeGreaterThan(0);
    expect(ids(BUKHARI, "بني الإسلام على خمس").length).toBeGreaterThan(0);
  });

  test("a pending record is returned, with reviewStatus pending", () => {
    const muslim = JSON.parse(readFileSync(join(ROOT, "data/corpus/muslim.json"), "utf8")) as { records: SourceRecord[] };
    const target = muslim.records.find((r) => r.reviewStatus === "pending" && tokenize(r.searchText).length > 30);
    expect(target).toBeDefined();
    const fragment = tokenize(target!.searchText).slice(5, 25).join(" ");
    const hit = corpus.index.findExact(fragment, MUSLIM).find((h) => h.recordIds[0] === target!.id);
    expect(hit?.records[0]?.reviewStatus).toBe("pending");
  });

  test("candidates: an ayah with one word changed ranks its ayah first, the same on every run", () => {
    const norm = corpus.index.normalizeFor(Q, "يا أيها الذين آمنوا استعينوا بالصبر والصلاة إن الله مع المتقين").norm;
    expect(corpus.index.findExact(norm, Q)).toEqual([]);
    const runs = Array.from({ length: 3 }, () => corpus.index.candidates(norm, Q).map((c) => `${c.record.id}=${c.score}`));
    expect(runs[0]![0]).toBe("quran:2:153=0.9");
    expect(runs[0]).toHaveLength(10);
    expect(runs[1]).toEqual(runs[0]);
    expect(runs[2]).toEqual(runs[0]);
    expect(corpus.index.candidates("الله", Q)).toEqual([]);
  });

  test("kindMeta: every record's kind is registered, and no number is invented", () => {
    const muslim = JSON.parse(readFileSync(join(ROOT, "data/corpus/muslim.json"), "utf8")) as { records: SourceRecord[] };
    const unnumbered = muslim.records.filter((r) => r.citation.number === null);
    expect(unnumbered.length).toBeGreaterThan(0);
    for (const r of unnumbered) expect(getKindMeta(r.kind)!.citationFormatter(r)).not.toMatch(/[0-9٠-٩]/);
    for (const l of corpus.index.layers) expect(getKindMeta(l.kind)).toBeDefined();
  });
});
