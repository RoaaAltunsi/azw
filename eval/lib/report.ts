// The markdown report of one evaluation run. Pure: it formats what the runner measured.
// A held-out case is shown by id and category only, never by its draft or its quotes, so that
// nothing can be tuned on it from the report (docs/EVALUATION.md, .claude/skills/evaluation).
import { CATEGORIES, type EvalCase, type Split } from "../../scripts/lib/cases.js";
import { STATUSES } from "../../src/core/types.js";
import {
  confusion,
  isWrong,
  LLM_UNAVAILABLE,
  NONE,
  percentile,
  summarize,
  type CaseScore,
  type ItemScore,
  type Ratio,
  type Unstable,
} from "./score.js";

export const MODES = ["regex", "llm", "merged"] as const;
export type Mode = (typeof MODES)[number];

// What one review cost. Tokens are the provider's own count when it reported one; the characters
// (prompt and draft in, model text out) are always counted, for the estimate.
export interface Usage {
  ms: number;
  llmCalls: number;
  inputTokens: number;
  outputTokens: number;
  tokensReported: boolean;
  inputChars: number;
  outputChars: number;
}

export interface ModeRun {
  mode: Mode;
  split: Split;
  scores: CaseScore[];
  usage: Usage[]; // one per draft, in the order of scores
}

export interface ReportInput {
  date: string;
  corpusVersion: string;
  coverage: readonly string[];
  // undefined = no LLM settings were found: only the regex mode ran.
  llm?: { provider: string; model: string; timeoutMs: number; extractPromptVersion: string; explainPromptVersion: string };
  cases: readonly EvalCase[];
  runs: readonly ModeRun[];
  // Held-out, merged mode, run several times; the first run is the one reported in the tables.
  stability?: { runs: number; items: number; unstable: Unstable[]; errorsWithEvidence: number };
}

// Characters per token, for the estimate used when the provider reports no token count.
export const CHARS_PER_TOKEN_ESTIMATE = 3;

const ratio = (r: Ratio): string => `${r.n} / ${r.of}`;
const table = (head: string[], rows: string[][]): string =>
  [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((row) => `| ${row.join(" | ")} |`)].join("\n");
const find = (runs: readonly ModeRun[], mode: Mode, split: Split): ModeRun | undefined =>
  runs.find((run) => run.mode === mode && run.split === split);
const SPLIT_TITLE: Record<Split, string> = { tune: "tune", heldout: "held-out" };

// ---------------------------------------------------------------------------------------------
// Release gate
// ---------------------------------------------------------------------------------------------

export interface GateLine {
  label: string;
  result: "PASS" | "FAIL" | "NOT RUN";
  detail: string;
}

// PASS only when every line was measured and passed: a mode that did not run cannot pass. The gate
// is about the held-out split: a run without it does not evaluate the gate at all.
export function releaseGate(input: Pick<ReportInput, "runs" | "stability">): { status: "PASS" | "FAIL" | "NOT EVALUATED"; lines: GateLine[] } {
  const lines: GateLine[] = (["merged", "regex"] as const).map((mode) => {
    const label = `Zero false confirmations on critical held-out cases, ${mode} mode`;
    const run = find(input.runs, mode, "heldout");
    if (!run) return { label, result: "NOT RUN", detail: "this mode was not run on the held-out split" };
    const critical = run.scores.filter((score) => score.critical);
    const wrong = critical.filter((score) => score.falseConfirmations.length > 0);
    const n = wrong.reduce((total, score) => total + score.falseConfirmations.length, 0);
    return {
      label,
      result: n === 0 ? "PASS" : "FAIL",
      detail: `${n} false confirmation(s) in ${critical.length} critical cases${n > 0 ? `: ${wrong.map((s) => s.id).join(", ")}` : ""}`,
    };
  });
  const errors =
    input.runs.reduce((total, run) => total + run.scores.reduce((t, score) => t + score.errorsWithEvidence, 0), 0) +
    (input.stability?.errorsWithEvidence ?? 0);
  lines.push({
    label: "No ERROR item carries evidence",
    result: errors === 0 ? "PASS" : "FAIL",
    detail: `${errors} ERROR item(s) with evidence, over every run of this report`,
  });
  if (!input.runs.some((run) => run.split === "heldout")) return { status: "NOT EVALUATED", lines };
  return { status: lines.every((line) => line.result === "PASS") ? "PASS" : "FAIL", lines };
}

// ---------------------------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------------------------

function metricsTable(scores: readonly CaseScore[]): string {
  const slices: Array<[string, CaseScore[]]> = [
    ["**all**", [...scores]],
    ["group: first 50", scores.filter((s) => s.group === "first50")],
    ["group: 35 added", scores.filter((s) => s.group === "added35")],
    ...CATEGORIES.map((category): [string, CaseScore[]] => [category, scores.filter((s) => s.category === category)]),
  ];
  const head = ["Slice", "Cases right", "False confirmations / MATCH returned", "Status", "Reason code", "Retrieval", "Reference", "Recall", "Precision", "Abstention", "Requests"];
  const rows = slices.map(([name, slice]) => {
    const m = summarize(slice);
    return [name, ...[m.casesRight, m.falseConfirmations, m.status, m.reason, m.retrieval, m.reference, m.recall, m.precision, m.abstention, m.scope].map(ratio)];
  });
  return table(head, rows);
}

function confusionTable(scores: readonly CaseScore[]): string {
  const counts = confusion(scores);
  const columns = [...STATUSES, NONE];
  const rows = [...STATUSES.filter((status) => status !== "ERROR"), NONE]
    .filter((expected) => counts[expected])
    .map((expected) => [
      expected === NONE ? "(no expected item)" : expected,
      ...columns.map((actual) => String(counts[expected]?.[actual] ?? 0)),
    ]);
  return table(["Expected ↓ / returned →", ...STATUSES, "(not extracted)"], rows);
}

const total = (usage: readonly Usage[], value: (u: Usage) => number): number => usage.reduce((sum, u) => sum + value(u), 0);
const round = (value: number | undefined): string => (value === undefined ? "—" : String(Math.round(value)));

function costRow(run: ModeRun): string[] {
  const drafts = run.usage.length;
  const calls = total(run.usage, (u) => u.llmCalls);
  const reported = run.usage.some((u) => u.tokensReported);
  const perDraft = (tokens: number): string => (drafts > 0 ? String(Math.round(tokens / drafts)) : "—");
  const input = reported ? total(run.usage, (u) => u.inputTokens) : total(run.usage, (u) => u.inputChars) / CHARS_PER_TOKEN_ESTIMATE;
  const output = reported ? total(run.usage, (u) => u.outputTokens) : total(run.usage, (u) => u.outputChars) / CHARS_PER_TOKEN_ESTIMATE;
  const failed = run.mode === "regex" ? 0 : run.scores.filter((score) => score.warnings.includes(LLM_UNAVAILABLE)).length;
  const ms = run.usage.map((u) => u.ms);
  return [
    run.mode,
    SPLIT_TITLE[run.split],
    String(drafts),
    round(percentile(ms, 50)),
    round(percentile(ms, 95)),
    String(calls),
    calls === 0 ? "0" : perDraft(input),
    calls === 0 ? "0" : perDraft(output),
    calls === 0 ? "—" : reported ? "reported by the SDK" : `**estimate** (characters ÷ ${CHARS_PER_TOKEN_ESTIMATE})`,
    run.mode === "regex" ? "—" : `${failed} / ${drafts}`,
  ];
}

// ---------------------------------------------------------------------------------------------
// Baseline comparison
// ---------------------------------------------------------------------------------------------

function baseline(runs: readonly ModeRun[], split: Split): string {
  const regex = find(runs, "regex", split);
  const merged = find(runs, "merged", split);
  const present = MODES.flatMap((mode) => find(runs, mode, split) ?? []);
  const rows = (
    [
      ["Cases right", (m) => m.casesRight],
      ["False confirmations / MATCH returned", (m) => m.falseConfirmations],
      ["Status accuracy", (m) => m.status],
      ["Reason-code accuracy", (m) => m.reason],
      ["Source retrieval", (m) => m.retrieval],
      ["Extraction recall", (m) => m.recall],
      ["Extraction precision", (m) => m.precision],
      ["Abstention", (m) => m.abstention],
      ["Requests given the scope message", (m) => m.scope],
    ] as Array<[string, (m: ReturnType<typeof summarize>) => Ratio]>
  ).map(([name, pick]) => [name, ...present.map((run) => ratio(pick(summarize(run.scores))))]);
  const out = [`### ${SPLIT_TITLE[split]}`, "", table(["Metric", ...present.map((run) => run.mode)], rows)];
  if (!regex || !merged) return [...out, "", "The merged mode did not run, so there is nothing to compare the baseline with."].join("\n");

  const right = (run: ModeRun): Set<string> => new Set(run.scores.filter((score) => !isWrong(score)).map((score) => score.id));
  const [regexRight, mergedRight] = [right(regex), right(merged)];
  const gained = merged.scores.filter((s) => mergedRight.has(s.id) && !regexRight.has(s.id)).map((s) => s.id);
  const lost = merged.scores.filter((s) => regexRight.has(s.id) && !mergedRight.has(s.id)).map((s) => s.id);
  const list = (ids: string[]): string => (ids.length > 0 ? ids.map((id) => `\`${id}\``).join(", ") : "none");
  const p50 = (run: ModeRun): string => round(percentile(run.usage.map((u) => u.ms), 50));
  const p95 = (run: ModeRun): string => round(percentile(run.usage.map((u) => u.ms), 95));
  const cost = costRow(merged);
  return [
    ...out,
    "",
    `- **What the LLM adds.** Cases right with the LLM and wrong without it (${gained.length}): ${list(gained)}.`,
    `- **What the LLM breaks.** Cases right without the LLM and wrong with it (${lost.length}): ${list(lost)}.`,
    `- **Explanations.** DIFFERS items returned in merged mode that carry a generated explanation (it passed the validator): ${ratio(summarize(merged.scores).explained)}.`,
    `- **What it costs.** Latency per draft p50 / p95: ${p50(regex)} / ${p95(regex)} ms (regex) against ${p50(merged)} / ${p95(merged)} ms (merged). ` +
      `LLM calls: ${cost[5]} over ${cost[2]} drafts; tokens per draft: ${cost[6]} in, ${cost[7]} out (${cost[8]}).`,
  ].join("\n");
}

// ---------------------------------------------------------------------------------------------
// Failures
// ---------------------------------------------------------------------------------------------

const outcome = (item: { status: string; reasonCode: string }): string => `${item.status} / ${item.reasonCode}`;

// What is wrong with one expected item, or undefined when it is as labeled. `quote`: the item's
// text, for tune cases only.
function itemProblem(item: ItemScore, n: number, quote: boolean): string | undefined {
  const name = quote ? `item ${n} «${item.expected.quote}»` : `item ${n}`;
  const expected = `expected ${outcome(item.expected)}`;
  if (!item.actual) return `${name}: ${expected} → not extracted`;
  const notes: string[] = [];
  if (!item.reasonOk) notes.push(`${expected} → got ${outcome(item.actual)}`);
  const got = item.actual.evidence.map((e) => e.record.id);
  if (item.retrievalOk === false) notes.push(`no expected record among the evidence (${got.length > 0 ? got.join(", ") : "no evidence"})`);
  else if (item.referenceOk === false) notes.push(`the first citation shown is ${got[0]}, not an expected record`);
  return notes.length > 0 ? `${name}: ${notes.join("; ")}` : undefined;
}

function caseProblems(score: CaseScore, quote: boolean): string[] {
  const confirmed = new Set(score.falseConfirmations);
  return [
    ...score.items.flatMap((item, i) => itemProblem(item, i + 1, quote) ?? []),
    ...score.extras.map(
      (extra) =>
        `${confirmed.has(extra) ? "**false confirmation**, " : ""}item with no label${quote ? ` «${extra.span.text}»` : ""}: ${outcome(extra)} (${extra.extractedBy.join("+")})`,
    ),
    // A MATCH on an item whose label is another status: already listed above, flagged here.
    ...score.items.flatMap((item, i) => (item.actual && confirmed.has(item.actual) ? [`**false confirmation** on item ${i + 1}`] : [])),
    ...(score.scopePass === false
      ? [`a request: expected zero items and NOT_A_DRAFT → got ${score.returned} item(s), warnings [${score.warnings.join(", ")}]`]
      : []),
  ];
}

function failures(input: ReportInput, split: Split): string {
  const runs = MODES.flatMap((mode) => find(input.runs, mode, split) ?? []);
  const cases = input.cases.filter((c) => c.split === split);
  const blocks = cases.flatMap((c) => {
    const wrong = runs.flatMap((run) => {
      const score = run.scores.find((s) => s.id === c.id);
      return score && isWrong(score) ? [{ mode: run.mode, score }] : [];
    });
    if (wrong.length === 0) return [];
    const okModes = runs.filter((run) => !wrong.some((w) => w.mode === run.mode)).map((run) => run.mode);
    const lines = wrong.flatMap(({ mode, score }) => {
      // The warnings of a run the LLM took part in: they tell a quote the model did not return
      // from one that was dropped (NOT_A_DRAFT, LLM_SPAN_NOT_IN_DRAFT).
      const warnings = mode !== "regex" && score.warnings.length > 0 ? ` [warnings: ${score.warnings.join(", ")}]` : "";
      return caseProblems(score, split === "tune").map((problem) => `- ${mode}: ${problem}${warnings}`);
    });
    return [
      [
        `**\`${c.id}\`** — ${c.category}${c.critical ? ", critical" : ""}${okModes.length > 0 ? ` (as labeled in: ${okModes.join(", ")})` : ""}`,
        ...(split === "tune" ? ["", `> ${c.draft.replace(/\s*\n\s*/g, " ")}`] : []),
        "",
        ...lines,
      ].join("\n"),
    ];
  });
  const note =
    split === "heldout"
      ? "Held-out cases are shown by id and category only. Their drafts and quotes are left out on purpose, so that no fix can be tuned on them."
      : "Tune cases are shown with their draft: rules may be tuned on these.";
  return [`### ${SPLIT_TITLE[split]}`, "", note, "", blocks.length > 0 ? blocks.join("\n\n") : "No wrong case."].join("\n");
}

// ---------------------------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------------------------

export function renderReport(input: ReportInput): string {
  const splits = (["tune", "heldout"] as const).filter((split) => input.runs.some((run) => run.split === split));
  const gate = releaseGate(input);
  const llm = input.llm;
  const llmFailures = input.runs
    .filter((run) => run.mode !== "regex")
    .reduce((n, run) => n + run.scores.filter((score) => score.warnings.includes(LLM_UNAVAILABLE)).length, 0);
  const out: string[] = [
    `# Evaluation — ${input.date} — corpus ${input.corpusVersion}`,
    "",
    "Written by `eval/run-eval.ts` (`npm run eval`). Method and definitions: `docs/EVALUATION.md`.",
    "",
    "**The cases were not reviewed by a person.** They were drafted and checked by an AI assistant (`docs/EVALUATION.md` §1).",
    "",
    "## Run",
    "",
    `- Corpus version: \`${input.corpusVersion}\`; collections searched: ${input.coverage.join(", ")}.`,
    `- Cases: ${splits.map((split) => `${input.cases.filter((c) => c.split === split).length} ${SPLIT_TITLE[split]}`).join(", ")}.`,
    llm
      ? `- LLM: provider \`${llm.provider}\`, model \`${llm.model}\`, time budget ${llm.timeoutMs} ms. Extraction prompt version ${llm.extractPromptVersion}, explanation prompt version ${llm.explainPromptVersion}.`
      : "- **No usable LLM settings were found (LLM_PROVIDER, LLM_MODEL, LLM_API_KEY). Only the regex mode ran: this report holds no LLM numbers.**",
    ...(llmFailures > 0
      ? [`- **The LLM extraction failed or timed out on ${llmFailures} draft run(s)** (see "Latency and LLM cost per draft"). Such a run went on with what the other extractors found, and its numbers are counted as they came.`]
      : []),
    "- Modes: `regex` = the regex extractor alone (the baseline); `llm` = the LLM extractor alone; `merged` = both (production).",
    `- Pairing: a returned item is paired with an expected item when their spans overlap with IoU ≥ 0.5, one to one.`,
    "- Every number is a count over its denominator. 85 cases is a small sample.",
    "",
    "## Release gate",
    "",
    `**${gate.status}**`,
    "",
    ...gate.lines.map((line) => `- ${line.result} — ${line.label}: ${line.detail}.`),
    "",
    "## Baseline comparison: regex against merged",
    "",
    ...splits.flatMap((split) => [baseline(input.runs, split), ""]),
    "## Metrics",
    "",
    "Columns: **Cases right** = nothing in the case differs from its label. **False confirmations** = MATCH items not paired with an",
    "expected MATCH item, over the MATCH items returned (the primary metric). **Status**, **Reason code** = expected items whose paired",
    "item has the expected status (and reason code), over the expected items; an item that was not extracted counts as wrong.",
    "**Retrieval** = an expected record is among the evidence; **Reference** = the first citation shown is that of an expected record;",
    "both over the expected items that list records. **Recall** = expected items found; **Precision** = returned items that are an",
    "expected item. **Abstention** = expected NOT_FOUND and NEEDS_SPECIALIST items that end so. **Requests** = inputs that are not a",
    "draft, answered with zero items and the warning NOT_A_DRAFT.",
    "",
  ];
  for (const split of splits) {
    for (const mode of MODES) {
      const run = find(input.runs, mode, split);
      if (!run) continue;
      out.push(`### ${SPLIT_TITLE[split]}, ${mode} mode`, "", metricsTable(run.scores), "", confusionTable(run.scores), "");
    }
  }

  out.push("## Stability", "");
  if (input.stability) {
    const { runs, items, unstable } = input.stability;
    out.push(`Held-out, merged mode, ${runs} runs. Items of two runs are the same item when their spans overlap with IoU ≥ 0.5. Items seen in any run: ${items}. Items whose status was not the same in every run: ${unstable.length} / ${items}.`, "");
    if (unstable.length > 0) {
      const category = (id: string): string => input.cases.find((c) => c.id === id)?.category ?? "";
      out.push(
        table(
          ["Case", "Category", "Item (characters of the draft)", ...Array.from({ length: runs }, (_, i) => `Run ${i + 1}`)],
          unstable.map((u) => [`\`${u.caseId}\``, category(u.caseId), `${u.span.start}–${u.span.end}`, ...u.statuses]),
        ),
        "",
      );
    }
  } else {
    out.push("Not measured: it needs the held-out split and the LLM.", "");
  }

  out.push(
    "## Latency and LLM cost per draft",
    "",
    "One draft at a time, on the machine that ran the evaluation; the corpus was loaded before the first draft.",
    "",
    table(
      ["Mode", "Split", "Drafts", "p50 ms", "p95 ms", "LLM calls", "Tokens in / draft", "Tokens out / draft", "Token count", "Drafts where the LLM extraction failed"],
      input.runs.map(costRow),
    ),
    "",
    "## Failures",
    "",
    ...splits.flatMap((split) => [failures(input, split), ""]),
  );
  return `${out.join("\n").trimEnd()}\n`;
}
