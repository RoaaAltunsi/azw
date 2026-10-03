// Sequence alignment by dynamic programming, over any tokens (words, or single characters).
// "local" is Smith-Waterman: the best-scoring stretch of `a` against the best-scoring stretch of
// `b`. "global" is Needleman-Wunsch: all of `a` against all of `b`. One scoring for both, so that a
// stretch found locally aligns the same way when it is diffed globally.
const MATCH = 2;
const MISMATCH = -1;
const GAP = -1;

const DIAGONAL = 1;
const UP = 2; // a token of `a` with no partner
const LEFT = 3; // a token of `b` with no partner

export type AlignmentMode = "local" | "global";

export interface TokenAlignment {
  // In order. [i, j] = a[i] is paired with b[j] (equal or not); [i, null] = a[i] has no partner;
  // [null, j] = b[j] has no partner. "global" covers every token; "local" covers the stretch only.
  pairs: Array<[number | null, number | null]>;
  matched: number; // pairs whose two tokens are equal
  // The aligned stretch, end exclusive. "global": the whole of both sequences.
  aStart: number;
  aEnd: number;
  bStart: number;
  bEnd: number;
}

export function alignTokens(a: readonly string[], b: readonly string[], mode: AlignmentMode): TokenAlignment {
  const n = a.length;
  const m = b.length;
  const width = m + 1;
  const score = new Int32Array((n + 1) * width);
  const from = new Uint8Array((n + 1) * width);
  const local = mode === "local";
  if (!local) {
    for (let i = 1; i <= n; i++) {
      score[i * width] = i * GAP;
      from[i * width] = UP;
    }
    for (let j = 1; j <= m; j++) {
      score[j] = j * GAP;
      from[j] = LEFT;
    }
  }
  let best = 0;
  let bestI = 0;
  let bestJ = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const at = i * width + j;
      const diagonal = score[at - width - 1]! + (a[i - 1] === b[j - 1] ? MATCH : MISMATCH);
      const up = score[at - width]! + GAP;
      const left = score[at - 1]! + GAP;
      // Ties: a pair first, then a lone `a` token, then a lone `b` token. Always the same result.
      let value = diagonal;
      let step = DIAGONAL;
      if (up > value) {
        value = up;
        step = UP;
      }
      if (left > value) {
        value = left;
        step = LEFT;
      }
      if (local && value <= 0) {
        value = 0;
        step = 0;
      }
      score[at] = value;
      from[at] = step;
      // Strictly greater: the first best stretch in reading order wins.
      if (local && value > best) {
        best = value;
        bestI = i;
        bestJ = j;
      }
    }
  }

  let i = local ? bestI : n;
  let j = local ? bestJ : m;
  const aEnd = i;
  const bEnd = j;
  const pairs: TokenAlignment["pairs"] = [];
  let matched = 0;
  for (let step = from[i * width + j]!; step !== 0; step = from[i * width + j]!) {
    if (step === DIAGONAL) {
      i--;
      j--;
      if (a[i] === b[j]) matched++;
      pairs.push([i, j]);
    } else if (step === UP) {
      i--;
      pairs.push([i, null]);
    } else {
      j--;
      pairs.push([null, j]);
    }
  }
  pairs.reverse();
  return { pairs, matched, aStart: i, aEnd, bStart: j, bEnd };
}
