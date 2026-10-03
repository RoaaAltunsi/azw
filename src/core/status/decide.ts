// The status rules: the only place a status is decided. A pure function of what the matchers
// reported; it reads no text, calls nothing and never branches on a specific kind.
// Every branch is listed in docs/ARCHITECTURE.md ("Status rules") and tested in decide.test.ts.
import type { MatchCandidate } from "../matchers";
import type { ClaimedKind, ContentLevel } from "../types";
import type { DecidedStatus, ReasonCode } from "./reason-codes";

// Initial values. To be tuned on eval/cases/tune.jsonl only, never on the held-out split.
export const STATUS_CONFIG = {
  T_HIGH: 0.8, // a close candidate at or above it is a wording difference
  T_LOW: 0.5, // below it nothing was found
  AMBIGUITY_MARGIN: 0.05, // candidates this close to the best one compete with it
} as const;
export type StatusConfig = Readonly<Record<keyof typeof STATUS_CONFIG, number>>;

// Scores are ratios of small integers; this absorbs the rounding of their differences.
const EPSILON = 1e-9;

// Claims that are not compared with a source record at all: the tool takes no side (AGENTS.md §3).
// An interpretive claim is level C, or level D when it rules on a personal case (`claimLevel`).
type ClaimLevel = Extract<ContentLevel, "C" | "D">;
const CLAIMS: Readonly<Record<string, (level: ClaimLevel) => { reasonCode: ReasonCode; contentLevel: ContentLevel }>> = {
  unclear_attribution: () => ({ reasonCode: "UNCLEAR_ATTRIBUTION", contentLevel: "A" }),
  interpretive_claim: (level) => ({ reasonCode: level === "D" ? "PERSONAL_RULING" : "INTERPRETIVE_CLAIM", contentLevel: level }),
};

export interface DecideInput {
  claimedKind: ClaimedKind;
  // For an interpretive claim, from whoever extracted it: "D" = a ruling for a personal case.
  // Absent = "C". Ignored for everything else.
  claimLevel?: ClaimLevel;
  // From every matcher, in any order.
  candidates: readonly MatchCandidate[];
}

export interface Decision {
  status: DecidedStatus;
  contentLevel: ContentLevel;
  reasonCode: ReasonCode;
  // The candidates the decision rests on, best first. Empty for NOT_FOUND and for claims.
  evidence: MatchCandidate[];
}

const isReviewed = (candidate: MatchCandidate): boolean => candidate.records.every((r) => r.reviewStatus === "reviewed");

// The text a candidate stands for, as a comparison key: two candidates with the same key are the
// same wording found in two places, not two readings of the quote.
const wording = (candidate: MatchCandidate): string => candidate.alignment.source.map((w) => w.key).join(" ");

export function decide(input: DecideInput, config: StatusConfig = STATUS_CONFIG): Decision {
  const result = (status: DecidedStatus, reasonCode: ReasonCode, evidence: MatchCandidate[] = []): Decision => ({
    status,
    contentLevel: "A",
    reasonCode,
    evidence,
  });
  // A result may rest on reviewed records only. Pending records give neither MATCH nor DIFFERS.
  const onReviewed = (candidates: MatchCandidate[], decision: (reviewed: MatchCandidate[]) => Decision): Decision => {
    const reviewed = candidates.filter(isReviewed);
    return reviewed.length > 0 ? decision(reviewed) : result("NEEDS_SPECIALIST", "SOURCE_NOT_REVIEWED", candidates);
  };

  const claim = Object.hasOwn(CLAIMS, input.claimedKind) ? CLAIMS[input.claimedKind] : undefined;
  if (claim) return { status: "NEEDS_SPECIALIST", ...claim(input.claimLevel ?? "C"), evidence: [] };

  // Stable: equal scores keep the matchers' order.
  const ranked = [...input.candidates].sort((a, b) => b.score - a.score);

  // 1. The quote occurs word for word, in a spelling the layer rules accept.
  const exact = ranked.filter((c) => c.hit === "exact" && c.spelling !== "error");
  if (exact.length > 0) {
    const ofClaimedKind = exact.filter((c) => c.kind === input.claimedKind);
    if (ofClaimedKind.length === 0) return onReviewed(exact, (reviewed) => result("DIFFERS", "KIND_MISMATCH", reviewed));

    const consistent = ofClaimedKind.filter((c) => c.reference.result === "consistent");
    if (consistent.length > 0) return onReviewed(consistent, (reviewed) => result("MATCH", "MATCH_REF_OK", reviewed));
    // A reference that could not be compared is never taken as correct, and never as wrong.
    const unchecked = ofClaimedKind.filter((c) => c.reference.result === "unchecked");
    if (unchecked.length > 0) return onReviewed(unchecked, (reviewed) => result("NEEDS_SPECIALIST", "REF_NOT_CHECKED", reviewed));
    return onReviewed(ofClaimedKind, (reviewed) => {
      for (const { reference } of reviewed) {
        if (reference.result === "mismatch") return result("DIFFERS", reference.reasonCode, reviewed);
      }
      return result("MATCH", "MATCH_NO_REFERENCE", reviewed);
    });
  }

  // 2. The quote occurs only in a spelling it is not entitled to: a spelling error, never MATCH.
  const misspelt = ranked.filter((c) => c.hit === "exact");
  if (misspelt.length > 0) return onReviewed(misspelt, (reviewed) => result("DIFFERS", "WORDING_DIFF", reviewed));

  // 3. Close candidates only.
  const best = ranked[0];
  if (!best || best.score < config.T_LOW) return result("NOT_FOUND", "NO_RECORD_IN_COVERED_SOURCES");
  const close = ranked.filter((c) => best.score - c.score <= config.AMBIGUITY_MARGIN + EPSILON);
  if (new Set(close.map(wording)).size > 1) return result("NEEDS_SPECIALIST", "AMBIGUOUS_CANDIDATES", close);
  if (best.score < config.T_HIGH) return result("NEEDS_SPECIALIST", "LOW_CONFIDENCE_MATCH", close);
  return onReviewed(close, (reviewed) => result("DIFFERS", "WORDING_DIFF", reviewed));
}
