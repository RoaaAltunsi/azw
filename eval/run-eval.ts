// Measures the pipeline on the labeled cases (eval/cases) and writes eval/results/<date>-<corpusVersion>.md.
// It calls review() directly, with the real corpus and the real LLM port, in three modes:
// regex (the baseline), llm, and merged (production). It measures; it changes nothing.
//
//   npm run eval                      both splits
//   npm run eval -- --split tune      one split (tune | heldout)
//
// The LLM settings come from .env (the npm script passes --env-file-if-exists). Without them only
// the regex mode runs, and the report says so.
//
// Privacy and held-out: nothing here prints a draft, a quote or a setting's value. The console
// shows counts only; the report shows held-out cases by id and category.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { regexExtractor } from "../src/core/extract/index.js";
import { review, searchedCoverage, type LlmPort, type ReviewDeps } from "../src/core/review.js";
import { ReviewResultSchema } from "../src/core/types.js";
import { createLlmPort, readLlmConfig } from "../src/llm/index.js";
import { EXPLAIN_PROMPT_VERSION, EXPLAIN_SYSTEM_PROMPT, explainUserMessage } from "../src/llm/prompts/explain.js";
import { EXTRACT_PROMPT_VERSION, EXTRACT_SYSTEM_PROMPT, extractUserMessage } from "../src/llm/prompts/extract.js";
import { loadCorpus } from "../src/server/corpus-loader.js";
import { parseCases, SPLITS, type EvalCase, type Split } from "../scripts/lib/cases.js";
import { p, ROOT } from "../scripts/lib/util.js";
import { MODES, releaseGate, renderReport, type Mode, type ModeRun, type ReportInput, type Usage } from "./lib/report.js";
import { scoreCase, summarize, unstableItems, type RunItem } from "./lib/score.js";

const STABILITY_RUNS = 3;

// ---------------------------------------------------------------------------------------------
// LLM cost, read without changing LlmPort
// ---------------------------------------------------------------------------------------------

const meter = { calls: 0, inputChars: 0, outputChars: 0, inputTokens: 0, outputTokens: 0, reported: 0 };

// The provider's own token count: the `usage` object of a JSON response body. Only those two
// numbers are read; nothing of a body is kept or printed.
function meterFetch(): void {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
    const response = await realFetch(...args);
    try {
      const body = (await response.clone().json()) as { usage?: { input_tokens?: unknown; output_tokens?: unknown } } | null;
      const { input_tokens: input, output_tokens: output } = body?.usage ?? {};
      if (typeof input === "number" && typeof output === "number") {
        meter.inputTokens += input;
        meter.outputTokens += output;
        meter.reported++;
      }
    } catch {
      // Not JSON, or the body was cut: no count for this response.
    }
    return response;
  };
}

// Calls and text lengths, for the estimate used when the provider reports no tokens.
function meterPort(port: LlmPort): LlmPort {
  return {
    async extractQuotes(draft) {
      meter.calls++;
      meter.inputChars += EXTRACT_SYSTEM_PROMPT.length + extractUserMessage(draft).length;
      const extraction = await port.extractQuotes(draft);
      meter.outputChars += JSON.stringify(extraction).length;
      return extraction;
    },
    async explainDiff(input) {
      meter.calls++;
      meter.inputChars += EXPLAIN_SYSTEM_PROMPT.length + explainUserMessage(input).length;
      const text = await port.explainDiff(input);
      meter.outputChars += text?.length ?? 0;
      return text;
    },
  };
}

// ---------------------------------------------------------------------------------------------
// One mode over one list of cases, one draft at a time
// ---------------------------------------------------------------------------------------------

async function runMode(mode: Mode, split: Split, cases: readonly EvalCase[], deps: ReviewDeps): Promise<{ run: ModeRun; items: RunItem[] }> {
  const run: ModeRun = { mode, split, scores: [], usage: [] };
  const items: RunItem[] = [];
  for (const c of cases) {
    const before = { ...meter };
    const started = performance.now();
    const result = await review(c.draft, deps);
    const ms = performance.now() - started;
    // The same gate as the API: a result that does not fit the contract would never be sent.
    const valid = ReviewResultSchema.safeParse(result);
    if (!valid.success) {
      throw new Error(`${c.id} (${mode}): the result does not fit ReviewResultSchema (${valid.error.issues.map((i) => i.path.join(".")).join(", ")})`);
    }
    const usage: Usage = {
      ms,
      llmCalls: meter.calls - before.calls,
      inputTokens: meter.inputTokens - before.inputTokens,
      outputTokens: meter.outputTokens - before.outputTokens,
      tokensReported: meter.reported > before.reported,
      inputChars: meter.inputChars - before.inputChars,
      outputChars: meter.outputChars - before.outputChars,
    };
    run.scores.push(scoreCase(c, result));
    run.usage.push(usage);
    items.push(...result.items.map((item) => ({ caseId: c.id, span: { start: item.span.start, end: item.span.end }, status: item.status })));
  }
  const m = summarize(run.scores);
  console.log(
    `${split.padEnd(8)}${mode.padEnd(8)}cases right ${m.casesRight.n}/${m.casesRight.of}  false confirmations ${m.falseConfirmations.n}/${m.falseConfirmations.of}  status ${m.status.n}/${m.status.of}  recall ${m.recall.n}/${m.recall.of}`,
  );
  return { run, items };
}

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------

function readSplits(argv: readonly string[]): Split[] {
  const i = argv.indexOf("--split");
  if (i < 0) return [...SPLITS];
  const split = SPLITS.find((s) => s === argv[i + 1]);
  if (!split) throw new Error("--split takes tune or heldout");
  return [split];
}

function today(): string {
  const now = new Date();
  const two = (n: number): string => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
}

async function main(): Promise<void> {
  const splits = readSplits(process.argv.slice(2));
  const cases = splits.flatMap((split) => {
    const rel = `eval/cases/${split}.jsonl`;
    const parsed = parseCases(readFileSync(p(rel), "utf8"), split, rel);
    if (parsed.errors.length > 0) throw new Error(`${rel} is not valid: run npm run check:cases`);
    return parsed.cases;
  });

  const corpus = loadCorpus(ROOT);
  const config = readLlmConfig();
  meterFetch();
  const port = createLlmPort(config);
  const llm = port ? meterPort(port) : undefined;
  if (!llm) console.log("No usable LLM settings (LLM_PROVIDER, LLM_MODEL, LLM_API_KEY): the regex mode only.");

  const base = { ...corpus, now: () => performance.now() };
  const depsOf: Record<Mode, ReviewDeps | undefined> = {
    regex: { ...base, extractors: [regexExtractor] },
    llm: llm && { ...base, extractors: [], llm },
    merged: llm && { ...base, extractors: [regexExtractor], llm },
  };

  const runs: ModeRun[] = [];
  let stability: ReportInput["stability"];
  for (const split of splits) {
    const ofSplit = cases.filter((c) => c.split === split);
    for (const mode of MODES) {
      const deps = depsOf[mode];
      if (!deps) continue;
      const first = await runMode(mode, split, ofSplit, deps);
      runs.push(first.run);
      if (split !== "heldout" || mode !== "merged") continue;
      // Stability: the same cases again. The first run is the one the tables report.
      const repeats = [first];
      while (repeats.length < STABILITY_RUNS) repeats.push(await runMode(mode, split, ofSplit, deps));
      stability = {
        runs: STABILITY_RUNS,
        ...unstableItems(repeats.map((r) => r.items)),
        errorsWithEvidence: repeats.slice(1).reduce((n, r) => n + r.run.scores.reduce((t, score) => t + score.errorsWithEvidence, 0), 0),
      };
    }
  }

  const input: ReportInput = {
    date: today(),
    corpusVersion: corpus.corpusVersion,
    coverage: searchedCoverage(corpus.coverage, corpus.index),
    ...(llm && config
      ? { llm: { provider: config.provider, model: config.model, timeoutMs: config.timeoutMs, extractPromptVersion: EXTRACT_PROMPT_VERSION, explainPromptVersion: EXPLAIN_PROMPT_VERSION } }
      : {}),
    cases,
    runs,
    ...(stability ? { stability } : {}),
  };
  // A one-split run gets its own file, so that it never replaces a full report.
  const name = `${input.date}-${corpus.corpusVersion}${splits.length === 1 ? `-${splits[0]}` : ""}.md`;
  mkdirSync(p("eval/results"), { recursive: true });
  writeFileSync(p("eval/results", name), renderReport(input));

  const gate = releaseGate(input);
  console.log(`\nRelease gate: ${gate.status}`);
  for (const line of gate.lines) console.log(`  ${line.result.padEnd(8)}${line.label}: ${line.detail}`);
  console.log(`\nReport: eval/results/${name}`);
  if (gate.status === "FAIL") process.exitCode = 1;
}

main().catch((error: unknown) => {
  // The message of an error raised here names files and case ids only; any other error is shown by its class.
  console.error(error instanceof Error && error.constructor === Error ? error.message : `Evaluation failed: ${error instanceof Error ? error.name : "unknown error"}`);
  process.exitCode = 1;
});
