// Schema and consistency rules for the labeled evaluation cases (eval/cases/*.jsonl).
// Label checks only: nothing here normalizes, searches or matches text. The only text comparison
// is an exact substring test.
import { z } from "zod";
import { REASON_CODES as DECIDED_REASON_CODES } from "../../src/core/status/reason-codes.js";
import type { SourceRecord } from "./schema.js";

export const SPLITS = ["tune", "heldout"] as const;
export type Split = (typeof SPLITS)[number];

export const CATEGORIES = [
  "EXACT",
  "ORTHOGRAPHIC",
  "WORDING_ERROR",
  "WRONG_REFERENCE",
  "NOT_IN_SOURCES",
  "AMBIGUOUS",
  "ADVERSARIAL",
] as const;
export type Category = (typeof CATEGORIES)[number];

// Required number of cases per category and split (50 in total: 20 tune, 30 held-out).
export const QUOTAS: Record<Category, Record<Split, number>> = {
  EXACT: { tune: 4, heldout: 6 },
  ORTHOGRAPHIC: { tune: 3, heldout: 3 },
  WORDING_ERROR: { tune: 3, heldout: 5 },
  WRONG_REFERENCE: { tune: 3, heldout: 5 },
  NOT_IN_SOURCES: { tune: 3, heldout: 5 },
  AMBIGUOUS: { tune: 2, heldout: 3 },
  ADVERSARIAL: { tune: 2, heldout: 3 },
};

export const CRITICAL_CATEGORIES: ReadonlySet<Category> = new Set(["WORDING_ERROR", "WRONG_REFERENCE", "ADVERSARIAL"]);

// ERROR is a system state, never an expected label.
const EXPECTED_STATUSES = ["MATCH", "DIFFERS", "NOT_FOUND", "NEEDS_SPECIALIST"] as const;
type ExpectedStatus = (typeof EXPECTED_STATUSES)[number];

// Reason codes an expected item may carry, by status: the list of src/core/status.
export const REASON_CODES: Record<ExpectedStatus, readonly string[]> = DECIDED_REASON_CODES;

export const ExpectedItemSchema = z.strictObject({
  quote: z.string().min(1),
  // What the draft presents the quote as (ReviewItem.claimedKind), not the kind of the record found.
  kind: z.enum(["quran", "hadith", "unclear_attribution", "interpretive_claim"]),
  status: z.enum(EXPECTED_STATUSES),
  recordIds: z.array(z.string().min(1)),
  reasonCode: z.string().min(1),
  contentLevel: z.enum(["A", "B", "C", "D"]).optional(),
});
export type ExpectedItem = z.infer<typeof ExpectedItemSchema>;

export const EvalCaseSchema = z.strictObject({
  id: z.string().regex(/^[TH]-\d{3}$/),
  split: z.enum(SPLITS),
  category: z.enum(CATEGORIES),
  critical: z.boolean(),
  draft: z.string().min(1),
  expected: z.array(ExpectedItemSchema),
  // true = the input is a request, not a draft: zero items and the scope message.
  expectScopeMessage: z.boolean().optional(),
  notes: z.string().min(1),
});
export type EvalCase = z.infer<typeof EvalCaseSchema>;

const ID_PREFIX: Record<Split, string> = { tune: "T-", heldout: "H-" };

function countOccurrences(text: string, part: string): number {
  let n = 0;
  for (let i = text.indexOf(part); i >= 0; i = text.indexOf(part, i + 1)) n++;
  return n;
}

function checkItem(c: EvalCase, item: ExpectedItem, records: ReadonlyMap<string, SourceRecord>): string[] {
  const errors: string[] = [];
  const short = item.quote.length > 30 ? `${item.quote.slice(0, 30)}…` : item.quote;
  const fail = (msg: string): void => void errors.push(`${c.id}: «${short}» ${msg}`);

  const occurrences = countOccurrences(c.draft, item.quote);
  if (occurrences === 0) fail("is not an exact substring of the draft");
  if (occurrences > 1) fail(`occurs ${occurrences} times in the draft; the span is ambiguous`);
  if (item.quote !== item.quote.trim()) fail("has leading or trailing whitespace");

  if (!REASON_CODES[item.status].includes(item.reasonCode)) {
    fail(`reasonCode ${item.reasonCode} is not a ${item.status} code`);
  }

  const found: SourceRecord[] = [];
  for (const id of item.recordIds) {
    const record = records.get(id);
    if (record) found.push(record);
    else fail(`recordId ${id} does not exist in data/corpus`);
  }
  if (new Set(item.recordIds).size !== item.recordIds.length) fail("lists a recordId twice");

  const needsRecord = item.status === "MATCH" || item.status === "DIFFERS";
  if (needsRecord && item.recordIds.length === 0) fail(`${item.status} needs at least one recordId`);
  if (item.status === "NOT_FOUND" && item.recordIds.length > 0) fail("NOT_FOUND must not list recordIds");

  if (needsRecord && found.length === item.recordIds.length && found.length > 0) {
    if (item.kind !== "quran" && item.kind !== "hadith") fail(`${item.status} needs kind quran or hadith`);
    const sameKind = found.every((r) => r.kind === item.kind);
    if (item.reasonCode === "KIND_MISMATCH" && sameKind) fail("KIND_MISMATCH needs records of another kind than the claimed one");
    if (item.reasonCode !== "KIND_MISMATCH" && !sameKind) fail("records are not of the claimed kind");

    // A pending record can never produce MATCH (AGENTS.md §5). A run counts as right when its
    // evidence holds any listed record, so every listed one must be reviewed.
    if (item.status === "MATCH") {
      const pending = found.filter((r) => r.reviewStatus !== "reviewed").map((r) => r.id);
      if (pending.length > 0) fail(`MATCH expected but these listed records are not reviewed: ${pending.join(", ")}`);
    }

    // Quran: the listed ayat are the ayat the quote covers, consecutive and in one surah.
    if (found.every((r) => r.kind === "quran")) {
      const consecutive = found.every((r, i) => {
        const prev = found[i - 1];
        return !prev || (r.citation.surah === prev.citation.surah && r.citation.ayah === (prev.citation.ayah ?? 0) + 1);
      });
      if (!consecutive) fail("Quran recordIds must be consecutive ayat of one surah, in order");
    } else if (found.length > 1 && found.some((r) => r.kind === "quran")) {
      fail("mixes Quran and other records");
    }

    // EXACT quotes are copied character for character from the source text: from the listed ayat
    // joined by single spaces, otherwise from the first listed record (the one it was copied from).
    if (c.category === "EXACT") {
      const source = found.every((r) => r.kind === "quran") ? found.map((r) => r.exactText).join(" ") : (found[0]?.exactText ?? "");
      if (!source.includes(item.quote)) fail("is in an EXACT case but is not a verbatim part of the source record's exactText");
    }
  }

  const isClaim = item.kind === "unclear_attribution" || item.kind === "interpretive_claim";
  if (isClaim && item.status !== "NEEDS_SPECIALIST") fail(`kind ${item.kind} must be NEEDS_SPECIALIST`);
  if (item.reasonCode === "PERSONAL_RULING" && item.contentLevel !== "D") fail("PERSONAL_RULING needs contentLevel D");
  if (item.reasonCode === "INTERPRETIVE_CLAIM" && item.contentLevel !== "C") fail("INTERPRETIVE_CLAIM needs contentLevel C");
  return errors;
}

function checkCategory(c: EvalCase): string[] {
  const errors: string[] = [];
  const fail = (msg: string): void => void errors.push(`${c.id}: ${msg}`);
  const statuses = c.expected.map((e) => e.status);
  const all = (s: ExpectedStatus): boolean => statuses.length > 0 && statuses.every((x) => x === s);

  switch (c.category) {
    case "EXACT":
    case "ORTHOGRAPHIC":
      if (!all("MATCH")) fail(`${c.category} expects MATCH for every item`);
      break;
    case "WORDING_ERROR":
    case "WRONG_REFERENCE": {
      if (!all("DIFFERS")) fail(`${c.category} expects DIFFERS for every item`);
      const wording = c.expected.some((e) => e.reasonCode === "WORDING_DIFF");
      if ((c.category === "WORDING_ERROR") !== wording) fail(`reasonCode does not fit ${c.category}`);
      break;
    }
    case "NOT_IN_SOURCES":
      if (!all("NOT_FOUND")) fail("NOT_IN_SOURCES expects NOT_FOUND for every item");
      break;
    case "AMBIGUOUS":
      if (!statuses.includes("NEEDS_SPECIALIST")) fail("AMBIGUOUS expects at least one NEEDS_SPECIALIST item");
      break;
    case "ADVERSARIAL":
      break;
  }

  if (c.expected.length === 0 && c.expectScopeMessage !== true) fail("zero expected items needs expectScopeMessage: true");
  if (c.expected.length > 0 && c.expectScopeMessage === true) fail("expectScopeMessage: true goes with zero expected items");
  return errors;
}

// Two quotes of one case must not overlap in the draft.
function checkOverlap(c: EvalCase): string[] {
  const spans = c.expected
    .map((e) => ({ start: c.draft.indexOf(e.quote), end: c.draft.indexOf(e.quote) + e.quote.length }))
    .filter((s) => s.start >= 0)
    .sort((a, b) => a.start - b.start);
  const overlap = spans.some((s, i) => i > 0 && s.start < (spans[i - 1]?.end ?? 0));
  return overlap ? [`${c.id}: expected quotes overlap in the draft`] : [];
}

// Returns one message per problem; an empty list means the cases are consistent.
export function checkCases(cases: readonly EvalCase[], records: ReadonlyMap<string, SourceRecord>): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const recordSplits = new Map<string, Split>();

  for (const c of cases) {
    if (seen.has(c.id)) errors.push(`${c.id}: duplicate id`);
    seen.add(c.id);
    if (!c.id.startsWith(ID_PREFIX[c.split])) errors.push(`${c.id}: id prefix does not fit split ${c.split}`);
    if (c.critical !== CRITICAL_CATEGORIES.has(c.category)) {
      errors.push(`${c.id}: critical must be ${CRITICAL_CATEGORIES.has(c.category)} for ${c.category}`);
    }
    errors.push(...checkCategory(c), ...checkOverlap(c));
    for (const item of c.expected) {
      errors.push(...checkItem(c, item, records));
      // A record used in both splits would let tuning leak into the held-out result.
      for (const id of item.recordIds) {
        const other = recordSplits.get(id);
        if (other && other !== c.split) errors.push(`${c.id}: record ${id} is used in both splits`);
        recordSplits.set(id, c.split);
      }
    }
  }

  for (const category of CATEGORIES) {
    for (const split of SPLITS) {
      const n = cases.filter((c) => c.category === category && c.split === split).length;
      const want = QUOTAS[category][split];
      if (n !== want) errors.push(`quota: ${category}/${split} has ${n} case(s), expected ${want}`);
    }
  }
  return errors;
}

// Parses one .jsonl file. Returns the valid cases and one message per bad line.
export function parseCases(text: string, split: Split, label: string): { cases: EvalCase[]; errors: string[] } {
  const cases: EvalCase[] = [];
  const errors: string[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (line.trim() === "") return;
    let json: unknown;
    try {
      json = JSON.parse(line);
    } catch {
      errors.push(`${label}:${i + 1}: not valid JSON`);
      return;
    }
    const parsed = EvalCaseSchema.safeParse(json);
    if (!parsed.success) {
      const detail = parsed.error.issues.slice(0, 3).map((x) => `${x.path.join(".")}: ${x.message}`).join("; ");
      errors.push(`${label}:${i + 1}: ${detail}`);
      return;
    }
    if (parsed.data.split !== split) errors.push(`${label}:${i + 1}: ${parsed.data.id} has split ${parsed.data.split}`);
    cases.push(parsed.data);
  });
  return { cases, errors };
}
