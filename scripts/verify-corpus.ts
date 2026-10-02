// Offline integrity checks for data/corpus. Exits non-zero on any failed check.
//
//   npx tsx scripts/verify-corpus.ts
import { readFileSync } from "node:fs";
import { CorpusFileSchema, HeldFileSchema, ReviewedFileSchema, type SourceRecord } from "./lib/schema.js";
import { p, readJson, sha256 } from "./lib/util.js";

const EXPECTED_SURAHS = 114;
const EXPECTED_AYAT = 6236;
// Standard range of both numbering schemes; a number outside it is a data error.
const NUMBER_RANGE: Record<string, [number, number]> = { bukhari: [1, 7563], muslim: [1, 3033] };

let failures = 0;
function check(ok: boolean, label: string, detail?: string): void {
  console.log(`${ok ? "OK  " : "FAIL"} ${label}${!ok && detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}
const info = (label: string): void => console.log(`     ${label}`);
const sample = (items: string[]): string => `${items.slice(0, 8).join(", ")}${items.length > 8 ? " …" : ""}`;

function load(collection: string): SourceRecord[] {
  const parsed = CorpusFileSchema.safeParse(readJson(p(`data/corpus/${collection}.json`)));
  check(parsed.success, `${collection}: file matches the corpus schema`, parsed.success ? "" : parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  if (!parsed.success) return [];
  const { records, recordCount } = parsed.data;
  check(records.length === recordCount, `${collection}: recordCount equals number of records (${records.length})`);
  check(records.every((r) => r.collection === collection), `${collection}: every record belongs to the collection`);
  return records;
}

function commonChecks(collection: string, records: SourceRecord[]): void {
  const empty = records.filter((r) => r.exactText.trim() === "").map((r) => r.id);
  check(empty.length === 0, `${collection}: exactText is non-empty for every record`, sample(empty));
  const ids = new Set(records.map((r) => r.id));
  check(ids.size === records.length, `${collection}: ids are unique`, `${records.length - ids.size} duplicate(s)`);
  const withSearch = records.filter((r) => r.searchText !== "").length;
  info(`searchText: ${withSearch} filled, ${records.length - withSearch} empty (empty is allowed in this phase)`);
}

const allIds = new Set<string>();
const reviewedIds = new Set<string>();
const allRecords: SourceRecord[] = [];
const totals: Array<{ collection: string; records: number; reviewed: number; pending: number }> = [];
const tally = (collection: string, records: SourceRecord[]): void => {
  allRecords.push(...records);
  for (const r of records) {
    allIds.add(r.id);
    if (r.reviewStatus === "reviewed") reviewedIds.add(r.id);
  }
  const reviewed = records.filter((r) => r.reviewStatus === "reviewed").length;
  totals.push({ collection, records: records.length, reviewed, pending: records.length - reviewed });
};

// --- Quran -----------------------------------------------------------------------------------
{
  const records = load("quran");
  commonChecks("quran", records);
  const bySurah = new Map<number, number[]>();
  const badRef: string[] = [];
  for (const r of records) {
    const { surah, ayah } = r.citation;
    if (surah === undefined || ayah === undefined || r.id !== `quran:${surah}:${ayah}` || r.kind !== "quran") {
      badRef.push(r.id);
      continue;
    }
    bySurah.set(surah, [...(bySurah.get(surah) ?? []), ayah]);
  }
  check(badRef.length === 0, "quran: every id equals quran:<citation.surah>:<citation.ayah>", sample(badRef));
  check(bySurah.size === EXPECTED_SURAHS && [...bySurah.keys()].every((s, i) => s === i + 1), `quran: ${EXPECTED_SURAHS} surahs numbered 1–114 in order (found ${bySurah.size})`);
  check(records.length === EXPECTED_AYAT, `quran: ${EXPECTED_AYAT} ayat (found ${records.length})`);
  const gaps = [...bySurah].filter(([, ayat]) => !ayat.every((a, i) => a === i + 1)).map(([s]) => String(s));
  check(gaps.length === 0, "quran: ayah numbers run 1..n without gaps in every surah", sample(gaps));
  const stray = records.filter((r) => r.exactText.includes("\uFEFF")).map((r) => r.id);
  check(stray.length === 0, "quran: no U+FEFF (BOM) left in exactText", sample(stray));

  const aliases = readJson(p("data/aliases/surahs.json")) as { surahs: Array<{ number: number; ayahCount: number }> };
  check(
    aliases.surahs.length === EXPECTED_SURAHS && aliases.surahs.every((s) => bySurah.get(s.number)?.length === s.ayahCount),
    "aliases: surahs.json lists 114 surahs with ayah counts equal to the corpus",
  );
  tally("quran", records);
}

// --- Hadith ----------------------------------------------------------------------------------
for (const collection of ["bukhari", "muslim"]) {
  const records = load(collection);
  commonChecks(collection, records);
  const [min, max] = NUMBER_RANGE[collection]!;

  const badId: string[] = [];
  const badNumber: string[] = [];
  const badSub: string[] = [];
  const badGrade: string[] = [];
  const badMatn: string[] = [];
  const nullNotPending: string[] = [];
  let nullNumbers = 0;
  let previousKey = -Infinity;
  let ordered = true;

  for (const r of records) {
    const key = r.id.slice(collection.length + 1);
    if (r.kind !== "hadith" || !r.id.startsWith(`${collection}:`) || !/^\d+(\.\d+)?$/.test(key)) badId.push(r.id);
    if (Number(key) <= previousKey) ordered = false;
    previousKey = Number(key);

    const { number, subNumber } = r.citation;
    if (number === undefined) badNumber.push(r.id);
    else if (number === null) {
      nullNumbers++;
      if (r.reviewStatus !== "pending") nullNotPending.push(r.id);
      if (r.grade || subNumber) badGrade.push(r.id);
    } else {
      if (!/^[1-9]\d*$/.test(number) || Number(number) < min || Number(number) > max) badNumber.push(r.id);
      if (subNumber !== undefined && (!/^\d+(\.\d+)?$/.test(subNumber) || subNumber.split(".")[0] !== number)) badSub.push(r.id);
      if (!r.grade || r.grade.text !== "صحيح" || r.grade.sourceRef !== r.citation.display) badGrade.push(r.id);
      // Bukhari: the id carries the source hadithnumber, whose integer part is the citation number.
      if (collection === "bukhari" && (subNumber ?? number) !== key) badSub.push(r.id);
      // Muslim: the id is the source running number; every numbered record keeps its full arabicnumber.
      if (collection === "muslim" && (subNumber === undefined || !/^\d+$/.test(key))) badSub.push(r.id);
    }
    if (r.matnText !== undefined && !r.exactText.includes(r.matnText)) badMatn.push(r.id);
  }

  check(badId.length === 0, `${collection}: ids are ${collection}:<source hadithnumber>`, sample(badId));
  check(ordered, `${collection}: records are in ascending source order`);
  check(badNumber.length === 0, `${collection}: citation.number is null or an integer within ${min}–${max}`, sample(badNumber));
  check(badSub.length === 0, `${collection}: citation.subNumber is consistent with citation.number and the id`, sample(badSub));
  check(nullNotPending.length === 0, `${collection}: records without a citation number are pending`, sample(nullNotPending));
  check(badGrade.length === 0, `${collection}: grade present (صحيح, attributed) exactly when a citation number exists`, sample(badGrade));
  check(badMatn.length === 0, `${collection}: every matnText is a verbatim substring of exactText`, sample(badMatn));

  if (collection === "muslim") {
    const subs = records.map((r) => r.citation.subNumber).filter((s): s is string => s !== undefined);
    check(new Set(subs).size === subs.length, "muslim: full arabicnumber (subNumber) values are unique");
  }

  const cited = new Set(records.map((r) => r.citation.number).filter((n): n is string => typeof n === "string"));
  const missing: number[] = [];
  for (let n = min; n <= max; n++) if (!cited.has(String(n))) missing.push(n);
  info(`citation numbers: ${cited.size} distinct of ${max - min + 1} in ${min}–${max}; ${missing.length} not present in the corpus${missing.length ? ` (e.g. ${missing.slice(0, 12).join(", ")}${missing.length > 12 ? " …" : ""})` : ""}`);
  info(`null citation number: ${nullNumbers}; with matnText: ${records.filter((r) => r.matnText).length}`);
  tally(collection, records);
}

// --- Cross-file ------------------------------------------------------------------------------
{
  const total = totals.reduce((n, t) => n + t.records, 0);
  check(allIds.size === total, `all collections: ids are globally unique (${total})`);

  const manifest = readJson(p("data/corpus/manifest.json")) as {
    corpusVersion: string;
    sources: Array<{
      collection: string;
      file: { path: string; sha256: string };
      counts: { records: number };
      reviewStatus: { reviewed: number; pending: number };
      source: { rawFiles: Array<{ path: string; sha256: string }> };
    }>;
  };
  for (const s of manifest.sources) {
    const t = totals.find((x) => x.collection === s.collection);
    const actual = sha256(readFileSync(p(s.file.path)));
    check(actual === s.file.sha256, `manifest: sha256 of ${s.file.path} matches`);
    check(t?.records === s.counts.records && t.reviewed === s.reviewStatus.reviewed && t.pending === s.reviewStatus.pending, `manifest: counts and review status for ${s.collection} match the corpus`);
    // Raw files must be the bytes the corpus was built from (catches edits and line-ending conversion).
    const changedRaw = s.source.rawFiles.filter((f) => sha256(readFileSync(p(f.path))) !== f.sha256).map((f) => f.path);
    check(changedRaw.length === 0, `manifest: raw files of ${s.collection} have the recorded sha256`, sample(changedRaw));
  }

  const reviewed = ReviewedFileSchema.parse(readJson(p("data/review/reviewed.json")));
  const unknown = reviewed.records.map((r) => r.id).filter((id) => !allIds.has(id));
  check(unknown.length === 0, "review: every approved record id exists in the corpus", sample(unknown));
  const held = HeldFileSchema.parse(readJson(p("data/review/held-records.json"))).records.map((r) => r.id);
  const approvedIds = new Set(reviewed.records.map((r) => r.id));
  const heldBad = held.filter((id) => !allIds.has(id) || (reviewedIds.has(id) && !approvedIds.has(id)));
  check(heldBad.length === 0, `review: the ${held.length} held records exist and are not marked reviewed by a collection approval`, sample(heldBad));
  // Re-derived from the corpus alone, independently of the build: a record may be "reviewed" only
  // through its own approval, or through its collection's approval when nothing excludes it.
  const approved = new Set(reviewed.collections.map((c) => c.collection));
  const heldIds = new Set(held);
  const textCount = new Map<string, number>();
  for (const r of allRecords) {
    const key = `${r.collection}\n${r.exactText}`;
    textCount.set(key, (textCount.get(key) ?? 0) + 1);
  }
  const excludedFromCollectionApproval = (r: SourceRecord): boolean =>
    r.kind === "hadith" &&
    (r.citation.number == null ||
      /[￼�]/.test(r.exactText) ||
      r.id.includes(".") ||
      textCount.get(`${r.collection}\n${r.exactText}`)! > 1 ||
      heldIds.has(r.id));
  const wronglyReviewed = allRecords
    .filter((r) => r.reviewStatus === "reviewed")
    .filter((r) =>
      r.kind === "hadith" && r.citation.number == null
        ? true
        : !approvedIds.has(r.id) && (!approved.has(r.collection) || excludedFromCollectionApproval(r)),
    )
    .map((r) => r.id);
  check(
    wronglyReviewed.length === 0,
    "review: every reviewed record is approved in data/review/reviewed.json and not excluded (no number, damaged, split, shared text, held)",
    sample(wronglyReviewed),
  );

  console.log(`\ncorpus version ${manifest.corpusVersion}`);
  console.log("collection   records  reviewed  pending");
  for (const t of totals) console.log(`${t.collection.padEnd(12)} ${String(t.records).padStart(7)}  ${String(t.reviewed).padStart(8)}  ${String(t.pending).padStart(7)}`);
  console.log(`${"total".padEnd(12)} ${String(total).padStart(7)}`);
}

console.log(failures === 0 ? "\nverify-corpus: all checks passed" : `\nverify-corpus: ${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
