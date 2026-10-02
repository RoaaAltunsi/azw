// Checks the labeled evaluation cases in eval/cases against data/corpus. Exits non-zero on any
// failed check. It validates labels only and runs no matching logic.
//
//   npx tsx scripts/check-cases.ts
import { existsSync, readFileSync } from "node:fs";
import { CATEGORIES, CRITICAL_CATEGORIES, SPLITS, checkCases, parseCases, type EvalCase } from "./lib/cases.js";
import { CorpusFileSchema, type SourceRecord } from "./lib/schema.js";
import { p, readJson } from "./lib/util.js";

// The covered collections come from the manifest, so a new source needs no change here.
const manifest = readJson(p("data/corpus/manifest.json")) as { sources: Array<{ file: { path: string } }> };

const records = new Map<string, SourceRecord>();
for (const source of manifest.sources) {
  for (const r of CorpusFileSchema.parse(readJson(p(source.file.path))).records) records.set(r.id, r);
}

const cases: EvalCase[] = [];
const errors: string[] = [];
for (const split of SPLITS) {
  const rel = `eval/cases/${split}.jsonl`;
  if (!existsSync(p(rel))) {
    errors.push(`${rel}: file is missing`);
    continue;
  }
  const parsed = parseCases(readFileSync(p(rel), "utf8"), split, rel);
  cases.push(...parsed.cases);
  errors.push(...parsed.errors);
}
errors.push(...checkCases(cases, records));

const count = (category: string, split?: string): number =>
  cases.filter((c) => c.category === category && (!split || c.split === split)).length;
console.log(`${"category".padEnd(18)}${"tune".padStart(6)}${"heldout".padStart(9)}${"total".padStart(7)}  critical`);
for (const category of CATEGORIES) {
  const cells = [count(category, "tune"), count(category, "heldout"), count(category)];
  console.log(
    `${category.padEnd(18)}${String(cells[0]).padStart(6)}${String(cells[1]).padStart(9)}${String(cells[2]).padStart(7)}  ${CRITICAL_CATEGORIES.has(category) ? "yes" : "no"}`,
  );
}
const bySplit = SPLITS.map((s) => cases.filter((c) => c.split === s).length);
console.log(`${"total".padEnd(18)}${String(bySplit[0]).padStart(6)}${String(bySplit[1]).padStart(9)}${String(cases.length).padStart(7)}`);

const items = cases.flatMap((c) => c.expected);
const recordIds = new Set(items.flatMap((e) => e.recordIds));
console.log(`\n${items.length} expected items, ${recordIds.size} distinct corpus records, ${cases.filter((c) => c.critical).length} critical cases`);

if (errors.length > 0) {
  console.log(`\nFAIL — ${errors.length} problem(s):`);
  for (const e of errors) console.log(`  ${e}`);
  process.exit(1);
}
console.log("\nOK — every quote is an exact substring of its draft and every recordId exists in data/corpus.");
