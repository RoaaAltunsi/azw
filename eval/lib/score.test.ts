// The scoring functions on small hand-made inputs. Nothing here loads the corpus or calls an LLM.
import { describe, expect, test } from "vitest";
import type { EvalCase, ExpectedItem } from "../../scripts/lib/cases.js";
import type { ReviewItem, Status } from "../../src/core/types.js";
import { confusion, groupOf, iou, isWrong, NONE, pairSpans, percentile, scoreCase, summarize, unstableItems } from "./score.js";

const DRAFT = "aaaa QUOTE-ONE bbbb QUOTE-TWO cccc";

function expected(quote: string, status: ExpectedItem["status"], reasonCode: string, recordIds: string[] = []): ExpectedItem {
  return { quote, kind: "hadith", status, recordIds, reasonCode };
}

function evalCase(items: ExpectedItem[], over: Partial<EvalCase> = {}): EvalCase {
  return { id: "T-001", split: "tune", category: "EXACT", critical: false, draft: DRAFT, expected: items, notes: "n", ...over };
}

// A returned item over the given text of the draft, with evidence records by id.
function returned(text: string, status: Status, reasonCode: string, recordIds: string[] = []): ReviewItem {
  const start = DRAFT.indexOf(text);
  return {
    id: `item-${start}-${start + text.length}`,
    span: { start, end: start + text.length, text },
    claimedKind: "hadith",
    status,
    contentLevel: "A",
    reasonCode,
    reasonAr: "r",
    evidence: recordIds.map((id) => ({
      record: {
        id,
        kind: "hadith",
        collection: "bukhari",
        exactText: "t",
        citation: { display: "d" },
        sourceName: "s",
        edition: "e",
        license: "l",
        reviewStatus: "reviewed" as const,
      },
      score: 1,
    })),
    extractedBy: ["regex"],
  };
}

const result = (items: ReviewItem[], warnings: string[] = []) => ({ items, warnings });

describe("iou", () => {
  test.each([
    [{ start: 0, end: 10 }, { start: 0, end: 10 }, 1],
    [{ start: 0, end: 10 }, { start: 5, end: 15 }, 5 / 15],
    [{ start: 0, end: 10 }, { start: 10, end: 20 }, 0],
    [{ start: 0, end: 10 }, { start: 2, end: 8 }, 0.6],
  ])("%o and %o → %d", (a, b, value) => {
    expect(iou(a, b)).toBeCloseTo(value);
    expect(iou(b, a)).toBeCloseTo(value);
  });
});

describe("pairSpans", () => {
  test("pairs at IoU ≥ 0.5 and leaves the rest unpaired", () => {
    const pairs = pairSpans(
      [{ start: 0, end: 10 }, { start: 20, end: 30 }],
      [{ start: 21, end: 30 }, { start: 0, end: 4 }, { start: 50, end: 60 }],
    );
    expect(pairs).toEqual([[1, 0]]);
  });

  test("exactly 0.5 is a pair", () => {
    expect(pairSpans([{ start: 0, end: 10 }], [{ start: 0, end: 5 }])).toEqual([[0, 0]]);
  });

  test("one to one: the better overlap wins, the other item stays unpaired", () => {
    const pairs = pairSpans([{ start: 0, end: 10 }], [{ start: 0, end: 6 }, { start: 0, end: 9 }]);
    expect(pairs).toEqual([[0, 1]]);
  });

  test("an actual item that two expected items overlap goes to the closer one", () => {
    const pairs = pairSpans([{ start: 0, end: 10 }, { start: 2, end: 10 }], [{ start: 2, end: 10 }]);
    expect(pairs).toEqual([[1, 0]]);
  });
});

describe("groupOf", () => {
  test.each([
    ["T-001", "first50"],
    ["T-020", "first50"],
    ["T-021", "added35"],
    ["H-030", "first50"],
    ["H-031", "added35"],
  ])("%s → %s", (id, group) => expect(groupOf(id)).toBe(group));
});

describe("scoreCase", () => {
  test("an item as labeled: status, reason, retrieval and reference are right", () => {
    const score = scoreCase(
      evalCase([expected("QUOTE-ONE", "MATCH", "MATCH_REF_OK", ["bukhari:1", "muslim:2"])]),
      result([returned("QUOTE-ONE", "MATCH", "MATCH_REF_OK", ["muslim:2"])]),
    );
    expect(score.items[0]).toMatchObject({ statusOk: true, reasonOk: true, retrievalOk: true, referenceOk: true });
    expect(score.falseConfirmations).toEqual([]);
    expect(score.extras).toEqual([]);
    expect(isWrong(score)).toBe(false);
  });

  test("the right status with another reason code is a reason miss only", () => {
    const score = scoreCase(
      evalCase([expected("QUOTE-ONE", "DIFFERS", "WORDING_DIFF", ["bukhari:1"])]),
      result([returned("QUOTE-ONE", "DIFFERS", "REF_MISMATCH_NUMBER", ["bukhari:1"])]),
    );
    expect(score.items[0]).toMatchObject({ statusOk: true, reasonOk: false });
    expect(isWrong(score)).toBe(true);
  });

  test("retrieval looks at all the evidence, reference at the first record only", () => {
    const score = scoreCase(
      evalCase([expected("QUOTE-ONE", "MATCH", "MATCH_REF_OK", ["bukhari:1"])]),
      result([returned("QUOTE-ONE", "MATCH", "MATCH_REF_OK", ["bukhari:9", "bukhari:1"])]),
    );
    expect(score.items[0]).toMatchObject({ retrievalOk: true, referenceOk: false });
    expect(isWrong(score)).toBe(true);
  });

  test("a label without records has no retrieval or reference score", () => {
    const score = scoreCase(
      evalCase([expected("QUOTE-ONE", "NOT_FOUND", "NO_RECORD_IN_COVERED_SOURCES")]),
      result([returned("QUOTE-ONE", "NOT_FOUND", "NO_RECORD_IN_COVERED_SOURCES")]),
    );
    expect(score.items[0]!.retrievalOk).toBeUndefined();
    expect(score.items[0]!.referenceOk).toBeUndefined();
    expect(isWrong(score)).toBe(false);
  });

  test("an expected item that was not extracted is wrong on every count", () => {
    const score = scoreCase(evalCase([expected("QUOTE-ONE", "MATCH", "MATCH_REF_OK", ["bukhari:1"])]), result([]));
    expect(score.items[0]).toMatchObject({ actual: undefined, statusOk: false, reasonOk: false, retrievalOk: false, referenceOk: false });
  });

  test("false confirmation: a MATCH where the label says DIFFERS", () => {
    const score = scoreCase(
      evalCase([expected("QUOTE-ONE", "DIFFERS", "WORDING_DIFF", ["bukhari:1"])]),
      result([returned("QUOTE-ONE", "MATCH", "MATCH_REF_OK", ["bukhari:1"])]),
    );
    expect(score.matchReturned).toBe(1);
    expect(score.falseConfirmations).toHaveLength(1);
  });

  test("false confirmation: a MATCH that no label expects", () => {
    const score = scoreCase(
      evalCase([expected("QUOTE-ONE", "MATCH", "MATCH_REF_OK", ["bukhari:1"])]),
      result([returned("QUOTE-ONE", "MATCH", "MATCH_REF_OK", ["bukhari:1"]), returned("QUOTE-TWO", "MATCH", "MATCH_NO_REFERENCE", ["bukhari:5"])]),
    );
    expect(score.matchReturned).toBe(2);
    expect(score.falseConfirmations.map((item) => item.span.text)).toEqual(["QUOTE-TWO"]);
    expect(score.extras).toHaveLength(1);
  });

  test("an unexpected item that is not a MATCH is an extra, not a false confirmation", () => {
    const score = scoreCase(evalCase([expected("QUOTE-ONE", "MATCH", "MATCH_REF_OK", ["bukhari:1"])]), result([
      returned("QUOTE-ONE", "MATCH", "MATCH_REF_OK", ["bukhari:1"]),
      returned("QUOTE-TWO", "NOT_FOUND", "NO_RECORD_IN_COVERED_SOURCES"),
    ]));
    expect(score.falseConfirmations).toEqual([]);
    expect(score.extras).toHaveLength(1);
    expect(isWrong(score)).toBe(true);
  });

  test("a request passes with zero items and NOT_A_DRAFT, and with nothing less", () => {
    const request = evalCase([], { expectScopeMessage: true, category: "ADVERSARIAL", critical: true });
    expect(scoreCase(request, result([], ["NOT_A_DRAFT"])).scopePass).toBe(true);
    expect(scoreCase(request, result([], ["LLM_UNAVAILABLE_REGEX_ONLY"])).scopePass).toBe(false);
    expect(scoreCase(request, result([returned("QUOTE-ONE", "NOT_FOUND", "X")], ["NOT_A_DRAFT"])).scopePass).toBe(false);
    expect(scoreCase(evalCase([expected("QUOTE-ONE", "MATCH", "MATCH_REF_OK", ["bukhari:1"])]), result([])).scopePass).toBeUndefined();
  });

  test("DIFFERS items with a generated explanation are counted", () => {
    const explained = { ...returned("QUOTE-ONE", "DIFFERS", "WORDING_DIFF", ["bukhari:1"]), explanation: { text: "x", generated: true as const } };
    const score = scoreCase(evalCase([expected("QUOTE-ONE", "DIFFERS", "WORDING_DIFF", ["bukhari:1"])]), result([explained, returned("QUOTE-TWO", "DIFFERS", "WORDING_DIFF", ["bukhari:2"])]));
    expect([score.explained, score.differsReturned]).toEqual([1, 2]);
  });

  test("an ERROR item that carries evidence is counted", () => {
    const score = scoreCase(evalCase([expected("QUOTE-ONE", "MATCH", "MATCH_REF_OK", ["bukhari:1"])]), result([
      returned("QUOTE-ONE", "ERROR", "INTERNAL_ERROR", ["bukhari:1"]),
      returned("QUOTE-TWO", "ERROR", "INTERNAL_ERROR"),
    ]));
    expect(score.errorsWithEvidence).toBe(1);
  });
});

describe("summarize and confusion", () => {
  // Case 1: two labels, both found, one with a wrong status that is a false MATCH.
  // Case 2: one label not extracted, and one item nobody expects.
  // Case 3: a request, answered as one.
  const scores = [
    scoreCase(
      evalCase([expected("QUOTE-ONE", "MATCH", "MATCH_REF_OK", ["bukhari:1"]), expected("QUOTE-TWO", "NOT_FOUND", "NO_RECORD_IN_COVERED_SOURCES")], { id: "T-001" }),
      result([returned("QUOTE-ONE", "MATCH", "MATCH_REF_OK", ["bukhari:1"]), returned("QUOTE-TWO", "MATCH", "MATCH_NO_REFERENCE", ["bukhari:7"])]),
    ),
    scoreCase(
      evalCase([expected("QUOTE-ONE", "NEEDS_SPECIALIST", "UNCLEAR_ATTRIBUTION")], { id: "T-021", category: "AMBIGUOUS" }),
      result([returned("QUOTE-TWO", "DIFFERS", "WORDING_DIFF", ["bukhari:3"])]),
    ),
    scoreCase(evalCase([], { id: "T-019", expectScopeMessage: true, category: "ADVERSARIAL", critical: true }), result([], ["NOT_A_DRAFT"])),
  ];

  test("every metric is a count over its denominator", () => {
    expect(summarize(scores)).toEqual({
      cases: 3,
      casesRight: { n: 1, of: 3 },
      falseConfirmations: { n: 1, of: 2 },
      status: { n: 1, of: 3 },
      reason: { n: 1, of: 3 },
      retrieval: { n: 1, of: 1 },
      reference: { n: 1, of: 1 },
      recall: { n: 2, of: 3 },
      precision: { n: 2, of: 3 },
      abstention: { n: 0, of: 2 },
      scope: { n: 1, of: 1 },
      explained: { n: 0, of: 1 },
    });
  });

  test("an empty list gives zero denominators, not an error", () => {
    expect(summarize([]).status).toEqual({ n: 0, of: 0 });
  });

  test("confusion: rows are expected, columns returned, NONE on either side for the unpaired", () => {
    expect(confusion(scores)).toEqual({
      MATCH: { MATCH: 1 },
      NOT_FOUND: { MATCH: 1 },
      NEEDS_SPECIALIST: { [NONE]: 1 },
      [NONE]: { DIFFERS: 1 },
    });
  });
});

describe("percentile", () => {
  test("nearest rank", () => {
    const values = [50, 10, 40, 20, 30];
    expect(percentile(values, 50)).toBe(30);
    expect(percentile(values, 95)).toBe(50);
    expect(percentile(values, 0)).toBe(10);
    expect(percentile([7], 95)).toBe(7);
    expect(percentile([], 50)).toBeUndefined();
  });
});

describe("unstableItems", () => {
  const run = (items: Array<[string, number, number, Status]>) => items.map(([caseId, start, end, status]) => ({ caseId, span: { start, end }, status }));

  test("lists the items whose status changed, or that a run did not return", () => {
    const { items, unstable } = unstableItems([
      run([["H-001", 0, 50, "MATCH"], ["H-002", 30, 90, "DIFFERS"], ["H-003", 10, 40, "NOT_FOUND"]]),
      run([["H-001", 0, 50, "MATCH"], ["H-002", 30, 90, "NEEDS_SPECIALIST"], ["H-003", 10, 40, "NOT_FOUND"]]),
      run([["H-001", 0, 50, "MATCH"], ["H-002", 30, 90, "DIFFERS"]]),
    ]);
    expect(items).toBe(3);
    expect(unstable).toEqual([
      { caseId: "H-002", span: { start: 30, end: 90 }, statuses: ["DIFFERS", "NEEDS_SPECIALIST", "DIFFERS"] },
      { caseId: "H-003", span: { start: 10, end: 40 }, statuses: ["NOT_FOUND", "NOT_FOUND", "ABSENT"] },
    ]);
  });

  test("a span cut one character wider in another run is the same item", () => {
    const runs = [run([["H-004", 61, 163, "MATCH"]]), run([["H-004", 62, 162, "MATCH"]]), run([["H-004", 62, 162, "MATCH"]])];
    expect(unstableItems(runs)).toEqual({ items: 1, unstable: [] });
  });

  test("an item that only a later run returns is listed as absent before it", () => {
    const { items, unstable } = unstableItems([
      run([["H-016", 33, 124, "DIFFERS"]]),
      run([["H-016", 33, 124, "DIFFERS"], ["H-016", 141, 167, "NEEDS_SPECIALIST"]]),
    ]);
    expect(items).toBe(2);
    expect(unstable).toEqual([{ caseId: "H-016", span: { start: 141, end: 167 }, statuses: ["ABSENT", "NEEDS_SPECIALIST"] }]);
  });

  test("the same span in two cases is two items", () => {
    const one = run([["H-001", 0, 9, "MATCH"], ["H-002", 0, 9, "DIFFERS"]]);
    expect(unstableItems([one, one])).toEqual({ items: 2, unstable: [] });
  });
});
