// Writes docs/HADITH_REVIEW_SAMPLE.md: a small sample of Bukhari and Muslim records for the
// owner to read against an independent reference (Dorar), plus the list of records that stay
// outside any collection approval. Approves nothing, grades nothing, changes no corpus data.
//
//   npx tsx scripts/make-hadith-review-sample.ts [--short 6] [--long 6] [--seed 20261003] [--offline]
//
// Texts and numbers are read from data/corpus. Dorar texts are compared but not copied: only the
// individual words that differ are written to the sheet.
import { writeFileSync } from "node:fs";
import {
  DORAR_BOOKS,
  align,
  createDorarClient,
  osoulUrl,
  parseOsoul,
  parseSiteResults,
  queryWords,
  siteSearchUrl,
  tokens,
  type DorarBookText,
  type DorarResult,
} from "./lib/dorar.js";
import { CorpusFileSchema, type SourceRecord } from "./lib/schema.js";
import { p, readJson } from "./lib/util.js";

const args = process.argv.slice(2);
const argValue = (name: string, fallback: number): number => {
  const i = args.indexOf(name);
  const v = i >= 0 ? Number(args[i + 1]) : fallback;
  if (!Number.isInteger(v) || v <= 0) throw new Error(`${name} needs a positive integer`);
  return v;
};
const SHORT = argValue("--short", 6);
const LONG = argValue("--long", 6);
const SEED = argValue("--seed", 20261003);
const client = createDorarClient({ offline: args.includes("--offline") });

const LONG_MIN_CHARS = 700; // "long narrative": no separated matn and at least this long
const LONG_MAX_CHARS = 2500; // keeps the sheet readable
const QUERY_WORDS = 6;
const FOUND_THRESHOLD = 0.6; // share of the Dorar text's words that must appear, in order, in ours
const MAX_LISTED_WORDS = 30;

interface HadithFindings {
  nullCitationNumber: string[];
  splitEntries: string[];
  corruptText: string[];
  sharedTextGroups: string[][];
}
const report = readJson(p("data/corpus/build-report.json")) as Record<string, HadithFindings> & { corpusVersion: string };

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
function pick(pool: SourceRecord[], n: number, rand: () => number): SourceRecord[] {
  const items = [...pool];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items.slice(0, n);
}

interface Comparison {
  record: SourceRecord;
  kind: "short saying" | "long narrative";
  searchLinks: string[];
  /** Best same-book Dorar result carrying our number, if any. */
  sameNumber?: { link?: string; coverage: number; oursOnly: string[]; dorarOnly: string[] };
  /** Same-book results whose text matches ours but under another number. */
  otherNumbers: Array<{ number: string; link?: string; coverage: number }>;
  /** The book's own text under «أصول الحديث» on the Dorar page, compared word by word with ours. */
  bookText?: { label: string; shared: number; oursOnly: string[]; dorarOnly: string[] };
  /** Why there is no bookText, when there is none. */
  bookTextNote?: string;
  errors: string[];
}

// Word-by-word comparison of our full text with the book's text as Dorar quotes it under
// «أصول الحديث». Both include the chain of narrators, so every unmatched word on either side counts.
function compareBookText(record: SourceRecord, entry: DorarBookText): NonNullable<Comparison["bookText"]> {
  const ours = tokens(record.exactText);
  const theirs = tokens(entry.text);
  const pairs = align(theirs.map((t) => t.folded), ours.map((t) => t.folded));
  const matchedTheirs = new Set(pairs.map(([i]) => i));
  const matchedOurs = new Set(pairs.map(([, j]) => j));
  return {
    label: entry.label,
    shared: pairs.length,
    dorarOnly: theirs.filter((_, i) => !matchedTheirs.has(i)).map((t) => t.raw),
    oursOnly: ours.filter((_, j) => !matchedOurs.has(j)).map((t) => t.raw),
  };
}

// Compares one Dorar result with our full text. `coverage` = share of Dorar's words found, in
// order, in our text. Differences are reported inside the stretch of our text that Dorar's covers.
function compare(record: SourceRecord, result: DorarResult) {
  const ours = tokens(record.exactText);
  // Dorar adds editorial notes in square brackets (e.g. the surah name after a quoted ayah).
  const theirs = tokens(result.text.replace(/\[[^\]]*\]/g, " "));
  const pairs = align(theirs.map((t) => t.folded), ours.map((t) => t.folded));
  const coverage = theirs.length === 0 ? 0 : pairs.length / theirs.length;
  const matchedTheirs = new Set(pairs.map(([i]) => i));
  const matchedOurs = new Set(pairs.map(([, j]) => j));
  const first = pairs[0]?.[1] ?? 0;
  const last = pairs[pairs.length - 1]?.[1] ?? -1;
  return {
    coverage,
    dorarOnly: theirs.filter((_, i) => !matchedTheirs.has(i)).map((t) => t.raw),
    oursOnly: ours.filter((_, j) => j >= first && j <= last && !matchedOurs.has(j)).map((t) => t.raw),
  };
}

function queriesFor(record: SourceRecord): string[] {
  if (record.matnText) {
    const w = queryWords(record.matnText);
    return [w.slice(0, QUERY_WORDS + 2).join(" "), w.slice(-QUERY_WORDS).join(" "), w.slice(0, 4).join(" "), w.slice(-4).join(" ")];
  }
  // Narrative: the chain of narrators comes first, so take word windows from later in the text.
  const w = queryWords(record.exactText);
  const at = (share: number): string => w.slice(Math.floor(w.length * share)).slice(0, QUERY_WORDS).join(" ");
  return [at(0.5), at(0.7), at(0.35), w.slice(-QUERY_WORDS - 2, -2).join(" ")];
}

async function lookup(record: SourceRecord, kind: Comparison["kind"]): Promise<Comparison> {
  const book = DORAR_BOOKS[record.collection]!;
  const number = record.citation.number!;
  const out: Comparison = { record, kind, searchLinks: [], otherNumbers: [], errors: [] };
  for (const query of [...new Set(queriesFor(record))]) {
    const url = siteSearchUrl(query, book.bookId);
    out.searchLinks.push(url);
    const res = await client.get(url);
    if ("error" in res) {
      out.errors.push(res.error);
      continue;
    }
    for (const result of parseSiteResults(res.body)) {
      if (result.source !== book.source) continue;
      const c = compare(record, result);
      if (result.number === number) {
        if (!out.sameNumber || c.coverage > out.sameNumber.coverage) out.sameNumber = { ...c, ...(result.link ? { link: result.link } : {}) };
      } else if (c.coverage >= FOUND_THRESHOLD && !out.otherNumbers.some((o) => o.number === result.number)) {
        out.otherNumbers.push({ number: result.number, coverage: c.coverage, ...(result.link ? { link: result.link } : {}) });
      }
    }
    if (out.sameNumber && out.sameNumber.coverage >= FOUND_THRESHOLD) break;
  }

  // Wording is compared with the book's own text under «أصول الحديث», not with the summary above.
  const link = out.sameNumber && out.sameNumber.coverage >= FOUND_THRESHOLD ? out.sameNumber.link : undefined;
  if (!link) {
    out.bookTextNote = "no Dorar page for this number was found, so there is no book text to compare";
    return out;
  }
  const page = await client.get(osoulUrl(link));
  if ("error" in page) {
    out.bookTextNote = `the «أصول الحديث» page could not be read (${page.error})`;
    return out;
  }
  const fromBook = parseOsoul(page.body).filter((e) => e.label.includes(book.source));
  const sameNumber = fromBook.filter((e) => e.numbers.includes(number));
  if (sameNumber.length === 0) {
    out.bookTextNote =
      fromBook.length === 0
        ? `Dorar's «أصول الحديث» for this hadith has no ${book.source} entry`
        : `Dorar's «أصول الحديث» has ${book.source} entries only under no. ${fromBook.flatMap((e) => e.numbers).join(", ")}, not ${number}`;
    return out;
  }
  out.bookText = sameNumber
    .map((e) => compareBookText(record, e))
    .sort((a, b) => a.oursOnly.length + a.dorarOnly.length - (b.oursOnly.length + b.dorarOnly.length))[0]!;
  return out;
}

const numberFound = (c: Comparison): boolean => c.sameNumber !== undefined && c.sameNumber.coverage >= FOUND_THRESHOLD;
const wordDiffs = (c: Comparison): number => (c.bookText ? c.bookText.dorarOnly.length + c.bookText.oursOnly.length : 0);
const pct = (x: number): string => `${Math.round(x * 100)}%`;
const wordList = (words: string[]): string =>
  words.length === 0 ? "none" : `${words.slice(0, MAX_LISTED_WORDS).join(" · ")}${words.length > MAX_LISTED_WORDS ? ` … (+${words.length - MAX_LISTED_WORDS} more)` : ""}`;

function numberingLine(c: Comparison): string {
  const n = c.record.citation.number;
  if (c.sameNumber && c.sameNumber.coverage >= FOUND_THRESHOLD) return `**Same.** Dorar lists this text under no. ${n}.`;
  if (c.otherNumbers.length > 0) {
    return `**DIFFERENT.** Dorar's results show this text under no. ${c.otherNumbers.map((o) => (o.link ? `[${o.number}](${o.link})` : o.number)).join(", ")}, not ${n}. (Dorar often lists a repeated narration under several numbers; no. ${n} did not come up in these searches.)`;
  }
  if (c.sameNumber) return `**UNCLEAR.** Dorar has a no. ${n} in the results, but only ${pct(c.sameNumber.coverage)} of its words appear in our text.`;
  return `**NOT FOUND.** No matching result in these Dorar searches${c.errors.length ? ` (request errors: ${c.errors.join("; ")})` : ""}. This is not evidence of an error; it needs a manual look.`;
}

function wordingLines(c: Comparison): string[] {
  const b = c.bookText;
  if (!b) return [`- Wording: **NOT COMPARED** — ${c.bookTextNote ?? "no book text available"}.`];
  const none = b.dorarOnly.length === 0 && b.oursOnly.length === 0;
  return [
    `- Wording, compared with the book text Dorar quotes under «أصول الحديث» (${b.label}), chain of narrators included: ${b.shared} words in common.${none ? " **No word differences found.**" : " **Differences:**"}`,
    ...(none
      ? []
      : [`  - Words in ours that are not in the book text: ${wordList(b.oursOnly)}`, `  - Words in the book text that are not in ours: ${wordList(b.dorarOnly)}`]),
  ];
}

function entry(c: Comparison, index: number): string {
  const r = c.record;
  const cit = r.citation;
  const link = c.sameNumber?.link ?? c.otherNumbers[0]?.link;
  return [
    `#### ${index}. ${cit.display} — ${c.kind}`,
    "",
    `- Record: \`${r.id}\`${cit.subNumber && cit.subNumber !== cit.number ? ` · number in the source file: ${cit.subNumber}` : ""}`,
    `- Displayed hadith number: **${cit.number}**`,
    `- Independent reference: ${link ? `[this hadith on Dorar, with «أصول الحديث»](${osoulUrl(link)})` : "no direct Dorar page found"} · [Dorar search used](${c.searchLinks[c.searchLinks.length - 1]!.replace("s[]", "s%5B%5D")})`,
    `- Numbering: ${numberingLine(c)}`,
    ...wordingLines(c),
    "",
    "Text as stored:",
    "",
    `> ${r.exactText}`,
    ...(r.matnText ? ["", "Separated saying (`matnText`):", "", `> ${r.matnText}`] : []),
  ].join("\n");
}

// --- Main ------------------------------------------------------------------------------------
const sections: string[] = [];
const excluded: string[] = [];
const summary: Array<{ collection: string; eligible: number; total: number; results: Comparison[] }> = [];

for (const collection of Object.keys(DORAR_BOOKS)) {
  const records = CorpusFileSchema.parse(readJson(p(`data/corpus/${collection}.json`))).records;
  const f = report[collection]!;
  const out = new Set<string>([
    ...f.nullCitationNumber.map((n) => `${collection}:${n}`),
    ...f.splitEntries.map((n) => `${collection}:${n}`),
    ...f.corruptText.map((n) => `${collection}:${n}`),
    ...f.sharedTextGroups.flat(),
  ]);
  const eligible = records.filter((r) => !out.has(r.id) && typeof r.citation.number === "string");
  const rand = mulberry32(SEED + collection.length);
  const shortPool = eligible.filter((r) => r.matnText !== undefined);
  const longPool = eligible.filter((r) => r.matnText === undefined && r.exactText.length >= LONG_MIN_CHARS && r.exactText.length <= LONG_MAX_CHARS);
  const chosen: Array<[SourceRecord, Comparison["kind"]]> = [
    ...pick(shortPool, SHORT, rand).map((r): [SourceRecord, Comparison["kind"]] => [r, "short saying"]),
    ...pick(longPool, LONG, rand).map((r): [SourceRecord, Comparison["kind"]] => [r, "long narrative"]),
  ];

  console.log(`${collection}: ${eligible.length} eligible of ${records.length}; sampling ${chosen.length}`);
  const results: Comparison[] = [];
  for (const [record, kind] of chosen) {
    const c = await lookup(record, kind);
    results.push(c);
    const wording = c.bookText ? `book text: ${c.bookText.shared} words in common, ${c.bookText.oursOnly.length} ours-only, ${c.bookText.dorarOnly.length} book-only` : `book text not compared (${c.bookTextNote})`;
    console.log(`  ${record.id} (no. ${record.citation.number}, ${kind}): number ${numberFound(c) ? "same" : "NOT confirmed"}; ${wording}`);
  }
  summary.push({ collection, eligible: eligible.length, total: records.length, results });

  const name = DORAR_BOOKS[collection]!.source;
  sections.push(
    [
      `### ${name}`,
      "",
      `${eligible.length} of ${records.length} records are eligible for a collection approval. Sample: ${SHORT} short sayings (out of ${shortPool.length}) and ${LONG} long narratives (out of ${longPool.length} between ${LONG_MIN_CHARS} and ${LONG_MAX_CHARS} characters), picked at random with a fixed seed.`,
      "",
      ...results.map((c, i) => entry(c, i + 1)),
    ].join("\n\n"),
  );

  excluded.push(
    [
      `### ${name} — outside this approval (${out.size} records)`,
      "",
      `- **Damaged text** (${f.corruptText.length}): ${f.corruptText.map((n) => `${collection}:${n}`).join(", ") || "none"}`,
      `- **No hadith number in the source** (${f.nullCitationNumber.length}): ${f.nullCitationNumber.map((n) => `${collection}:${n}`).join(", ") || "none"}`,
      `- **Decimal entries** (${f.splitEntries.length}): ${f.splitEntries.map((n) => `${collection}:${n}`).join(", ") || "none"}`,
      `- **Repeated-text groups** (${f.sharedTextGroups.length} groups, ${f.sharedTextGroups.flat().length} records) — numbers that carry the same text: ${f.sharedTextGroups.map((g) => g.map((id) => id.split(":")[1]).join("=")).join(", ")}`,
    ].join("\n"),
  );
}

const flagged = summary.flatMap((s) => s.results).filter((c) => !numberFound(c) || !c.bookText || wordDiffs(c) > 0);
const ranAt = new Date().toISOString().slice(0, 10);

const md = `# Azw — hadith review sample

For: the project owner. Corpus \`${report.corpusVersion}\`, prepared ${ranAt}.

**Sahih al-Bukhari and Sahih Muslim are pending. Nothing here is approved, and this sheet does not approve anything.** It gives you a sample to read. No hadith is graded here; the tool does not judge authenticity.

## How to read this sheet

- Each entry shows the text exactly as stored, the hadith number Azw would display, and a link to the same hadith on Dorar (الدرر السنية — الموسوعة الحديثية), which is independent of our source file.
- **Numbering** is checked against the number Dorar prints for the hadith in the same book.
- **Wording** is checked against the book's own text, which Dorar quotes under «أصول الحديث» on the hadith's page (the entry labelled with the same book and the same number). It is **not** checked against the text at the top of a Dorar result: that text is a summary, and its wording can follow another book (see its «التخريج» line).
- Both our text and the book text include the chain of narrators, so the whole record is compared. The comparison ignores diacritics, punctuation, and the alef / ya / ta-marbuta spelling variants. Every other word that is on one side only is listed. Dorar's book text may come from a different printed edition, so a listed difference is something for you to judge, not an error by itself.
- Where the «أصول الحديث» section has no entry for the same book and number, the sheet says the wording was not compared.
- Muslim: the record id uses the source file's running number; the displayed number is the Fuad Abd al-Baqi number.

## Summary

| Book | Eligible records | Sampled | Same number on Dorar | Different number | Number not found / unclear | Book text compared | No word differences | With word differences | Book text not available |
|---|---|---|---|---|---|---|---|---|---|
${summary
  .map((s) => {
    const same = s.results.filter(numberFound);
    const other = s.results.filter((c) => !numberFound(c) && c.otherNumbers.length > 0);
    const compared = s.results.filter((c) => c.bookText);
    const diffs = compared.filter((c) => wordDiffs(c) > 0);
    return `| ${DORAR_BOOKS[s.collection]!.source} | ${s.eligible} of ${s.total} | ${s.results.length} | ${same.length} | ${other.length} | ${s.results.length - same.length - other.length} | ${compared.length} | ${compared.length - diffs.length} | ${diffs.length} | ${s.results.length - compared.length} |`;
  })
  .join("\n")}

Entries that need your attention (a difference in number or wording, or no book text to compare): ${flagged.length === 0 ? "none" : flagged.map((c) => `\`${c.record.id}\``).join(", ")}.

## 1. Sample

${sections.join("\n\n")}

## 2. Records kept outside this approval

These records are in the corpus, unmodified and pending. A collection approval, if you give one later, will not cover them; each would need its own decision. None of them is in the sample above.

${excluded.join("\n\n")}

Empty entries in the source file were never imported and are listed in \`docs/SOURCES.md\`.

## 3. What this sample does and does not show

- It covers ${summary.reduce((n, s) => n + s.results.length, 0)} records out of ${summary.reduce((n, s) => n + s.eligible, 0)} eligible. It cannot show that the other records are correct.
- The Dorar comparison was done by a script. Read the texts yourself before deciding.
- No approval has been recorded. To approve a book, tell me so explicitly.
`;

writeFileSync(p("docs/HADITH_REVIEW_SAMPLE.md"), md);
writeFileSync(
  p("data/review/hadith-review-sample.json"),
  `${JSON.stringify(
    {
      preparedAt: ranAt,
      corpusVersion: report.corpusVersion,
      seed: SEED,
      note: "Sample prepared for the owner's reading. Not an approval.",
      collections: summary.map((s) => ({
        collection: s.collection,
        eligible: s.eligible,
        records: s.results.map((c) => ({
          id: c.record.id,
          displayedNumber: c.record.citation.number,
          kind: c.kind,
          dorarLink: c.sameNumber?.link ? osoulUrl(c.sameNumber.link) : null,
          sameNumberOnDorar: numberFound(c),
          dorarOtherNumbers: c.otherNumbers.map((o) => o.number),
          comparedWith: c.bookText ? `أصول الحديث: ${c.bookText.label}` : null,
          wordsInCommon: c.bookText?.shared ?? null,
          wordDifferences: c.bookText ? wordDiffs(c) : null,
          bookTextNote: c.bookTextNote ?? null,
        })),
      })),
    },
    null,
    2,
  )}\n`,
);
console.log(`\nnetwork requests: ${client.networkRequests}; flagged: ${flagged.length}; wrote docs/HADITH_REVIEW_SAMPLE.md`);
