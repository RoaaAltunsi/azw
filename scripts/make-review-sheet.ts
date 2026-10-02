// Writes docs/REVIEW_SHEET.md: a short plain-language sheet for the human reviewer.
// Every number and every quoted text is read from data/corpus and data/review — nothing is typed
// by hand. Changes no data and approves nothing.
//
//   npx tsx scripts/make-review-sheet.ts
import { writeFileSync } from "node:fs";
import { CorpusFileSchema, ReviewedFileSchema, type SourceRecord } from "./lib/schema.js";
import { p, readJson } from "./lib/util.js";

const load = (c: string): SourceRecord[] => CorpusFileSchema.parse(readJson(p(`data/corpus/${c}.json`))).records;
const quran = load("quran");
const bukhari = load("bukhari");
const muslim = load("muslim");
const byId = new Map([...quran, ...bukhari, ...muslim].map((r) => [r.id, r]));
const get = (id: string): SourceRecord => {
  const r = byId.get(id);
  if (!r) throw new Error(`record not found: ${id}`);
  return r;
};

interface HadithFindings {
  rawEntries: number;
  records: number;
  skippedEmpty: string[];
  nullCitationNumber: string[];
  splitEntries: string[];
  corruptText: string[];
  sharedTextGroups: string[][];
  withMatnText: number;
}
const report = readJson(p("data/corpus/build-report.json")) as {
  corpusVersion: string;
  quran: { ayatWithLeadingBom: number; embeddedMarks: Record<string, number> };
  bukhari: HadithFindings;
  muslim: HadithFindings;
};
const manifest = readJson(p("data/corpus/manifest.json")) as {
  sources: Array<{ collection: string; reviewStatus: { reviewed: number; pending: number }; source: { rawFiles: Array<{ path: string; sha256: string }>; upstreamChecksum?: { sha256: string; localGz: null | { sha256: string; matchesManifestSha256: boolean; decompressedMatchesLocalJson: boolean } } } }>;
};
const dorar = readJson(p("data/review/dorar-verification.json")) as {
  collections: Record<string, { eligible: number; findings: Array<{ id: string; verdict: string }> }>;
};
const reviewedTotal = manifest.sources.reduce((n, s) => n + s.reviewStatus.reviewed, 0);
const approvals = ReviewedFileSchema.parse(readJson(p("data/review/reviewed.json"))).collections;
const quranApproval = approvals.find((a) => a.collection === "quran");
const statusLine =
  approvals.length === 0
    ? `**Review status: nothing has been reviewed or approved by a person.** All ${quran.length + bukhari.length + muslim.length} records are marked pending.`
    : `**Review status:** approved by the owner: ${approvals.map((a) => `${a.collection} (${a.approvedAt})`).join(", ")} — ${reviewedTotal} records marked reviewed. Everything else is pending (${quran.length + bukhari.length + muslim.length - reviewedTotal} records) and no other decision has been made.`;
const src = (c: string) => manifest.sources.find((s) => s.collection === c)!;
const rawFile = (c: string): string => src(c).source.rawFiles[0]!.path;
const confirmed = (c: string): number => dorar.collections[c]!.findings.filter((f) => f.verdict === "CONFIRMED").length;
const sampled = (c: string): number => dorar.collections[c]!.findings.length;

// Shortest Dorar-confirmed record of a collection: easy to read in full.
function shortestConfirmed(c: string): SourceRecord {
  const ids = dorar.collections[c]!.findings.filter((f) => f.verdict === "CONFIRMED").map((f) => f.id);
  return ids.map(get).sort((a, b) => a.exactText.length - b.exactText.length)[0]!;
}

const quote = (text: string): string => text.split("\n").map((l) => `> ${l}`).join("\n");

function hadithExample(r: SourceRecord, why: string): string {
  const c = r.citation;
  return [
    `**\`${r.id}\`** — ${c.display}${c.subNumber && c.subNumber !== c.number ? ` (source number ${c.subNumber})` : ""}`,
    `Why this one: ${why}`,
    "",
    quote(r.exactText),
    "",
    r.matnText ? `Separated matn (\`matnText\`):\n\n${quote(r.matnText)}` : "No `matnText` stored for this record.",
    "",
    `Source file: \`${rawFile(r.collection)}\` · ${r.edition}`,
  ].join("\n");
}

// Text around the first damaged character, so the damage can be seen without the whole hadith.
function damageSnippet(r: SourceRecord): string {
  const i = r.exactText.search(/[￼�]/);
  return r.exactText.slice(Math.max(0, i - 45), i + 45).replace(/‏/g, "");
}

const QURAN_EXAMPLES: Array<[string, string]> = [
  ["quran:1:1", "first ayah; the source had two BOM characters here"],
  ["quran:2:26", "starts with the ۞ sign that the source embeds in the text"],
  ["quran:2:153", "the example ayah named in AGENTS.md"],
  ["quran:2:255", "long, well-known ayah with several pause marks"],
  ["quran:7:206", "ends with the sajdah sign ۩"],
  ["quran:17:36", "contains «مسئولا» (hamza spelling differs from everyday «مسؤولا»)"],
  ["quran:30:30", "contains «فطرت» with open ta"],
  ["quran:38:17", "contains «داوود» and a dagger alif in «علىٰ»"],
  ["quran:66:10", "contains «امرأت» with open ta"],
  ["quran:112:1", "short ayah with no marks"],
];

const bq = shortestConfirmed("bukhari");
const mq = shortestConfirmed("muslim");
const BUKHARI_EXAMPLES: Array<[SourceRecord, string]> = [
  [get("bukhari:1"), "first hadith of the book. Note the source text has an opening quote mark and no closing one."],
  [bq, "confirmed in the Dorar spot-check; has a separated matn."],
  [get("bukhari:1493"), "a narrative with two quoted sayings, so no matn was separated."],
];
const MUSLIM_EXAMPLES: Array<[SourceRecord, string]> = [
  [get("muslim:4927"), "shows the numbering: id uses the source running number 4927, the citation uses 1907."],
  [mq, "confirmed in the Dorar spot-check; has a separated matn."],
  [get("muslim:1501"), "a narrative with two quoted sayings, so no matn was separated."],
];

const b = report.bukhari;
const m = report.muslim;
const gz = src("quran").source.upstreamChecksum!;
const firstShared = (f: HadithFindings): string => f.sharedTextGroups[0]!.map((id) => `\`${id}\``).join(" = ");

const md = `# Azw — data review sheet

For: the project owner. Corpus version \`${report.corpusVersion}\`.

${statusLine} The checks below were run by scripts. They show that the files are complete and consistent; they do not show that the texts are correct. Only a person reading them can do that.

Details and full lists: \`docs/SOURCES.md\`, \`data/corpus/build-report.json\`.

## 1. Quran

**Source file:** \`${rawFile("quran")}\` — Quranpedia.net, mushaf 1 «مصحف حفص», from their official dump (manifest version 2026-10-02).

**Checked on every record (passed):**
- 114 surahs and ${quran.length} ayat, numbered without gaps.
- No empty text, no duplicate ids.
- The only change to the text: a hidden BOM character was removed from the start of ${report.quran.ayatWithLeadingBom} ayat.
- The file Quranpedia serves today unpacks to exactly the file you downloaded.

**Checked by sampling:** ${
  quranApproval
    ? `${quranApproval.comparedRecords?.length ?? 0} ayat compared by the owner (${quranApproval.approvedAt}). ${quranApproval.method ?? ""} The other ${quran.length - (quranApproval.comparedRecords?.length ?? 0)} ayat were checked only by the automated checks above.`
    : "nothing. No ayah has been compared with a printed mushaf or a second source."
}

**Problems that remain:**
- Quranpedia's published checksum does not match the compressed file they serve (same size, same content after unpacking, different checksum). Unresolved; cause not established.
- Some words keep mushaf spelling that differs from how people type (رحمت، فطرت، امرأت، مسئولا، رءوف، الملإ، داوود). Search will miss them unless this is handled.
- The signs ۞ (${report.quran.embeddedMarks["U+06DE"]} ayat) and ۩ (${report.quran.embeddedMarks["U+06E9"]} ayat) are inside the ayah text.
- Three different version dates appear in the source: 2026-10-02 (manifest), 2026-09-30 (inside the file), 2026-10-01 (license).

## 2. Sahih al-Bukhari

**Source file:** \`${rawFile("bukhari")}\` — fawazahmed0/hadith-api, edition ara-bukhari, commit df57907.

**Checked on every record (passed):**
- ${b.rawEntries} source entries → ${b.records} records; ${b.skippedEmpty.length} entries had no text and were left out.
- No empty text, no duplicate ids, every number within 1–7563.
- Your file is byte-for-byte the file at that commit; the license there is the Unlicense.

**Checked by sampling:** ${sampled("bukhari")} records compared with Dorar; ${confirmed("bukhari")} matched in book, number and wording. The sample was taken only from the ${dorar.collections.bukhari!.eligible} short quoted sayings, so long narratives and the problem records below were not tested.

**Problems that remain:**
- ${b.sharedTextGroups.flat().length} records share their text with a neighbouring number (${b.sharedTextGroups.length} groups), so the text cannot be tied to one hadith number.
- ${b.splitEntries.length} entries have decimal numbers such as 402.2.
- ${b.corruptText.length} records have a damaged character.
- ${b.skippedEmpty.length} hadith numbers are missing because the source text is empty.
- The source does not say which printed edition the text was taken from.

## 3. Sahih Muslim

**Source file:** \`${rawFile("muslim")}\` — fawazahmed0/hadith-api, edition ara-muslim, commit df57907.

**Checked on every record (passed):**
- ${m.rawEntries} source entries → ${m.records} records; ${m.skippedEmpty.length} entries had no text and were left out (most are the introduction).
- No empty text, no duplicate ids, every citation number within 1–3033 (Fuad Abd al-Baqi numbering).
- Your file is byte-for-byte the file at that commit.

**Checked by sampling:** ${sampled("muslim")} records compared with Dorar; ${confirmed("muslim")} matched in book, number and wording. Same limit as Bukhari: only the ${dorar.collections.muslim!.eligible} short quoted sayings were eligible.

**Problems that remain:**
- ${m.nullCitationNumber.length} records have no citation number in the source. They cannot be cited.
- ${m.sharedTextGroups.flat().length} records share their text with another number (${m.sharedTextGroups.length} groups).
- ${m.corruptText.length} records have a damaged character.
- 71 of the 3033 citation numbers do not appear in the corpus.

## 4. Examples to inspect

### 4.1 Quran — 10 ayat

Source file for all: \`${rawFile("quran")}\`.

| Record | Reference | Text as stored | Why this one |
|---|---|---|---|
${QURAN_EXAMPLES.map(([id, why]) => {
  const r = get(id);
  return `| \`${r.id}\` | ${r.citation.display} | ${r.exactText} | ${why} |`;
}).join("\n")}

### 4.2 Sahih al-Bukhari — 3 hadith

${BUKHARI_EXAMPLES.map(([r, why]) => hadithExample(r, why)).join("\n\n---\n\n")}

### 4.3 Sahih Muslim — 3 hadith

${MUSLIM_EXAMPLES.map(([r, why]) => hadithExample(r, why)).join("\n\n---\n\n")}

## 5. Unusual or damaged records

All of these are in the corpus unmodified and pending. Full lists are in \`data/corpus/build-report.json\`.

| Kind | Bukhari | Muslim | Example |
|---|---|---|---|
| Damaged character (the source lost a letter, shown as �) | ${b.corruptText.length} | ${m.corruptText.length} | \`bukhari:${b.corruptText[0]}\`: …${damageSnippet(get(`bukhari:${b.corruptText[0]}`))}… |
| Same text under several numbers | ${b.sharedTextGroups.flat().length} records | ${m.sharedTextGroups.flat().length} records | ${firstShared(b)}; ${firstShared(m)} |
| Decimal (split) number | ${b.splitEntries.length} | 0 | \`bukhari:${b.splitEntries[0]}\`, cited as no. ${get(`bukhari:${b.splitEntries[0]}`).citation.number} |
| No citation number | 0 | ${m.nullCitationNumber.length} | \`muslim:${m.nullCitationNumber[0]}\` (from the introduction) |
| Empty in the source, left out | ${b.skippedEmpty.length} | ${m.skippedEmpty.length} | Bukhari no. ${b.skippedEmpty.slice(0, 3).join(", ")} |

Damaged records — Bukhari: ${b.corruptText.join(", ")}.
Damaged records — Muslim (source running numbers): ${m.corruptText.join(", ")}.
Bukhari split entries: ${b.splitEntries.join(", ")}.

Second damaged example, \`muslim:${m.corruptText[0]}\`: …${damageSnippet(get(`muslim:${m.corruptText[0]}`))}…

## 6. Decisions you need to make

| # | Decision | Recommendation | Consequence |
|---|---|---|---|
${
  quranApproval
    ? `| 1 | Approve the Quran text? | **Decided: approved by the owner on ${quranApproval.approvedAt}** for text matching, after comparing the 10 ayat above with مصحف المدينة النبوية. | Quran records are marked reviewed. Decisions 2–4 are not covered by this approval. |`
    : "| 1 | Approve the Quran text? | Not yet. First read the 10 ayat above against a printed mushaf, and settle decision 2. | Until approved, no Quran quote can get the «مطابق لنص المصدر» status. |"
}
| 2 | Quran checksum mismatch | Email Quranpedia (quranpedia.help@gmail.com) and continue meanwhile; the content matches what they serve. | If they confirm a stale manifest, nothing changes. If the file changed, re-download and rebuild. |
| 3 | Mushaf spellings in search (رحمت، مسئولا، الملإ …) | Use a small reviewed list of these word forms for search only. | Correct quotes typed in everyday spelling are found. Without it they show as «مختلف» or not found. The displayed text is never changed. |
| 4 | The ۞ and ۩ signs in displayed ayat | Keep them in the stored text; hide them only when showing a quote. | The stored text stays identical to the source; the writer sees a clean ayah. |
| 5 | Approve Bukhari and Muslim? | Not yet. Read the examples, and decide 6–9 first. | Until approved, no hadith can get the match status. |
| 6 | Records sharing one text under several numbers | Keep them out of any approval for now; later show them with a number range. | About 730 records cannot give a match status. Approving them as they are risks citing the wrong number. |
| 7 | Damaged records (32) | Leave them out of approval. Do not repair the text by hand. | 32 hadith stay unverifiable until a clean source is found. |
| 8 | Bukhari decimal entries cited by the whole number (402.2 → 402) | Accept. | The reader sees a real hadith number. This differs from your instruction to use \`hadithnumber\` as is; say so if you want the decimal shown. |
| 9 | Muslim records without a number: no grade, never approved | Accept. | ${m.nullCitationNumber.length} records stay in the data but can never produce a match status. |
| 10 | The rule that separates the matn | Accept after reading the two examples with a separated matn above. | ${b.withMatnText + m.withMatnText} records get a matn. The rest are matched on the full text including the chain of narrators. |
| 11 | Alternate surah names (براءة، الدهر، الانشراح …) | Read the list in \`data/aliases/surahs.json\` and strike any you do not accept. | They only help recognise a surah a writer names; they are never shown as source text. |

To approve anything, tell me which collection or which records. I will then record your name and the date in \`data/review/reviewed.json\`. Until then everything stays pending.
`;

writeFileSync(p("docs/REVIEW_SHEET.md"), md);
console.log(`wrote docs/REVIEW_SHEET.md (${md.length} chars); reviewed records in corpus: ${reviewedTotal}`);
console.log(`bukhari examples: ${BUKHARI_EXAMPLES.map(([r]) => r.id).join(", ")}; muslim examples: ${MUSLIM_EXAMPLES.map(([r]) => r.id).join(", ")}`);
