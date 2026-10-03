// Builds data/corpus/{quran,bukhari,muslim}.json, manifest.json, build-report.json and
// data/aliases/surahs.json from the raw downloads in data/raw/. Offline and deterministic
// (only manifest.generatedAt changes between runs). Raw files are never modified.
//
//   npx tsx scripts/build-corpus.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { z } from "zod";
import { normalizeWithMap, UTHMANI_VARIANT_OPTIONS } from "../src/core/normalize/index.js";
import { FawazHadithApiAdapter, type HadithSourceAdapter } from "./lib/hadith-adapter.js";
import { extractMatn } from "./lib/matn.js";
import { reviewStatus as reviewStatusFor, type ReviewFlags } from "./lib/review-status.js";
import {
  CorpusFileSchema,
  HeldFileSchema,
  ReviewedFileSchema,
  SourceRecordSchema,
  type ReviewedFile,
  type SourceRecord,
} from "./lib/schema.js";
import { SURAH_ALTERNATE_NAMES } from "./lib/surah-alternates.js";
import { fileInfo, p, readJson, replaceAutoBlock, sha256, toRanges } from "./lib/util.js";

const QURAN_RAW = "data/raw/quranpedia/mushafs-1.json";
const QURAN_RAW_GZ = "data/raw/quranpedia/mushafs-1.json.gz"; // optional, fetched by verify-raw.ts
// Search-only second text: the same riwayah in Uthmani script (docs/DECISIONS.md D-9). Never displayed.
const QURAN_UTHMANI_RAW = "data/raw/quranpedia/mushafs-2.json";
const QURAN_UTHMANI_RAW_GZ = "data/raw/quranpedia/mushafs-2.json.gz";
const QURAN_MANIFEST = "data/raw/quranpedia/manifest.json";
const QURAN_LICENSE = "data/raw/quranpedia/LICENSE.md";
const REVIEWED = "data/review/reviewed.json";
const HELD = "data/review/held-records.json";
const CORRUPT_CHARS = /[\uFFFC\uFFFD]/; // replacement characters = text damaged upstream

// ---------------------------------------------------------------------------------------------
// Review approvals (default: everything pending)
// ---------------------------------------------------------------------------------------------

const reviewed: ReviewedFile = ReviewedFileSchema.parse(readJson(p(REVIEWED)));
const approvedCollections = new Set(reviewed.collections.map((c) => c.collection));
const approvedRecords = new Set(reviewed.records.map((r) => r.id));
// Records held back after a sample check left a question open (docs/HADITH_FLAGGED_INVESTIGATION.md).
const heldRecords = new Set(HeldFileSchema.parse(readJson(p(HELD))).records.map((r) => r.id));

// forcedPending: a collection-level approval never covers these (missing citation number,
// damaged text, split entries, one text block repeated under several numbers, held records).
// `neverApprovable` cannot be approved per record either.
const reviewStatus = (id: string, collection: string, flags: ReviewFlags): "reviewed" | "pending" =>
  reviewStatusFor(id, collection, { collections: approvedCollections, records: approvedRecords }, flags);

// searchText = exactText at normalization level "search" (docs/ARCHITECTURE.md, "Normalization").
// Quran text keeps the honorific phrases: «رضي الله عنهم» is part of four ayat (docs/DECISIONS.md D-7).
const searchTextOf = (exactText: string, kind: "quran" | "hadith"): string =>
  normalizeWithMap(exactText, "search", { keepHonorificPhrases: kind === "quran" }).norm;

function writeCorpus(collection: string, kind: string, records: SourceRecord[]): void {
  for (const r of records) SourceRecordSchema.parse(r);
  const noSearchText = records.filter((r) => r.searchText === "").map((r) => r.id);
  if (noSearchText.length > 0) throw new Error(`${collection}: empty searchText: ${noSearchText.slice(0, 8).join(", ")}`);
  const ids = new Set(records.map((r) => r.id));
  if (ids.size !== records.length) throw new Error(`${collection}: duplicate record ids`);
  const head = { schemaVersion: 1, collection, kind, recordCount: records.length };
  const body = records.map((r) => JSON.stringify(r)).join(",\n");
  const text = `${JSON.stringify(head).slice(0, -1)},"records":[\n${body}\n]}\n`;
  CorpusFileSchema.parse(JSON.parse(text));
  writeFileSync(p("data/corpus", `${collection}.json`), text);
}

// ---------------------------------------------------------------------------------------------
// Quran (Quranpedia mushaf 1, Hafs)
// ---------------------------------------------------------------------------------------------

const quranRawSchema = <Id extends number>(mushafId: Id) => z.object({
  license: z.object({ source: z.string(), version: z.string() }),
  schema: z.string(),
  data: z.object({
    id: z.literal(mushafId),
    name: z.string(),
    description: z.string(),
    surahs: z.array(
      z.object({
        id: z.number().int(),
        name: z.string().min(1),
        ayahs: z.array(
          z.object({
            number: z.number().int(),
            surah: z.union([z.string(), z.number()]),
            text: z.string(),
            number_in_hafs: z.array(z.number()),
          }),
        ),
      }),
    ),
  }),
});
const QuranRawSchema = quranRawSchema(1);
const QuranUthmaniRawSchema = quranRawSchema(2);

const QuranManifestSchema = z.object({
  version: z.string(),
  generated_at: z.string(),
  source: z.string(),
  files: z.array(z.object({ name: z.string(), bytes: z.number(), built_at: z.string(), sha256: z.string() })),
});

function buildQuran() {
  const raw = QuranRawSchema.parse(readJson(p(QURAN_RAW)));
  const dumpManifest = QuranManifestSchema.parse(readJson(p(QURAN_MANIFEST)));
  const licenseVersion =
    /Version \/ النسخة:\s*(\S+)/.exec(readFileSync(p(QURAN_LICENSE), "utf8"))?.[1] ?? "unknown";
  const fileVersion = raw.license.version;

  // Uthmani-script text of the same ayat, keyed "<surah>:<ayah>". It must cover exactly the ayat
  // of mushaf 1; a missing or extra ayah stops the build.
  const uthmaniRaw = QuranUthmaniRawSchema.parse(readJson(p(QURAN_UTHMANI_RAW)));
  const uthmaniText = new Map<string, string>();
  for (const s of uthmaniRaw.data.surahs) {
    for (const a of s.ayahs) {
      if (String(a.surah) !== String(s.id)) throw new Error(`quran uthmani ${s.id}:${a.number}: surah field mismatch`);
      uthmaniText.set(`${s.id}:${a.number}`, a.text);
    }
  }
  // The two scripts write long vowels and hamza seats differently, so those letters are left out:
  // a difference here is a difference in the remaining letters. Reported, not fatal.
  const skeleton = (norm: string): string => norm.replace(/[اويء ]/g, "");
  const uthmaniOtherLetters: string[] = [];
  let uthmaniEqualsSearchText = 0;

  const records: SourceRecord[] = [];
  const surahs: Array<{ number: number; name: string; ayahCount: number }> = [];
  let ayatWithBom = 0;
  let bomCharsStripped = 0;
  const markCounts = new Map<string, number>();

  for (const s of raw.data.surahs) {
    surahs.push({ number: s.id, name: s.name, ayahCount: s.ayahs.length });
    for (const a of s.ayahs) {
      if (String(a.surah) !== String(s.id)) throw new Error(`quran ${s.id}:${a.number}: surah field mismatch`);
      // AGENTS.md §5: strip the leading BOM (U+FEFF). Nothing else in the text is touched.
      const bom = /^\uFEFF*/.exec(a.text)?.[0].length ?? 0;
      const exactText = a.text.slice(bom);
      if (exactText.includes("\uFEFF")) throw new Error(`quran ${s.id}:${a.number}: non-leading U+FEFF`);
      if (exactText !== exactText.trim()) throw new Error(`quran ${s.id}:${a.number}: edge whitespace`);
      if (bom > 0) ayatWithBom++;
      bomCharsStripped += bom;
      for (const ch of exactText.match(/[ۖ-ۜ۞۩ٰ]/g) ?? []) {
        markCounts.set(ch, (markCounts.get(ch) ?? 0) + 1);
      }
      const id = `quran:${s.id}:${a.number}`;
      const searchText = searchTextOf(exactText, "quran");
      const uthmani = uthmaniText.get(`${s.id}:${a.number}`);
      if (uthmani === undefined) throw new Error(`${id}: no ayah in the Uthmani text (mushaf 2)`);
      const uthmaniSearch = normalizeWithMap(uthmani, "search", UTHMANI_VARIANT_OPTIONS).norm;
      if (uthmaniSearch === "") throw new Error(`${id}: empty Uthmani search variant`);
      if (uthmaniSearch === searchText) uthmaniEqualsSearchText++;
      if (skeleton(uthmaniSearch) !== skeleton(searchText)) uthmaniOtherLetters.push(`${s.id}:${a.number}`);
      records.push({
        id,
        kind: "quran",
        collection: "quran",
        exactText,
        searchText,
        searchVariants: [{ label: "uthmani", text: uthmaniSearch }],
        citation: { display: `${s.name}، الآية ${a.number}`, surah: s.id, ayah: a.number },
        sourceName: `Quranpedia.net — ${raw.data.name} (${raw.data.description})`,
        sourceUrl: "https://quranpedia.net",
        edition: `Quranpedia dump mushafs-1 (mushaf id 1), file version ${fileVersion}, dump manifest ${dumpManifest.version}`,
        license: `Quranpedia.net Data License ${licenseVersion}: free to use; republishing the data requires crediting Quranpedia.net with a link and stating the dump version`,
        reviewStatus: reviewStatus(id, "quran", { forcedPending: false, neverApprovable: false }),
      });
    }
  }
  if (uthmaniText.size !== records.length) throw new Error(`quran: the Uthmani text has ${uthmaniText.size} ayat, mushaf 1 has ${records.length}`);
  writeCorpus("quran", "quran", records);

  const uthmaniEntry = dumpManifest.files.find((f) => f.name === "mushafs-2.json.gz");
  const uthmaniJson = fileInfo(QURAN_UTHMANI_RAW);
  const uthmaniGz = existsSync(p(QURAN_UTHMANI_RAW_GZ)) ? readFileSync(p(QURAN_UTHMANI_RAW_GZ)) : null;

  // Upstream checksum: the manifest hashes the compressed .gz, not the JSON we hold.
  const entry = dumpManifest.files.find((f) => f.name === "mushafs-1.json.gz");
  const localJson = fileInfo(QURAN_RAW);
  let localGz: null | {
    path: string;
    bytes: number;
    sha256: string;
    matchesManifestSha256: boolean;
    decompressedSha256: string;
    decompressedMatchesLocalJson: boolean;
  } = null;
  if (existsSync(p(QURAN_RAW_GZ))) {
    const gz = readFileSync(p(QURAN_RAW_GZ));
    const inflated = sha256(gunzipSync(gz));
    localGz = {
      path: QURAN_RAW_GZ,
      bytes: gz.length,
      sha256: sha256(gz),
      matchesManifestSha256: sha256(gz) === entry?.sha256,
      decompressedSha256: inflated,
      decompressedMatchesLocalJson: inflated === localJson.sha256,
    };
  }

  return {
    records,
    surahs,
    findings: {
      surahCount: surahs.length,
      ayahCount: records.length,
      ayatWithLeadingBom: ayatWithBom,
      bomCharsStripped,
      embeddedMarks: Object.fromEntries(
        [...markCounts].map(([ch, n]) => [`U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`, n]),
      ),
      uthmaniVariant: {
        ayat: uthmaniText.size,
        equalToSearchText: uthmaniEqualsSearchText,
        otherLettersDiffer: uthmaniOtherLetters,
      },
    },
    source: {
      name: "Quranpedia.net — mushaf 1 (Hafs, per King Fahd Complex edition)",
      url: "https://quranpedia.net",
      downloadUrl: "https://api.quranpedia.net/dumps/mushafs-1.json.gz",
      versions: { dumpManifest: dumpManifest.version, fileLicenseVersion: fileVersion, licenseDocument: licenseVersion },
      builtAt: entry?.built_at ?? null,
      license: `Quranpedia.net Data License ${licenseVersion} (${QURAN_LICENSE})`,
      attribution:
        "When republishing the data: credit Quranpedia.net with a link to https://quranpedia.net and state the dump version.",
      numberingScheme: "id = quran:<surah>:<ayah>; Hafs (Kufan) ayah numbering, 6236 ayat.",
      rawFiles: [localJson, fileInfo(QURAN_MANIFEST), fileInfo(QURAN_LICENSE), uthmaniJson],
      // Second text, used only to build searchVariants (label "uthmani"); it is never displayed.
      searchVariantSource: {
        label: "uthmani",
        name: `Quranpedia.net — ${uthmaniRaw.data.name} (${uthmaniRaw.data.description})`,
        downloadUrl: "https://api.quranpedia.net/dumps/mushafs-2.json.gz",
        versions: { dumpManifest: dumpManifest.version, fileLicenseVersion: uthmaniRaw.license.version },
        builtAt: uthmaniEntry?.built_at ?? null,
        normalization: 'level "search" with keepHonorificPhrases and foldHamzaAlef (UTHMANI_VARIANT_OPTIONS)',
        upstreamChecksum: {
          file: "mushafs-2.json.gz",
          sha256: uthmaniEntry?.sha256 ?? null,
          bytes: uthmaniEntry?.bytes ?? null,
          localGz: uthmaniGz && {
            path: QURAN_UTHMANI_RAW_GZ,
            bytes: uthmaniGz.length,
            sha256: sha256(uthmaniGz),
            matchesManifestSha256: sha256(uthmaniGz) === uthmaniEntry?.sha256,
            decompressedMatchesLocalJson: sha256(gunzipSync(uthmaniGz)) === uthmaniJson.sha256,
          },
        },
      },
      upstreamChecksum: {
        file: "mushafs-1.json.gz",
        sha256: entry?.sha256 ?? null,
        bytes: entry?.bytes ?? null,
        covers: "the compressed .gz published by Quranpedia, not the decompressed local JSON",
        localGz,
      },
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Hadith (through the adapter)
// ---------------------------------------------------------------------------------------------

function buildHadith(adapter: HadithSourceAdapter, collection: string) {
  const info = adapter.info(collection);
  const entries = adapter.load(collection);
  const records: SourceRecord[] = [];
  const skippedEmpty: string[] = [];
  const nullNumber: string[] = [];
  const splitEntries: string[] = [];
  const corruptText: string[] = [];
  const matnRules = new Map<string, number>();
  // The source sometimes repeats one text block under several (mostly consecutive) numbers, so
  // the block cannot be pinned to a single citation number.
  const idsByText = new Map<string, string[]>();
  for (const e of entries) {
    if (e.text.trim() === "") continue;
    idsByText.set(e.text, [...(idsByText.get(e.text) ?? []), `${collection}:${e.sourceKey}`]);
  }
  const sharedTextGroups = [...idsByText.values()].filter((ids) => ids.length > 1);
  const sharedTextIds = new Set(sharedTextGroups.flat());

  for (const e of entries) {
    const id = `${collection}:${e.sourceKey}`;
    if (e.text.trim() === "") {
      skippedEmpty.push(e.sourceKey);
      continue;
    }
    const isCorrupt = CORRUPT_CHARS.test(e.text);
    const isSplit = collection === "bukhari" && e.subNumber !== undefined;
    if (e.citationNumber === null) nullNumber.push(e.sourceKey);
    if (isSplit) splitEntries.push(e.sourceKey);
    if (isCorrupt) corruptText.push(e.sourceKey);

    const display =
      e.citationNumber === null
        ? `${info.displayNameAr} (بلا رقم معتمد في البيانات)`
        : `${info.displayNameAr}، حديث رقم ${e.citationNumber}`;
    const matn = isCorrupt ? null : extractMatn(e.text);
    if (matn) matnRules.set(matn.rule, (matnRules.get(matn.rule) ?? 0) + 1);

    records.push({
      id,
      kind: "hadith",
      collection,
      exactText: e.text,
      searchText: searchTextOf(e.text, "hadith"),
      ...(matn ? { matnText: matn.matn } : {}),
      citation: {
        display,
        number: e.citationNumber,
        ...(e.subNumber ? { subNumber: e.subNumber } : {}),
        ...(e.book ? { book: e.book } : {}),
      },
      sourceName: info.sourceName,
      sourceUrl: info.sourceUrl,
      edition: info.edition,
      license: info.license,
      reviewStatus: reviewStatus(id, collection, {
        forcedPending: e.citationNumber === null || isCorrupt || isSplit || sharedTextIds.has(id) || heldRecords.has(id),
        neverApprovable: e.citationNumber === null,
      }),
      // AGENTS.md §6 Sahihayn policy. Withheld when there is no citation number to attribute
      // the grade to (see docs/DECISIONS.md).
      ...(e.citationNumber !== null
        ? { grade: { text: "صحيح", by: info.displayNameAr, sourceRef: display } }
        : {}),
    });
  }
  writeCorpus(collection, "hadith", records);

  return {
    records,
    info,
    findings: {
      rawEntries: entries.length,
      records: records.length,
      skippedEmpty,
      nullCitationNumber: nullNumber,
      splitEntries,
      corruptText,
      sharedTextGroups,
      heldAfterSampleCheck: records.filter((r) => heldRecords.has(r.id)).map((r) => r.id),
      withMatnText: records.filter((r) => r.matnText).length,
      matnRules: Object.fromEntries(matnRules),
      distinctCitationNumbers: new Set(records.map((r) => r.citation.number).filter(Boolean)).size,
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Surah aliases
// ---------------------------------------------------------------------------------------------

// Spellings where the source name differs from the standard written form.
const SURAH_SPELLING_VARIANTS: Record<number, string[]> = { 82: ["الانفطار"], 84: ["الانشقاق"] };

function writeSurahAliases(surahs: Array<{ number: number; name: string; ayahCount: number }>): void {
  const out = {
    note:
      "name and ayahCount come from the Quranpedia mushaf-1 dump. bareName is name without the " +
      "leading «سورة ». spellingVariants and alternateNames are editorial (scripts/lib/), pending " +
      "human review; they are used only to resolve a cited surah, never shown as source text.",
    source: "Quranpedia.net (https://quranpedia.net), dump mushafs-1",
    surahs: surahs.map((s) => ({
      number: s.number,
      name: s.name,
      bareName: s.name.replace(/^سورة\s+/, ""),
      ayahCount: s.ayahCount,
      spellingVariants: SURAH_SPELLING_VARIANTS[s.number] ?? [],
      alternateNames: SURAH_ALTERNATE_NAMES[s.number] ?? [],
    })),
  };
  writeFileSync(p("data/aliases/surahs.json"), `${JSON.stringify(out, null, 2)}\n`);
}

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------

const adapter: HadithSourceAdapter = new FawazHadithApiAdapter();
const quran = buildQuran();
const hadith = adapter.collections.map((c) => buildHadith(adapter, c));
writeSurahAliases(quran.surahs);

const reviewCounts = (records: SourceRecord[]) => ({
  reviewed: records.filter((r) => r.reviewStatus === "reviewed").length,
  pending: records.filter((r) => r.reviewStatus === "pending").length,
});

const corpusFiles = ["quran", ...adapter.collections].map((c) => fileInfo(`data/corpus/${c}.json`));
// The prefix names the corpus format: p0 = searchText empty, p1 = searchText filled,
// p2 = Quran records carry the "uthmani" search variant.
const corpusVersion = `p2-${sha256(corpusFiles.map((f) => f.sha256).join("")).slice(0, 12)}`;

const manifest = {
  manifestVersion: 1,
  corpusVersion,
  generatedAt: new Date().toISOString(),
  coverage: ["quran", ...adapter.collections],
  reviewFile: REVIEWED,
  sources: [
    {
      collection: "quran",
      kind: "quran",
      file: corpusFiles[0],
      counts: { surahs: quran.findings.surahCount, records: quran.findings.ayahCount },
      reviewStatus: { collectionApproved: approvedCollections.has("quran"), ...reviewCounts(quran.records) },
      source: quran.source,
    },
    ...hadith.map((h, i) => ({
      collection: h.info.collection,
      kind: "hadith",
      file: corpusFiles[i + 1],
      counts: {
        rawEntries: h.findings.rawEntries,
        records: h.findings.records,
        skippedEmpty: h.findings.skippedEmpty.length,
        nullCitationNumber: h.findings.nullCitationNumber.length,
        distinctCitationNumbers: h.findings.distinctCitationNumbers,
        withMatnText: h.findings.withMatnText,
      },
      reviewStatus: {
        collectionApproved: approvedCollections.has(h.info.collection),
        ...reviewCounts(h.records),
      },
      source: {
        name: h.info.sourceName,
        adapter: adapter.id,
        url: `https://github.com/${adapter.id}`,
        downloadUrl: h.info.sourceUrl,
        commit: h.info.version,
        license: h.info.license,
        licenseUrl: h.info.licenseUrl,
        attribution: "None required by the license; the source is credited in docs/SOURCES.md.",
        numberingScheme: h.info.numberingScheme,
        gradePolicy:
          "AGENTS.md §6: Sahihayn records carry grade {text: \"صحيح\", by: <collection name>}; withheld when citation.number is null.",
        rawFiles: h.info.rawFiles,
      },
    })),
  ],
};
writeFileSync(p("data/corpus/manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const report = {
  corpusVersion,
  quran: quran.findings,
  ...Object.fromEntries(hadith.map((h) => [h.info.collection, h.findings])),
};
writeFileSync(p("data/corpus/build-report.json"), `${JSON.stringify(report, null, 2)}\n`);

// ---------------------------------------------------------------------------------------------
// Console + docs/SOURCES.md automated block
// ---------------------------------------------------------------------------------------------

const gz = quran.source.upstreamChecksum.localGz;
const uthmani = quran.findings.uthmaniVariant;
const uthmaniSource = quran.source.searchVariantSource;
const uthmaniGzCheck = uthmaniSource.upstreamChecksum.localGz;
const lines: string[] = [
  `_Generated by \`scripts/build-corpus.ts\` — corpus version \`${corpusVersion}\`. Do not edit by hand._`,
  "",
  "| Collection | Raw entries | Records | Skipped (empty) | Null citation no. | With matnText | Reviewed | Pending |",
  "|---|---|---|---|---|---|---|---|",
  `| quran | ${quran.findings.ayahCount} ayat / ${quran.findings.surahCount} surahs | ${quran.records.length} | 0 | — | — | ${reviewCounts(quran.records).reviewed} | ${reviewCounts(quran.records).pending} |`,
  ...hadith.map((h) => {
    const rc = reviewCounts(h.records);
    return `| ${h.info.collection} | ${h.findings.rawEntries} | ${h.findings.records} | ${h.findings.skippedEmpty.length} | ${h.findings.nullCitationNumber.length} | ${h.findings.withMatnText} | ${rc.reviewed} | ${rc.pending} |`;
  }),
  "",
  "**Quran**",
  `- ${quran.findings.ayatWithLeadingBom} ayat started with U+FEFF (BOM); ${quran.findings.bomCharsStripped} such characters were stripped (leading only). No other change to the text.`,
  "- `searchText` = `exactText` at normalization level \"search\" (`src/core/normalize`), filled for every record. Quran records keep honorific phrases (`docs/DECISIONS.md` D-7).",
  `- \`searchVariants\` label "uthmani" = the same ayah in Quranpedia mushaf 2 (\`${QURAN_UTHMANI_RAW}\`, file version \`${uthmaniSource.versions.fileLicenseVersion}\`), normalized with \`UTHMANI_VARIANT_OPTIONS\`. Filled for ${uthmani.ayat} ayat; for search only, never displayed. Equal to \`searchText\` in ${uthmani.equalToSearchText} ayat.`,
  `- Mushaf 2 against mushaf 1, leaving out ا و ي ء and spaces: the remaining letters differ in ${uthmani.otherLettersDiffer.length} ayat (e.g. ${uthmani.otherLettersDiffer.slice(0, 8).join(", ")}). Full list: \`data/corpus/build-report.json\`.`,
  `- Mushaf 2 upstream sha256 \`${uthmaniSource.upstreamChecksum.sha256}\` covers \`mushafs-2.json.gz\`. Local \`.gz\`: ${uthmaniGzCheck ? `matches manifest sha256 = **${uthmaniGzCheck.matchesManifestSha256}**; decompressed content identical to local JSON = **${uthmaniGzCheck.decompressedMatchesLocalJson}**` : "not present"}.`,
  `- Marks embedded in the ayah text (kept in \`exactText\`): ${Object.entries(quran.findings.embeddedMarks).map(([k, v]) => `${k}×${v}`).join(", ")}.`,
  `- Upstream sha256 \`${quran.source.upstreamChecksum.sha256}\` covers \`mushafs-1.json.gz\` (${quran.source.upstreamChecksum.bytes} bytes), not the local JSON.`,
  gz
    ? `- Local \`.gz\` (sha256 \`${gz.sha256}\`, ${gz.bytes} bytes): matches manifest sha256 = **${gz.matchesManifestSha256}**; decompressed content identical to local JSON = **${gz.decompressedMatchesLocalJson}**.`
    : "- No local `.gz` present, so the upstream checksum could not be checked offline (run `npx tsx scripts/verify-raw.ts`).",
  `- Version labels: dump manifest \`${quran.source.versions.dumpManifest}\`, inside the JSON file \`${quran.source.versions.fileLicenseVersion}\`, LICENSE.md \`${quran.source.versions.licenseDocument}\`.`,
  ...hadith.flatMap((h) => [
    "",
    `**${h.info.collection}** (${h.info.edition})`,
    `- Skipped empty texts (${h.findings.skippedEmpty.length}), source hadithnumber: ${toRanges(h.findings.skippedEmpty) || "none"}.`,
    `- Records without a citation number (${h.findings.nullCitationNumber.length}), kept pending, no grade: ${toRanges(h.findings.nullCitationNumber) || "none"}.`,
    `- Split (decimal) source entries (${h.findings.splitEntries.length}): ${h.findings.splitEntries.join(", ") || "none"}.`,
    `- Records containing U+FFFD/U+FFFC (text damaged upstream) (${h.findings.corruptText.length}): ${h.findings.corruptText.join(", ") || "none"}.`,
    `- Same text block repeated under several numbers: ${h.findings.sharedTextGroups.length} groups covering ${h.findings.sharedTextGroups.flat().length} records (e.g. ${h.findings.sharedTextGroups.slice(0, 5).map((g) => g.join(" = ")).join("; ")}). Full list: \`data/corpus/build-report.json\`.`,
    `- Held outside a collection approval after the sample check (${h.findings.heldAfterSampleCheck.length}): ${h.findings.heldAfterSampleCheck.join(", ") || "none"} — reasons in \`data/review/held-records.json\`.`,
    `- Distinct citation numbers: ${h.findings.distinctCitationNumbers}. matnText stored for ${h.findings.withMatnText} records (${Object.entries(h.findings.matnRules).map(([k, v]) => `${k}: ${v}`).join(", ")}).`,
  ]),
];
const wroteDocs = replaceAutoBlock("docs/SOURCES.md", "BUILD", lines.join("\n"));

console.log(`corpus version: ${corpusVersion}`);
console.log(`quran:   ${quran.findings.surahCount} surahs, ${quran.records.length} records`);
for (const h of hadith) {
  const f = h.findings;
  console.log(
    `${h.info.collection.padEnd(8)} ${f.records} records from ${f.rawEntries} raw entries ` +
      `(skipped empty: ${f.skippedEmpty.length}, null citation number: ${f.nullCitationNumber.length}, ` +
      `split: ${f.splitEntries.length}, damaged text: ${f.corruptText.length}, ` +
      `shared text: ${f.sharedTextGroups.flat().length} in ${f.sharedTextGroups.length} groups, matnText: ${f.withMatnText})`,
  );
  console.log(`  skipped empty hadithnumber: ${toRanges(f.skippedEmpty) || "none"}`);
}
console.log(
  `review: ${[quran.records, ...hadith.map((h) => h.records)].flat().filter((r) => r.reviewStatus === "reviewed").length} reviewed, all others pending`,
);
console.log(
  gz
    ? `quran checksum: local .gz matches manifest sha256 = ${gz.matchesManifestSha256}; decompressed = local JSON: ${gz.decompressedMatchesLocalJson}`
    : "quran checksum: manifest sha256 covers mushafs-1.json.gz; no local .gz to verify (run scripts/verify-raw.ts)",
);
console.log(`wrote data/corpus/*.json, data/aliases/surahs.json${wroteDocs ? ", docs/SOURCES.md (AUTO:BUILD)" : ""}`);
