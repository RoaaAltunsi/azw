// Word-level diff of a quote against the words of exactText, with ranges in both texts.
// Documented in docs/ARCHITECTURE.md ("Word diff").
import type { Normalized } from "../normalize";
import type { DiffOp } from "../types";
import { alignTokens } from "./align";

export { alignTokens, type AlignmentMode, type TokenAlignment } from "./align";

// One word of an original text (the draft, or a record's exactText). `key` is its normalized
// form: what two words are compared by. It is never displayed. [start, end) is the word in the
// original text, diacritics included.
export interface Word {
  key: string;
  start: number;
  end: number;
}

// A word of a record's exactText.
export interface SourceWord extends Word {
  recordId: string;
}

// The quote's words (ranges in the draft) and the stretch of source words they were aligned to
// (ranges in exactText, consecutive, possibly over several records).
export interface Alignment {
  quote: Word[];
  source: SourceWord[];
}

// What belongs to a word besides the letters the offset map points at: the marks after its last
// letter (diacritics, tatweel), and a letter before its first that normalization dropped (the
// hamza of «ءا» under `foldHamzaAlef`).
const WORD_CHARACTER = /[\p{L}\p{M}]/u;

// The words of a normalized text with their ranges in the original it was normalized from.
// `from` skips the start of `norm` (a stripped attribution formula); `offset` is added to every
// range (the position of `original` in a larger text, e.g. a span in the draft).
export function wordsOf(normalized: Normalized, original: string, from = 0, offset = 0): Word[] {
  const { norm, map } = normalized;
  const words: Word[] = [];
  const word = /\S+/g;
  word.lastIndex = from;
  for (let m = word.exec(norm); m !== null; m = word.exec(norm)) {
    let start = map[m.index]!;
    let end = map[m.index + m[0].length - 1]! + 1;
    while (start > 0 && WORD_CHARACTER.test(original[start - 1]!)) start--;
    while (end < original.length && WORD_CHARACTER.test(original[end]!)) end++;
    words.push({ key: m[0], start: offset + start, end: offset + end });
  }
  return words;
}

// Diffs every word of the quote against every word of the aligned source stretch, by `key`.
// Consecutive words with the same op (and the same record) are one DiffOp.
export function wordDiff(alignment: Alignment): DiffOp[] {
  const { quote, source } = alignment;
  const { pairs } = alignTokens(
    quote.map((w) => w.key),
    source.map((w) => w.key),
    "global",
  );
  const ops: DiffOp[] = [];
  for (const [i, j] of pairs) {
    const q = i === null ? undefined : quote[i]!;
    const s = j === null ? undefined : source[j]!;
    const op: DiffOp["op"] = !q ? "delete" : !s ? "insert" : q.key === s.key ? "equal" : "replace";
    const last = ops[ops.length - 1];
    if (last && last.op === op && last.source?.recordId === s?.recordId) {
      if (q) last.draft!.end = q.end;
      if (s) last.source!.end = s.end;
      continue;
    }
    ops.push({
      op,
      ...(q ? { draft: { start: q.start, end: q.end } } : {}),
      ...(s ? { source: { recordId: s.recordId, start: s.start, end: s.end } } : {}),
    });
  }
  return ops;
}
