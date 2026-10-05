// Scoring of one review result against one labeled case, and the sums over cases. Pure: no I/O,
// no clock, no LLM. Every metric is a count over a denominator, never a bare percentage.
// The definitions are documented in docs/EVALUATION.md ("Runner and metrics").
import type { EvalCase, ExpectedItem } from "../../scripts/lib/cases.js";
import type { ReviewItem, ReviewResult, Status } from "../../src/core/types.js";

export interface Span {
  start: number;
  end: number;
}

export interface Ratio {
  n: number;
  of: number;
}

export const MIN_IOU = 0.5;
export const NOT_A_DRAFT = "NOT_A_DRAFT";
export const LLM_UNAVAILABLE = "LLM_UNAVAILABLE_REGEX_ONLY";

// Intersection over union of two spans of the draft, in characters.
export function iou(a: Span, b: Span): number {
  const shared = Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
  const union = a.end - a.start + (b.end - b.start) - shared;
  return union > 0 ? shared / union : 0;
}

// One-to-one pairs [expected index, actual index] with IoU ≥ min: the best overlap first, so an
// item never takes a partner that another item overlaps more.
export function pairSpans(expected: readonly Span[], actual: readonly Span[], min = MIN_IOU): Array<[number, number]> {
  const overlaps = expected
    .flatMap((e, i) => actual.map((a, j) => ({ i, j, value: iou(e, a) })))
    .filter((o) => o.value >= min)
    .sort((x, y) => y.value - x.value || x.i - y.i || x.j - y.j);
  const usedExpected = new Set<number>();
  const usedActual = new Set<number>();
  const pairs: Array<[number, number]> = [];
  for (const { i, j } of overlaps) {
    if (usedExpected.has(i) || usedActual.has(j)) continue;
    usedExpected.add(i);
    usedActual.add(j);
    pairs.push([i, j]);
  }
  return pairs.sort((x, y) => x[0] - y[0]);
}

// The two groups of cases, always reported apart (docs/EVALUATION.md §8): the first 50
// (T-001–T-020, H-001–H-030) and the 35 added on 2026-10-04.
export type Group = "first50" | "added35";
export function groupOf(id: string): Group {
  const n = Number(id.slice(2));
  return n <= (id.startsWith("T-") ? 20 : 30) ? "first50" : "added35";
}

export interface ItemScore {
  expected: ExpectedItem;
  actual?: ReviewItem; // absent = no returned item overlaps the expected quote enough
  statusOk: boolean;
  reasonOk: boolean; // the status and the reason code are both the expected ones
  // Only when the label lists records: one of them is among the evidence; the first evidence
  // record (the one whose citation the reason sentence shows) is one of them.
  retrievalOk?: boolean;
  referenceOk?: boolean;
}

export interface CaseScore {
  id: string;
  split: EvalCase["split"];
  category: EvalCase["category"];
  critical: boolean;
  group: Group;
  items: ItemScore[];
  extras: ReviewItem[]; // returned items paired with no expected item
  returned: number;
  matchReturned: number;
  falseConfirmations: ReviewItem[]; // MATCH items not paired with an expected MATCH item
  scopePass?: boolean; // only for a request (expectScopeMessage)
  errorsWithEvidence: number;
  differsReturned: number;
  explained: number; // DIFFERS items that carry a generated explanation
  warnings: string[];
}

export function scoreCase(c: EvalCase, result: Pick<ReviewResult, "items" | "warnings">): CaseScore {
  const expectedSpans = c.expected.map((e) => {
    const start = c.draft.indexOf(e.quote);
    return { start, end: start + e.quote.length };
  });
  const pairs = new Map(pairSpans(expectedSpans, result.items.map((item) => item.span)));
  const paired = new Set(pairs.values());

  const items = c.expected.map((expected, i): ItemScore => {
    const j = pairs.get(i);
    const actual = j === undefined ? undefined : result.items[j];
    const statusOk = actual?.status === expected.status;
    const score: ItemScore = { expected, actual, statusOk, reasonOk: statusOk && actual?.reasonCode === expected.reasonCode };
    if (expected.recordIds.length > 0) {
      const ids = actual?.evidence.map((e) => e.record.id) ?? [];
      score.retrievalOk = ids.some((id) => expected.recordIds.includes(id));
      score.referenceOk = ids.length > 0 && expected.recordIds.includes(ids[0]!);
    }
    return score;
  });

  const expectedMatch = new Set(c.expected.flatMap((e, i) => (e.status === "MATCH" && pairs.has(i) ? [pairs.get(i)!] : [])));
  const matches = result.items.flatMap((item, j) => (item.status === "MATCH" ? [{ item, j }] : []));

  return {
    id: c.id,
    split: c.split,
    category: c.category,
    critical: c.critical,
    group: groupOf(c.id),
    items,
    extras: result.items.filter((_, j) => !paired.has(j)),
    returned: result.items.length,
    matchReturned: matches.length,
    falseConfirmations: matches.filter(({ j }) => !expectedMatch.has(j)).map(({ item }) => item),
    ...(c.expectScopeMessage ? { scopePass: result.items.length === 0 && result.warnings.includes(NOT_A_DRAFT) } : {}),
    errorsWithEvidence: result.items.filter((item) => item.status === "ERROR" && item.evidence.length > 0).length,
    differsReturned: result.items.filter((item) => item.status === "DIFFERS").length,
    explained: result.items.filter((item) => item.status === "DIFFERS" && item.explanation !== undefined).length,
    warnings: [...result.warnings],
  };
}

// A case is wrong when anything in it differs from its label: it is then listed under "Failures".
export function isWrong(score: CaseScore): boolean {
  return (
    score.items.some((item) => !item.reasonOk || item.retrievalOk === false || item.referenceOk === false) ||
    score.extras.length > 0 ||
    score.falseConfirmations.length > 0 ||
    score.scopePass === false
  );
}

// The critical cases, three ways: fully as labeled; wrong, but with no false confirmation (an
// abstention, a missed item, an item no label expects); and with a false confirmation. The
// release gate reads the last count only, so the report states the first two beside it.
export interface CriticalCounts {
  cases: number;
  right: number;
  wrongWithoutFalseConfirmation: number;
  withFalseConfirmation: number;
}

export function criticalCounts(scores: readonly CaseScore[]): CriticalCounts {
  const critical = scores.filter((score) => score.critical);
  const withFalseConfirmation = critical.filter((score) => score.falseConfirmations.length > 0).length;
  const right = critical.filter((score) => !isWrong(score)).length;
  return { cases: critical.length, right, wrongWithoutFalseConfirmation: critical.length - right - withFalseConfirmation, withFalseConfirmation };
}

export interface Metrics {
  cases: number;
  casesRight: Ratio; // cases with nothing wrong (isWrong)
  falseConfirmations: Ratio; // of the MATCH items returned
  status: Ratio; // of the expected items
  reason: Ratio; // of the expected items
  retrieval: Ratio; // of the expected items that list records
  reference: Ratio; // of the expected items that list records
  recall: Ratio; // expected items found, of the expected items
  precision: Ratio; // returned items that are an expected item, of the returned items
  abstention: Ratio; // expected NOT_FOUND and NEEDS_SPECIALIST items that end so
  scope: Ratio; // requests answered with zero items and NOT_A_DRAFT
  explained: Ratio; // DIFFERS items returned that carry a generated explanation
}

const count = <T>(list: readonly T[], test: (value: T) => boolean): number => list.filter(test).length;
const sum = <T>(list: readonly T[], value: (item: T) => number): number => list.reduce((total, item) => total + value(item), 0);

export function summarize(scores: readonly CaseScore[]): Metrics {
  const items = scores.flatMap((score) => score.items);
  const withRecords = items.filter((item) => item.expected.recordIds.length > 0);
  const abstain = items.filter((item) => item.expected.status === "NOT_FOUND" || item.expected.status === "NEEDS_SPECIALIST");
  const requests = scores.filter((score) => score.scopePass !== undefined);
  const found = count(items, (item) => item.actual !== undefined);
  return {
    cases: scores.length,
    casesRight: { n: count(scores, (score) => !isWrong(score)), of: scores.length },
    falseConfirmations: { n: sum(scores, (s) => s.falseConfirmations.length), of: sum(scores, (s) => s.matchReturned) },
    status: { n: count(items, (item) => item.statusOk), of: items.length },
    reason: { n: count(items, (item) => item.reasonOk), of: items.length },
    retrieval: { n: count(withRecords, (item) => item.retrievalOk === true), of: withRecords.length },
    reference: { n: count(withRecords, (item) => item.referenceOk === true), of: withRecords.length },
    recall: { n: found, of: items.length },
    precision: { n: found, of: sum(scores, (s) => s.returned) },
    abstention: { n: count(abstain, (item) => item.statusOk), of: abstain.length },
    scope: { n: count(requests, (score) => score.scopePass === true), of: requests.length },
    explained: { n: sum(scores, (s) => s.explained), of: sum(scores, (s) => s.differsReturned) },
  };
}

// Rows: the expected status, or NONE for a returned item that no label expects. Columns: the
// returned status, or NONE for an expected item that was not extracted.
export const NONE = "NONE";
export type Confusion = Record<string, Record<string, number>>;

export function confusion(scores: readonly CaseScore[]): Confusion {
  const table: Confusion = {};
  const add = (expected: string, actual: string): void => {
    const row = (table[expected] ??= {});
    row[actual] = (row[actual] ?? 0) + 1;
  };
  for (const score of scores) {
    for (const item of score.items) add(item.expected.status, item.actual?.status ?? NONE);
    for (const extra of score.extras) add(NONE, extra.status);
  }
  return table;
}

// Nearest-rank percentile (p in 0–100) of a list of numbers; undefined for an empty list.
export function percentile(values: readonly number[], p: number): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];
}

// Stability: the items whose status is not the same in every run of the same cases. The model
// may cut the same quote a character wider or narrower from one run to the next, so the items of
// two runs are the same item when their spans pair (pairSpans), not when their offsets are equal.
// "ABSENT" = no item of that run pairs with it.
export const ABSENT = "ABSENT";
export interface RunItem {
  caseId: string;
  span: Span;
  status: Status;
}
export interface Unstable {
  caseId: string;
  span: Span; // as first seen
  statuses: string[]; // one per run
}

export function unstableItems(runs: ReadonlyArray<readonly RunItem[]>): { items: number; unstable: Unstable[] } {
  const seen: Unstable[] = [];
  const caseIds = [...new Set(runs.flatMap((run) => run.map((item) => item.caseId)))].sort();
  for (const caseId of caseIds) {
    const ofCase: Unstable[] = [];
    runs.forEach((run, r) => {
      const items = run.filter((item) => item.caseId === caseId);
      const pairs = new Map(pairSpans(items.map((item) => item.span), ofCase.map((known) => known.span)));
      items.forEach((item, i) => {
        const j = pairs.get(i);
        const known = j === undefined ? { caseId, span: { start: item.span.start, end: item.span.end }, statuses: runs.map(() => ABSENT) } : ofCase[j]!;
        if (j === undefined) ofCase.push(known);
        known.statuses[r] = item.status;
      });
    });
    seen.push(...ofCase.sort((a, b) => a.span.start - b.span.start));
  }
  return { items: seen.length, unstable: seen.filter((item) => item.statuses.some((status) => status !== item.statuses[0])) };
}
