// The Matcher contract: one Matcher per ContentKind. A matcher finds where a quote stands in the
// records of its kind and reports what it found. It decides no status (src/core/status does).
// Documented in docs/ARCHITECTURE.md ("Quran matcher", "Hadith matcher").
import type { CorpusIndex } from "../corpus";
import type { Alignment } from "../diff";
import type { ReferenceMismatchCode } from "../status/reason-codes";
import type { ContentKind, QuoteInput, SourceRecord } from "../types";

// The cited reference against the place the quote was found.
// - none: the quote has no reference.
// - consistent: the reference was read in full and agrees with this place. `place: true` when it
//   names the very place (the surah with its ayat, a book with the hadith's number) and not only
//   the surah or the book: the writer's own word for which record is meant.
// - unchecked: there is a reference, but it could not be compared with this place (it is "unknown",
//   `partial`, or of another kind). It must never count as a reference found correct.
// - mismatch: the reference was read and contradicts this place.
export type ReferenceCheck =
  | { result: "none" | "unchecked" }
  | { result: "consistent"; place?: true }
  | { result: "mismatch"; reasonCode: ReferenceMismatchCode };

export interface MatchCandidate {
  kind: ContentKind;
  collection: string;
  // The records the quote runs over, in reading order.
  recordIds: string[];
  records: SourceRecord[];
  ayahRange?: [number, number];
  // Quote words equal to their source word / quote words. 1 for an exact hit.
  score: number;
  // The search layer the candidate was found on.
  layer: string;
  // "exact": the whole quote occurs word for word on `layer`. "fuzzy": found by alignment.
  hit: "exact" | "fuzzy";
  // "same": found on the collection's main text. "bridged": found through a spelling the layer
  // rules accept for this quote (an approved everyday spelling, a paste in another script).
  // "error": found only through a spelling the quote is not entitled to; never a match.
  spelling: "same" | "bridged" | "error";
  reference: ReferenceCheck;
  // The quote claims another kind than this candidate's, in words that are also a way of citing
  // this kind (hadith: «قال الله تعالى» before a hadith qudsi). The status rules read it only when
  // the quote was found word for word in no record of the kind it claims.
  claimAdmitted?: boolean;
  // The quote's words and the source words they stand against; input of wordDiff.
  alignment: Alignment;
}

export interface Matcher {
  kind: ContentKind;
  // Best first. A quote found exactly gives one candidate per occurrence.
  match(quote: QuoteInput, index: CorpusIndex): MatchCandidate[];
}
