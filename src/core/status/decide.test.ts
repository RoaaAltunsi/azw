// Table-driven: one row per branch of decide(). The candidates are hand-made, so that each row
// states exactly what the matchers reported.
import { describe, expect, test } from "vitest";
import { hadith } from "../corpus/test-fixtures";
import type { MatchCandidate } from "../matchers";
import { STATUSES } from "../types";
import { decide, REASON_CODES, STATUS_CONFIG, type Decision } from "./index";

interface Shape {
  id?: string;
  kind?: string;
  hit?: MatchCandidate["hit"];
  spelling?: MatchCandidate["spelling"];
  score?: number;
  reference?: "none" | "consistent" | "unchecked" | "REF_MISMATCH_AYAH" | "REF_MISMATCH_SURAH";
  pending?: boolean | "partly";
  wording?: string;
}

function candidate(shape: Shape = {}): MatchCandidate {
  const { id = "1", kind = "quran", hit = "exact", spelling = "same", reference = "none", pending = false, wording = "نص المصدر" } = shape;
  const status = (isPending: boolean) => ({ kind, reviewStatus: isPending ? ("pending" as const) : ("reviewed" as const) });
  const records = [hadith("fixture", id, wording, status(pending === true))];
  if (pending === "partly") records.push(hadith("fixture", `${id}b`, wording, status(true)));
  return {
    kind,
    collection: "fixture",
    recordIds: records.map((r) => r.id),
    records,
    score: shape.score ?? (hit === "exact" && spelling !== "error" ? 1 : 0.9),
    layer: "default",
    hit,
    spelling,
    reference:
      reference === "REF_MISMATCH_AYAH" || reference === "REF_MISMATCH_SURAH" ? { result: "mismatch", reasonCode: reference } : { result: reference },
    alignment: {
      quote: [],
      source: wording.split(" ").map((key, i) => ({ key, recordId: records[0]!.id, start: i, end: i + 1 })),
    },
  };
}

const fuzzy = (score: number, shape: Shape = {}): MatchCandidate => candidate({ hit: "fuzzy", score, ...shape });
const outcome = (d: Decision): string => `${d.status}/${d.reasonCode}/${d.contentLevel} [${d.evidence.map((c) => c.recordIds[0]).join(",")}]`;

type Row = [name: string, claimedKind: string, candidates: MatchCandidate[], expected: string, claimLevel?: "C" | "D"];

const rows: Row[] = [
  // --- claims: never compared, whatever was found ---
  ["an interpretive claim", "interpretive_claim", [], "NEEDS_SPECIALIST/INTERPRETIVE_CLAIM/C []"],
  ["an interpretive claim, even next to an exact hit", "interpretive_claim", [candidate()], "NEEDS_SPECIALIST/INTERPRETIVE_CLAIM/C []"],
  ["an interpretive claim marked level C", "interpretive_claim", [], "NEEDS_SPECIALIST/INTERPRETIVE_CLAIM/C []", "C"],
  ["a ruling for a personal case: an interpretive claim of level D", "interpretive_claim", [candidate()], "NEEDS_SPECIALIST/PERSONAL_RULING/D []", "D"],
  ["a claim level changes nothing for an unclear attribution", "unclear_attribution", [], "NEEDS_SPECIALIST/UNCLEAR_ATTRIBUTION/A []", "D"],
  ["a claim level changes nothing for a quote", "quran", [candidate()], "MATCH/MATCH_NO_REFERENCE/A [fixture:1]", "D"],
  ["an unclear attribution", "unclear_attribution", [], "NEEDS_SPECIALIST/UNCLEAR_ATTRIBUTION/A []"],
  ["an unclear attribution, even when the text is in a source", "unclear_attribution", [candidate()], "NEEDS_SPECIALIST/UNCLEAR_ATTRIBUTION/A []"],

  // --- exact, of the claimed kind ---
  ["exact, no reference", "quran", [candidate()], "MATCH/MATCH_NO_REFERENCE/A [fixture:1]"],
  ["exact, reference consistent", "quran", [candidate({ reference: "consistent" })], "MATCH/MATCH_REF_OK/A [fixture:1]"],
  ["exact through an accepted spelling", "quran", [candidate({ spelling: "bridged", reference: "consistent" })], "MATCH/MATCH_REF_OK/A [fixture:1]"],
  ["exact, wrong ayah", "quran", [candidate({ reference: "REF_MISMATCH_AYAH" })], "DIFFERS/REF_MISMATCH_AYAH/A [fixture:1]"],
  ["exact, wrong surah", "quran", [candidate({ reference: "REF_MISMATCH_SURAH" })], "DIFFERS/REF_MISMATCH_SURAH/A [fixture:1]"],
  ["exact, reference not checked (unknown or partial)", "quran", [candidate({ reference: "unchecked" })], "NEEDS_SPECIALIST/REF_NOT_CHECKED/A [fixture:1]"],
  [
    "two occurrences, the reference agrees with one: only that one is the evidence",
    "quran",
    [candidate({ id: "1", reference: "REF_MISMATCH_SURAH" }), candidate({ id: "2", reference: "consistent" })],
    "MATCH/MATCH_REF_OK/A [fixture:2]",
  ],
  [
    "two occurrences, the reference agrees with neither: the first one's reason",
    "quran",
    [candidate({ id: "1", reference: "REF_MISMATCH_AYAH" }), candidate({ id: "2", reference: "REF_MISMATCH_SURAH" })],
    "DIFFERS/REF_MISMATCH_AYAH/A [fixture:1,fixture:2]",
  ],
  [
    "two occurrences without a reference: one MATCH with both",
    "quran",
    [candidate({ id: "1" }), candidate({ id: "2" })],
    "MATCH/MATCH_NO_REFERENCE/A [fixture:1,fixture:2]",
  ],
  [
    "an unchecked reference is not outvoted by a mismatch elsewhere",
    "quran",
    [candidate({ id: "1", reference: "REF_MISMATCH_SURAH" }), candidate({ id: "2", reference: "unchecked" })],
    "NEEDS_SPECIALIST/REF_NOT_CHECKED/A [fixture:2]",
  ],
  ["an exact hit outranks a fuzzy candidate", "quran", [fuzzy(1, { id: "2" }), candidate()], "MATCH/MATCH_NO_REFERENCE/A [fixture:1]"],

  // --- exact, of another kind ---
  ["exact in a record of another kind", "hadith", [candidate({ kind: "quran" })], "DIFFERS/KIND_MISMATCH/A [fixture:1]"],
  [
    "kind mismatch comes before the reference",
    "hadith",
    [candidate({ kind: "quran", reference: "consistent" })],
    "DIFFERS/KIND_MISMATCH/A [fixture:1]",
  ],
  [
    "exact in both kinds: the claimed kind decides",
    "hadith",
    [candidate({ id: "1", kind: "quran" }), candidate({ id: "2", kind: "hadith" })],
    "MATCH/MATCH_NO_REFERENCE/A [fixture:2]",
  ],
  ["a kind nobody registered is handled like any other", "dua", [candidate({ kind: "dua" })], "MATCH/MATCH_NO_REFERENCE/A [fixture:1]"],

  // --- pending records: never MATCH, never DIFFERS ---
  ["exact in a pending record", "quran", [candidate({ pending: true })], "NEEDS_SPECIALIST/SOURCE_NOT_REVIEWED/A [fixture:1]"],
  ["exact, reference consistent, pending", "quran", [candidate({ pending: true, reference: "consistent" })], "NEEDS_SPECIALIST/SOURCE_NOT_REVIEWED/A [fixture:1]"],
  ["exact, wrong ayah, pending", "quran", [candidate({ pending: true, reference: "REF_MISMATCH_AYAH" })], "NEEDS_SPECIALIST/SOURCE_NOT_REVIEWED/A [fixture:1]"],
  ["exact, other kind, pending", "hadith", [candidate({ pending: true })], "NEEDS_SPECIALIST/SOURCE_NOT_REVIEWED/A [fixture:1]"],
  ["exact over two records, one of them pending", "quran", [candidate({ pending: "partly" })], "NEEDS_SPECIALIST/SOURCE_NOT_REVIEWED/A [fixture:1]"],
  [
    "exact in a reviewed and in a pending record: MATCH on the reviewed one only",
    "quran",
    [candidate({ id: "1", pending: true }), candidate({ id: "2" })],
    "MATCH/MATCH_NO_REFERENCE/A [fixture:2]",
  ],
  [
    "the reference agrees only with a pending record: not MATCH, and not a wrong reference",
    "quran",
    [candidate({ id: "1", pending: true, reference: "consistent" }), candidate({ id: "2", reference: "REF_MISMATCH_AYAH" })],
    "NEEDS_SPECIALIST/SOURCE_NOT_REVIEWED/A [fixture:1]",
  ],
  ["a spelling error in a pending record", "quran", [candidate({ spelling: "error", pending: true })], "NEEDS_SPECIALIST/SOURCE_NOT_REVIEWED/A [fixture:1]"],
  ["a close candidate in a pending record", "quran", [fuzzy(0.9, { pending: true })], "NEEDS_SPECIALIST/SOURCE_NOT_REVIEWED/A [fixture:1]"],

  // --- spelling error per the layer rules ---
  ["a spelling error is never MATCH", "quran", [candidate({ spelling: "error", score: 0.9 })], "DIFFERS/WORDING_DIFF/A [fixture:1]"],
  ["a spelling error with a consistent reference", "quran", [candidate({ spelling: "error", reference: "consistent" })], "DIFFERS/WORDING_DIFF/A [fixture:1]"],
  ["a spelling error in a short quote, score below T_LOW", "quran", [candidate({ spelling: "error", score: 0.4 })], "DIFFERS/WORDING_DIFF/A [fixture:1]"],

  // --- close candidates ---
  ["score above T_HIGH", "quran", [fuzzy(0.9)], "DIFFERS/WORDING_DIFF/A [fixture:1]"],
  ["score 1 without an exact hit (a word is missing)", "quran", [fuzzy(1)], "DIFFERS/WORDING_DIFF/A [fixture:1]"],
  ["score exactly T_HIGH", "quran", [fuzzy(0.8)], "DIFFERS/WORDING_DIFF/A [fixture:1]"],
  ["a close candidate of another kind is still a wording difference", "hadith", [fuzzy(0.9, { kind: "quran" })], "DIFFERS/WORDING_DIFF/A [fixture:1]"],
  ["score just below T_HIGH", "quran", [fuzzy(0.79)], "NEEDS_SPECIALIST/LOW_CONFIDENCE_MATCH/A [fixture:1]"],
  ["score exactly T_LOW", "quran", [fuzzy(0.5)], "NEEDS_SPECIALIST/LOW_CONFIDENCE_MATCH/A [fixture:1]"],
  ["mid score in a pending record", "quran", [fuzzy(0.6, { pending: true })], "NEEDS_SPECIALIST/LOW_CONFIDENCE_MATCH/A [fixture:1]"],
  ["score just below T_LOW", "quran", [fuzzy(0.49)], "NOT_FOUND/NO_RECORD_IN_COVERED_SOURCES/A []"],
  ["no candidates", "quran", [], "NOT_FOUND/NO_RECORD_IN_COVERED_SOURCES/A []"],
  ["the best candidate decides, whatever the order", "quran", [fuzzy(0.3, { id: "1" }), fuzzy(0.9, { id: "2" })], "DIFFERS/WORDING_DIFF/A [fixture:2]"],

  // --- ambiguity ---
  [
    "two candidates within the margin, different texts",
    "quran",
    [fuzzy(0.9, { id: "1", wording: "نص أول" }), fuzzy(0.86, { id: "2", wording: "نص ثان" })],
    "NEEDS_SPECIALIST/AMBIGUOUS_CANDIDATES/A [fixture:1,fixture:2]",
  ],
  [
    "exactly on the margin",
    "quran",
    [fuzzy(0.9, { id: "1", wording: "نص أول" }), fuzzy(0.85, { id: "2", wording: "نص ثان" })],
    "NEEDS_SPECIALIST/AMBIGUOUS_CANDIDATES/A [fixture:1,fixture:2]",
  ],
  [
    "outside the margin: the best one alone",
    "quran",
    [fuzzy(0.9, { id: "1", wording: "نص أول" }), fuzzy(0.84, { id: "2", wording: "نص ثان" })],
    "DIFFERS/WORDING_DIFF/A [fixture:1]",
  ],
  [
    "within the margin, same text: one wording found in two places, not ambiguity",
    "quran",
    [fuzzy(0.9, { id: "1" }), fuzzy(0.9, { id: "2" })],
    "DIFFERS/WORDING_DIFF/A [fixture:1,fixture:2]",
  ],
  [
    "ambiguity in the middle band",
    "quran",
    [fuzzy(0.6, { id: "1", wording: "نص أول" }), fuzzy(0.6, { id: "2", wording: "نص ثان" })],
    "NEEDS_SPECIALIST/AMBIGUOUS_CANDIDATES/A [fixture:1,fixture:2]",
  ],
  [
    "below T_LOW nothing is ambiguous: nothing was found",
    "quran",
    [fuzzy(0.4, { id: "1", wording: "نص أول" }), fuzzy(0.4, { id: "2", wording: "نص ثان" })],
    "NOT_FOUND/NO_RECORD_IN_COVERED_SOURCES/A []",
  ],
  [
    "exact hits are never ambiguous with a close candidate",
    "quran",
    [candidate({ id: "1" }), fuzzy(0.99, { id: "2", wording: "نص ثان" })],
    "MATCH/MATCH_NO_REFERENCE/A [fixture:1]",
  ],
];

describe("decide", () => {
  test.each(rows)("%s", (_name, claimedKind, candidates, expected, claimLevel) => {
    expect(outcome(decide({ claimedKind, candidates, claimLevel }))).toBe(expected);
  });

  test("the thresholds come from the config object", () => {
    expect(STATUS_CONFIG).toEqual({ T_HIGH: 0.8, T_LOW: 0.5, AMBIGUITY_MARGIN: 0.05 });
    const strict = { T_HIGH: 0.95, T_LOW: 0.7, AMBIGUITY_MARGIN: 0 };
    expect(outcome(decide({ claimedKind: "quran", candidates: [fuzzy(0.9)] }, strict))).toBe("NEEDS_SPECIALIST/LOW_CONFIDENCE_MATCH/A [fixture:1]");
    expect(outcome(decide({ claimedKind: "quran", candidates: [fuzzy(0.6)] }, strict))).toBe("NOT_FOUND/NO_RECORD_IN_COVERED_SOURCES/A []");
  });

  test("it is pure: the input is not changed and the same input gives the same result", () => {
    const candidates = [fuzzy(0.3, { id: "1" }), fuzzy(0.9, { id: "2" })];
    const order = candidates.map((c) => c.recordIds[0]);
    const first = decide({ claimedKind: "quran", candidates });
    expect(candidates.map((c) => c.recordIds[0])).toEqual(order);
    expect(decide({ claimedKind: "quran", candidates })).toEqual(first);
  });

  test("every row's reason code belongs to its status, and every code has a row", () => {
    const seen = new Set<string>();
    for (const [, claimedKind, candidates, , claimLevel] of rows) {
      const d = decide({ claimedKind, candidates, claimLevel });
      expect(REASON_CODES[d.status] as readonly string[]).toContain(d.reasonCode);
      seen.add(d.reasonCode);
    }
    expect([...seen].sort()).toEqual(Object.values(REASON_CODES).flat().sort());
  });

  test("MATCH always rests on reviewed records only, and ERROR is never decided", () => {
    for (const [, claimedKind, candidates, , claimLevel] of rows) {
      const d = decide({ claimedKind, candidates, claimLevel });
      expect(STATUSES).toContain(d.status);
      expect(d.status).not.toBe("ERROR");
      if (d.status !== "MATCH") continue;
      expect(d.evidence.length).toBeGreaterThan(0);
      for (const c of d.evidence) for (const r of c.records) expect(r.reviewStatus).toBe("reviewed");
    }
  });
});
