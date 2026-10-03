// The reason codes the status rules can give, by status. One Arabic sentence per code lives in
// src/i18n/ar.ts under "reason.<CODE>". Listed in docs/ARCHITECTURE.md ("Status rules").
import type { Status } from "../types";

export const REASON_CODES = {
  MATCH: ["MATCH_REF_OK", "MATCH_NO_REFERENCE"],
  DIFFERS: [
    "WORDING_DIFF",
    "REF_MISMATCH_AYAH",
    "REF_MISMATCH_SURAH",
    "REF_MISMATCH_COLLECTION",
    "REF_MISMATCH_NUMBER",
    "REF_NOT_AGREED_UPON",
    "KIND_MISMATCH",
  ],
  NOT_FOUND: ["NO_RECORD_IN_COVERED_SOURCES"],
  NEEDS_SPECIALIST: [
    "REF_NOT_CHECKED",
    "LOW_CONFIDENCE_MATCH",
    "AMBIGUOUS_CANDIDATES",
    "SOURCE_NOT_REVIEWED",
    "UNCLEAR_ATTRIBUTION",
    "INTERPRETIVE_CLAIM",
    "PERSONAL_RULING",
  ],
} as const satisfies Partial<Record<Status, readonly string[]>>;

// ERROR is a system state set by the orchestrator, never by the status rules.
export type DecidedStatus = keyof typeof REASON_CODES;
export type ReasonCode = (typeof REASON_CODES)[DecidedStatus][number];

// What a matcher may report when the cited reference contradicts the record it found: the Quran
// matcher the ayah and the surah, the hadith matcher the collection, the number and «متفق عليه».
export type ReferenceMismatchCode = Extract<ReasonCode, `REF_MISMATCH_${string}` | "REF_NOT_AGREED_UPON">;
