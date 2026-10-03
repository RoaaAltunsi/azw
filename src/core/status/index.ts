// Deterministic status rules: the only place statuses are decided.
// Documented in docs/ARCHITECTURE.md ("Status rules").
export { decide, STATUS_CONFIG, type DecideInput, type Decision, type StatusConfig } from "./decide";
export { reasonAr, type ReasonContext } from "./reason";
export { REASON_CODES, type DecidedStatus, type ReasonCode, type ReferenceMismatchCode } from "./reason-codes";
