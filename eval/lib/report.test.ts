// The report on hand-made runs: the release gate, the honesty lines, and what a held-out failure
// may show. Nothing here loads the corpus or calls an LLM.
import { describe, expect, test } from "vitest";
import type { EvalCase } from "../../scripts/lib/cases.js";
import type { ReviewItem, Status } from "../../src/core/types.js";
import { releaseGate, renderReport, type Mode, type ModeRun, type ReportInput, type Usage } from "./report.js";
import { scoreCase } from "./score.js";

const TUNE_DRAFT = "tune-draft-words TUNE-QUOTE more-words";
const HELDOUT_DRAFT = "heldout-draft-words HELDOUT-QUOTE more-words";

const tune: EvalCase = {
  id: "T-008",
  split: "tune",
  category: "WORDING_ERROR",
  critical: true,
  draft: TUNE_DRAFT,
  expected: [{ quote: "TUNE-QUOTE", kind: "quran", status: "DIFFERS", recordIds: ["quran:1:1"], reasonCode: "WORDING_DIFF" }],
  notes: "n",
};
const heldout: EvalCase = { ...tune, id: "H-010", split: "heldout", draft: HELDOUT_DRAFT, expected: [{ ...tune.expected[0]!, quote: "HELDOUT-QUOTE" }] };

function item(draft: string, text: string, status: Status, withEvidence = true): ReviewItem {
  const start = draft.indexOf(text);
  const record = { id: "quran:1:1", kind: "quran", collection: "quran", exactText: "t", citation: { display: "d" }, sourceName: "s", edition: "e", license: "l", reviewStatus: "reviewed" as const };
  return {
    id: `item-${start}-${start + text.length}`,
    span: { start, end: start + text.length, text },
    claimedKind: "quran",
    status,
    contentLevel: "A",
    reasonCode: status === "MATCH" ? "MATCH_NO_REFERENCE" : "WORDING_DIFF",
    reasonAr: "r",
    evidence: withEvidence ? [{ record, score: 1 }] : [],
    extractedBy: ["regex"],
  };
}

const usage: Usage = { ms: 10, llmCalls: 0, inputTokens: 0, outputTokens: 0, tokensReported: false, inputChars: 0, outputChars: 0 };

function run(mode: Mode, c: EvalCase, items: ReviewItem[], warnings: string[] = [], u: Usage = usage): ModeRun {
  return { mode, split: c.split, scores: [scoreCase(c, { items, warnings })], usage: [u] };
}

const input = (runs: ModeRun[], over: Partial<ReportInput> = {}): ReportInput => ({
  date: "2026-10-04",
  corpusVersion: "v-test",
  coverage: ["quran"],
  cases: [tune, heldout],
  runs,
  ...over,
});

const good = (mode: Mode): ModeRun => run(mode, heldout, [item(HELDOUT_DRAFT, "HELDOUT-QUOTE", "DIFFERS")]);
const falseMatch = (mode: Mode): ModeRun => run(mode, heldout, [item(HELDOUT_DRAFT, "HELDOUT-QUOTE", "MATCH")]);

describe("releaseGate", () => {
  test("PASS: no false confirmation on critical held-out cases in merged and in regex mode", () => {
    const gate = releaseGate({ runs: [good("regex"), good("merged")] });
    expect(gate.status).toBe("PASS");
    expect(gate.lines.map((line) => line.result)).toEqual(["PASS", "PASS", "PASS"]);
  });

  test.each(["regex", "merged"] as const)("FAIL: a false confirmation on a critical held-out case in %s mode", (mode) => {
    const other = mode === "regex" ? "merged" : "regex";
    const gate = releaseGate({ runs: [falseMatch(mode), good(other)] });
    expect(gate.status).toBe("FAIL");
    expect(gate.lines.find((line) => line.label.includes(mode))!.detail).toContain("H-010");
  });

  test("a false confirmation on a case that is not critical does not fail the gate", () => {
    const mild = { ...heldout, critical: false };
    const gate = releaseGate({ runs: [run("regex", mild, [item(HELDOUT_DRAFT, "HELDOUT-QUOTE", "MATCH")]), good("merged")] });
    expect(gate.status).toBe("PASS");
  });

  test("a false confirmation in the llm mode alone does not fail the gate", () => {
    expect(releaseGate({ runs: [good("regex"), good("merged"), falseMatch("llm")] }).status).toBe("PASS");
  });

  test("FAIL: the merged mode did not run, so it cannot pass", () => {
    const gate = releaseGate({ runs: [good("regex")] });
    expect(gate.status).toBe("FAIL");
    expect(gate.lines[0]!.result).toBe("NOT RUN");
  });

  test("FAIL: an ERROR item with evidence, in a table run or in a stability run", () => {
    const broken = run("regex", heldout, [{ ...item(HELDOUT_DRAFT, "HELDOUT-QUOTE", "ERROR") }]);
    expect(releaseGate({ runs: [broken, good("merged")] }).status).toBe("FAIL");
    const stability = { runs: 3, items: 1, unstable: [], errorsWithEvidence: 1 };
    expect(releaseGate({ runs: [good("regex"), good("merged")], stability }).status).toBe("FAIL");
  });

  test("NOT EVALUATED: a run without the held-out split", () => {
    expect(releaseGate({ runs: [run("regex", tune, [])] }).status).toBe("NOT EVALUATED");
  });
});

describe("renderReport", () => {
  test("a held-out failure shows the id and the category, never the draft or the quote", () => {
    const report = renderReport(input([run("regex", heldout, [item(HELDOUT_DRAFT, "more-words", "MATCH")])]));
    expect(report).toContain("**`H-010`** — WORDING_ERROR, critical");
    expect(report).toContain("item 1: expected DIFFERS / WORDING_DIFF → not extracted");
    expect(report).toContain("**false confirmation**, item with no label: MATCH / MATCH_NO_REFERENCE");
    expect(report).not.toContain("HELDOUT-QUOTE");
    expect(report).not.toContain("heldout-draft-words");
    expect(report).not.toContain("more-words");
  });

  test("a tune failure shows the draft and the quote", () => {
    const report = renderReport(input([run("regex", tune, [item(TUNE_DRAFT, "TUNE-QUOTE", "MATCH")])]));
    expect(report).toContain(`> ${TUNE_DRAFT}`);
    expect(report).toContain("item 1 «TUNE-QUOTE»: expected DIFFERS / WORDING_DIFF → got MATCH / MATCH_NO_REFERENCE");
    expect(report).toContain("**false confirmation** on item 1");
  });

  test("a case that is as labeled is not listed", () => {
    const report = renderReport(input([run("regex", tune, [item(TUNE_DRAFT, "TUNE-QUOTE", "DIFFERS")])]));
    expect(report).toContain("No wrong case.");
    expect(report).not.toContain("`T-008`");
  });

  test("without an LLM the report says so, holds no LLM table, and always says no person reviewed the cases", () => {
    const report = renderReport(input([good("regex")]));
    expect(report).toContain("Only the regex mode ran: this report holds no LLM numbers.");
    expect(report).toContain("The cases were not reviewed by a person.");
    expect(report).not.toContain("merged mode\n");
    expect(report).toContain("**FAIL**");
    expect(report).toContain("Not measured: it needs the held-out split and the LLM.");
  });

  test("tokens are labeled as an estimate unless the provider reported them", () => {
    const llm = { provider: "p", model: "m", timeoutMs: 1, extractPromptVersion: "1", explainPromptVersion: "2" };
    const estimated = { ...usage, llmCalls: 1, inputChars: 300, outputChars: 30 };
    expect(renderReport(input([good("regex"), run("merged", heldout, [], [], estimated)], { llm }))).toContain("| 100 | 10 | **estimate** (characters ÷ 3) |");
    const reported = { ...estimated, tokensReported: true, inputTokens: 80, outputTokens: 8 };
    expect(renderReport(input([good("regex"), run("merged", heldout, [], [], reported)], { llm }))).toContain("| 80 | 8 | reported by the SDK |");
  });

  test("a failed LLM extraction is counted and named", () => {
    const llm = { provider: "p", model: "m", timeoutMs: 1, extractPromptVersion: "1", explainPromptVersion: "2" };
    const report = renderReport(input([good("regex"), run("merged", heldout, [], ["LLM_UNAVAILABLE_REGEX_ONLY"])], { llm }));
    expect(report).toContain("The LLM extraction failed or timed out on 1 draft run(s)");
  });

  test("stability lists a changed item by case and place only", () => {
    const stability = { runs: 3, items: 4, unstable: [{ caseId: "H-010", span: { start: 3, end: 9 }, statuses: ["DIFFERS", "MATCH", "DIFFERS"] }], errorsWithEvidence: 0 };
    const report = renderReport(input([good("regex"), good("merged")], { stability }));
    expect(report).toContain("not the same in every run: 1 / 4");
    expect(report).toContain("| `H-010` | WORDING_ERROR | 3–9 | DIFFERS | MATCH | DIFFERS |");
  });
});

describe("critical cases", () => {
  test("the report counts them three ways, per mode and per stability run", () => {
    const extra = run("merged", heldout, [item(HELDOUT_DRAFT, "HELDOUT-QUOTE", "DIFFERS"), item(HELDOUT_DRAFT, "more-words", "DIFFERS")]);
    const stability = { runs: 2, items: 2, unstable: [], errorsWithEvidence: 0, passes: [extra.scores, falseMatch("merged").scores] };
    const report = renderReport(input([good("regex"), extra], { stability }));
    expect(report).toContain("| held-out | regex | 1 | 1 / 1 | 0 | 0 |");
    expect(report).toContain("| held-out | merged | 1 | 0 / 1 | 1 | 0 |");
    expect(report).toContain("| 1 | 0 / 1 | 0 / 0 | 1 / 1 | 1 / 2 | 1 | 0 / 1 | 1 | 0 |");
    expect(report).toContain("| 2 | 0 / 1 | 1 / 1 | 0 / 1 | 1 / 1 | 1 | 0 / 1 | 0 | 1 |");
  });
});
