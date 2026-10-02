// Spot-checks a random sample of hadith records against the Dorar hadith API (dorar.net).
// Dorar is a live keyword search, not our corpus: a missing or different search result is NOT
// proof that our data is wrong. Outcomes other than CONFIRMED are flagged for human review.
//
//   npx tsx scripts/verify-hadith-dorar.ts [--per-collection 30] [--seed 20261002] [--offline]
//
// API documentation: https://dorar.net/article/389 (endpoint dorar_api.json?skey=<query>).
// The `s[]=<book id>` filter is the Dorar site-search parameter; article 389 does not document it.
// Requests: at most one every two seconds, cached in data/raw/dorar-cache/ (gitignored — Dorar
// content is all rights reserved, so its texts are never written to tracked files).
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { CorpusFileSchema, type SourceRecord } from "./lib/schema.js";
import { p, readJson, replaceAutoBlock } from "./lib/util.js";

const ENDPOINT = "https://dorar.net/dorar_api.json";
const CACHE_DIR = "data/raw/dorar-cache";
const MIN_INTERVAL_MS = 2000;
const QUERY_WORDS = 8;
const MIN_MATN_WORDS = 5; // shorter matns make the keyword search too ambiguous
const SIMILARITY_THRESHOLD = 0.8;

const COLLECTIONS: Record<string, { dorarSource: string; dorarBookId: string }> = {
  bukhari: { dorarSource: "صحيح البخاري", dorarBookId: "6216" },
  muslim: { dorarSource: "صحيح مسلم", dorarBookId: "3088" },
};

const args = process.argv.slice(2);
const argValue = (name: string, fallback: number): number => {
  const i = args.indexOf(name);
  const v = i >= 0 ? Number(args[i + 1]) : fallback;
  if (!Number.isInteger(v) || v <= 0) throw new Error(`${name} needs a positive integer`);
  return v;
};
const PER_COLLECTION = argValue("--per-collection", 30);
const SEED = argValue("--seed", 20261002);
const OFFLINE = args.includes("--offline");

// --- Comparison-only text folding (not the project's normalization) --------------------------
function fold(text: string): string[] {
  return text
    .replace(/[ً-ْٰـ\u200E\u200F]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^ء-ي\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}
const queryWords = (text: string): string[] =>
  text.replace(/[ً-ْٰـ\u200E\u200F]/g, "").replace(/[^ء-ي\s]/g, " ").split(/\s+/).filter(Boolean);

// Share of our matn's words found, in order, in the Dorar text (longest common subsequence).
function containment(ours: string[], theirs: string[]): number {
  if (ours.length === 0) return 0;
  let prev = new Array<number>(theirs.length + 1).fill(0);
  for (const a of ours) {
    const row = [0];
    for (let j = 1; j <= theirs.length; j++) {
      row.push(a === theirs[j - 1] ? prev[j - 1]! + 1 : Math.max(prev[j]!, row[j - 1]!));
    }
    prev = row;
  }
  return prev[theirs.length]! / ours.length;
}

// --- Seeded sampling -------------------------------------------------------------------------
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function sampleRecords(pool: SourceRecord[], n: number, seed: number): SourceRecord[] {
  const rand = mulberry32(seed);
  const items = [...pool];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items.slice(0, n);
}

// --- Dorar client (rate-limited, cached) ------------------------------------------------------
let lastRequestAt = 0;
let networkRequests = 0;

async function dorarSearch(query: string, bookId: string): Promise<{ html: string } | { error: string }> {
  const url = `${ENDPOINT}?skey=${encodeURIComponent(query)}&s[]=${bookId}`;
  const cachePath = p(CACHE_DIR, `${createHash("sha1").update(url).digest("hex")}.json`);
  if (existsSync(cachePath)) {
    return { html: (JSON.parse(readFileSync(cachePath, "utf8")) as { html: string }).html };
  }
  if (OFFLINE) return { error: "not cached (offline mode)" };

  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
  networkRequests++;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "azw-corpus-verifier/0.1 (hadith data spot-check; 1 request per 2s)", Accept: "application/json" },
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const body = (await res.json()) as { ahadith?: { result?: unknown } };
    const html = body.ahadith?.result;
    if (typeof html !== "string") return { error: "unexpected response shape" };
    writeFileSync(cachePath, JSON.stringify({ url, fetchedAt: new Date().toISOString(), html }));
    return { html };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

interface DorarResult {
  text: string;
  source: string;
  number: string;
  muhaddith: string;
  grade: string;
}

const untag = (html: string): string =>
  html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

function parseDorar(html: string): DorarResult[] {
  const results: DorarResult[] = [];
  const blocks = html.split(/<div class="hadith"[^>]*>/).slice(1);
  for (const block of blocks) {
    const [textHtml = "", infoHtml = ""] = block.split(/<div class="hadith-info">/);
    const field = (label: string): string => {
      const m = new RegExp(`${label}:\\s*</span>([\\s\\S]*?)(?=<span class="info-subtitle">|</div>|$)`).exec(infoHtml);
      return m?.[1] ? untag(m[1]) : "";
    };
    results.push({
      text: untag(textHtml).replace(/^\d+\s*-\s*/, ""),
      source: field("المصدر"),
      number: field("الصفحة أو الرقم"),
      muhaddith: field("المحدث"),
      grade: field("خلاصة حكم المحدث"),
    });
  }
  return results;
}

// --- Verification ----------------------------------------------------------------------------
type Verdict = "CONFIRMED" | "NUMBER_DIFFERS" | "TEXT_DIFFERS" | "INCONCLUSIVE" | "ERROR";

interface Finding {
  id: string;
  citationNumber: string;
  subNumber?: string;
  verdict: Verdict;
  queries: string[];
  sameCollectionResults: number;
  bestSimilarity: number | null;
  /** Dorar numbers of same-collection results whose text matches our matn. */
  dorarNumbersForMatchingText: string[];
  /** Dorar's own grade line for the confirmed result, quoted for reference only. */
  dorarGrade?: string;
  /** Set when Dorar's grade line for the confirmed result is not the grade our record carries. */
  gradeDiffers?: true;
  note: string;
}

async function verifyRecord(record: SourceRecord, collection: string): Promise<Finding> {
  const cfg = COLLECTIONS[collection]!;
  const number = record.citation.number!;
  const matn = record.matnText!;
  const ours = fold(matn);
  const words = queryWords(matn);
  // Second query (only if the first is not conclusive): the last words of the matn.
  const queries = [words.slice(0, QUERY_WORDS).join(" ")];
  if (words.length > QUERY_WORDS) queries.push(words.slice(-QUERY_WORDS).join(" "));

  const base = { id: record.id, citationNumber: number, ...(record.citation.subNumber ? { subNumber: record.citation.subNumber } : {}) };
  const used: string[] = [];
  const candidates: Array<DorarResult & { similarity: number }> = [];
  const errors: string[] = [];
  const wantSource = fold(cfg.dorarSource).join(" ");

  for (const query of queries) {
    used.push(query);
    const res = await dorarSearch(query, cfg.dorarBookId);
    if ("error" in res) {
      errors.push(res.error);
      continue;
    }
    for (const r of parseDorar(res.html)) {
      if (fold(r.source).join(" ") !== wantSource) continue;
      candidates.push({ ...r, similarity: containment(ours, fold(r.text)) });
    }
    if (candidates.some((c) => c.number === number && c.similarity >= SIMILARITY_THRESHOLD)) break;
  }

  const matching = candidates.filter((c) => c.similarity >= SIMILARITY_THRESHOLD);
  const sameNumber = candidates.filter((c) => c.number === number).sort((a, b) => b.similarity - a.similarity);
  const best = candidates.reduce<number | null>((m, c) => (m === null || c.similarity > m ? c.similarity : m), null);
  const common = {
    ...base,
    queries: used,
    sameCollectionResults: candidates.length,
    bestSimilarity: best === null ? null : Math.round(best * 100) / 100,
    dorarNumbersForMatchingText: [...new Set(matching.map((c) => c.number))],
  };

  const confirmed = sameNumber.find((c) => c.similarity >= SIMILARITY_THRESHOLD);
  if (confirmed) {
    // The verdict covers number and matn only. A Dorar grade line that is not our record's grade
    // (e.g. «[معلق]» against «صحيح») is reported for the owner; this script decides nothing about it.
    const gradeDiffers = record.grade !== undefined && confirmed.grade.replace(/[[\]\s]/g, "") !== record.grade.text;
    return {
      ...common,
      verdict: "CONFIRMED",
      dorarGrade: confirmed.grade,
      ...(gradeDiffers ? { gradeDiffers } : {}),
      note: `Dorar lists the same matn under ${cfg.dorarSource} no. ${number}.${gradeDiffers ? ` Its grade line there reads «${confirmed.grade}»; our record carries «${record.grade!.text}» — needs review.` : ""}`,
    };
  }
  if (matching.length > 0) {
    return { ...common, verdict: "NUMBER_DIFFERS", note: `Dorar shows this matn in ${cfg.dorarSource} under no. ${common.dorarNumbersForMatchingText.join(", ")}, not ${number}. May be a repeated narration or a numbering difference — needs review.` };
  }
  if (sameNumber[0]) {
    return { ...common, verdict: "TEXT_DIFFERS", note: `Dorar has ${cfg.dorarSource} no. ${number} in the results, but only ${Math.round(sameNumber[0].similarity * 100)}% of our matn words appear in its text — needs review.` };
  }
  if (candidates.length === 0 && errors.length > 0) {
    return { ...common, verdict: "ERROR", note: `Request failed: ${errors.join("; ")}.` };
  }
  return { ...common, verdict: "INCONCLUSIVE", note: `No ${cfg.dorarSource} result in the first page of Dorar results matched the matn. Not evidence of an error.` };
}

// --- Main ------------------------------------------------------------------------------------
mkdirSync(p(CACHE_DIR), { recursive: true });
const manifest = readJson(p("data/corpus/manifest.json")) as { corpusVersion: string };
const report: Record<string, { eligible: number; total: number; findings: Finding[] }> = {};

for (const collection of Object.keys(COLLECTIONS)) {
  const records = CorpusFileSchema.parse(readJson(p(`data/corpus/${collection}.json`))).records;
  const eligible = records.filter(
    (r) => r.matnText !== undefined && typeof r.citation.number === "string" && queryWords(r.matnText).length >= MIN_MATN_WORDS,
  );
  const sample = sampleRecords(eligible, PER_COLLECTION, SEED);
  console.log(`${collection}: sampling ${sample.length} of ${eligible.length} eligible records (of ${records.length})`);
  const findings: Finding[] = [];
  for (const record of sample) {
    const finding = await verifyRecord(record, collection);
    findings.push(finding);
    console.log(`  ${finding.verdict.padEnd(14)} ${finding.id} (no. ${finding.citationNumber}) — ${finding.note}`);
  }
  report[collection] = { eligible: eligible.length, total: records.length, findings };
}

const count = (findings: Finding[], v: Verdict): number => findings.filter((f) => f.verdict === v).length;
const VERDICTS: Verdict[] = ["CONFIRMED", "NUMBER_DIFFERS", "TEXT_DIFFERS", "INCONCLUSIVE", "ERROR"];
const ranAt = new Date().toISOString();

writeFileSync(
  p("data/review/dorar-verification.json"),
  `${JSON.stringify({ ranAt, corpusVersion: manifest.corpusVersion, seed: SEED, perCollection: PER_COLLECTION, similarityThreshold: SIMILARITY_THRESHOLD, collections: report }, null, 2)}\n`,
);

const md: string[] = [
  `_Generated by \`scripts/verify-hadith-dorar.ts\` on ${ranAt} — corpus \`${manifest.corpusVersion}\`, seed ${SEED}, ${PER_COLLECTION} records per collection. Do not edit by hand._`,
  "",
  "| Collection | Eligible pool | Sampled | " + VERDICTS.join(" | ") + " |",
  "|---|---|---|" + VERDICTS.map(() => "---").join("|") + "|",
  ...Object.entries(report).map(
    ([c, r]) => `| ${c} | ${r.eligible} of ${r.total} | ${r.findings.length} | ${VERDICTS.map((v) => count(r.findings, v)).join(" | ")} |`,
  ),
];
for (const [collection, r] of Object.entries(report)) {
  const flagged = r.findings.filter((f) => f.verdict !== "CONFIRMED");
  md.push("", `**${collection} — confirmed (${count(r.findings, "CONFIRMED")}):** ${r.findings.filter((f) => f.verdict === "CONFIRMED").map((f) => `${f.id} (no. ${f.citationNumber})`).join(", ") || "none"}`);
  md.push("", `**${collection} — flagged for review (${flagged.length}):**${flagged.length ? "" : " none"}`);
  for (const f of flagged) {
    md.push(`- \`${f.id}\` (citation no. ${f.citationNumber}${f.subNumber ? `, source ${f.subNumber}` : ""}) — **${f.verdict}** — ${f.note} Best similarity: ${f.bestSimilarity ?? "n/a"}; same-collection results seen: ${f.sameCollectionResults}.`);
  }
  const gradeFlags = r.findings.filter((f) => f.gradeDiffers);
  md.push("", `**${collection} — confirmed, but Dorar's grade line is not our record's grade (${gradeFlags.length}):**${gradeFlags.length ? "" : " none"}`);
  for (const f of gradeFlags) md.push(`- \`${f.id}\` (citation no. ${f.citationNumber}) — Dorar: «${f.dorarGrade}». Needs the owner's review.`);
}
const wroteDocs = replaceAutoBlock("docs/SOURCES.md", "DORAR", md.join("\n"));

console.log("");
for (const [c, r] of Object.entries(report)) {
  console.log(`${c}: ${VERDICTS.map((v) => `${v}=${count(r.findings, v)}`).join(" ")} grade-differs=${r.findings.filter((f) => f.gradeDiffers).length}`);
}
console.log(`network requests: ${networkRequests}; wrote data/review/dorar-verification.json${wroteDocs ? " and docs/SOURCES.md (AUTO:DORAR)" : ""}`);
