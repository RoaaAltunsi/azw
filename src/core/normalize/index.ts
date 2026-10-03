// Arabic normalization with offset maps. Every rule is documented in docs/ARCHITECTURE.md
// ("Normalization"). The output is for retrieval and comparison only; it is never displayed.

export type NormalizationLevel = "search" | "strict";

export interface Normalized {
  norm: string;
  // map[i] = index (UTF-16 code unit) in the original text of the character behind norm[i].
  map: number[];
}

// Honorific phrases removed at level "search". Written in ordinary spelling; they are matched
// after normalization, as whole words. Extend the list here.
export const HONORIFIC_PHRASES: readonly string[] = [
  "صلى الله عليه وسلم",
  "عليه الصلاة والسلام",
  "رضي الله عنهما",
  "رضي الله عنهم",
  "رضي الله عنها",
  "رضي الله عنه",
];

// Leading attribution formulas removed by stripAttributionPreamble. Written in ordinary spelling;
// they are matched after normalization, as whole words. Extend the list here.
export const ATTRIBUTION_PREAMBLES: readonly string[] = [
  "قال رسول الله",
  "قال النبي",
  "عن النبي أنه قال",
  "في الحديث",
  "قال تعالى",
  "قال الله تعالى",
  "يقول الله تعالى",
];

const HONORIFIC_SIGN = 0xfdfa; // ﷺ
const PUNCTUATION = /\p{P}/u;
const WHITESPACE = /\s/;

// Harakat, superscript alef, Quranic annotation marks, tatweel: removed at both levels.
function isMark(c: number): boolean {
  return (c >= 0x064b && c <= 0x065f) || c === 0x0670 || (c >= 0x06d6 && c <= 0x06ed) || c === 0x0640;
}

// Zero-width characters that can sit inside a word: removed.
function isZeroWidth(c: number): boolean {
  return (c >= 0x200b && c <= 0x200d) || c === 0x2060 || c === 0xfeff;
}

// Direction marks, embeddings and isolates. They stand between words (the hadith source has
// U+200F with no space beside it), so they separate words like whitespace.
function isDirectionMark(c: number): boolean {
  return c === 0x061c || c === 0x200e || c === 0x200f || (c >= 0x202a && c <= 0x202e) || (c >= 0x2066 && c <= 0x2069);
}

const LETTER_FOLDS: Readonly<Record<string, string>> = {
  "أ": "ا",
  "إ": "ا",
  "آ": "ا",
  "ٱ": "ا",
  "ى": "ي",
  "ة": "ه",
  "ؤ": "و",
  "ئ": "ي",
};

// What one original character becomes at level "search": "" = removed, " " = word separator.
function foldForSearch(ch: string): string {
  const c = ch.charCodeAt(0);
  if (isMark(c) || isZeroWidth(c)) return "";
  if (c >= 0x0660 && c <= 0x0669) return String(c - 0x0660);
  const folded = LETTER_FOLDS[ch];
  if (folded !== undefined) return folded;
  if (c >= 0x0621 && c <= 0x064a) return ch; // other Arabic letters: unchanged
  if (c === HONORIFIC_SIGN || isDirectionMark(c) || WHITESPACE.test(ch) || PUNCTUATION.test(ch)) return " ";
  return ch;
}

// Collapses runs of spaces to the first one and trims both ends, keeping the map aligned.
function collapseSpaces(chars: string[], map: number[]): Normalized {
  let norm = "";
  const outMap: number[] = [];
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === " " && (norm === "" || norm.endsWith(" "))) continue;
    norm += chars[i];
    outMap.push(map[i]!);
  }
  if (norm.endsWith(" ")) {
    norm = norm.slice(0, -1);
    outMap.pop();
  }
  return { norm, map: outMap };
}

function foldCharacters(text: string, foldHamzaAlef = false): Normalized {
  const chars: string[] = [];
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const out = foldForSearch(text[i]!);
    if (out === "") continue;
    // «ءا» is the decomposed spelling of «آ», which folds to «ا»: drop the hamza.
    if (foldHamzaAlef && out === "ا" && chars[chars.length - 1] === "ء") {
      chars.pop();
      map.pop();
    }
    chars.push(out);
    map.push(i);
  }
  return collapseSpaces(chars, map);
}

const searchForm = (text: string): string => foldCharacters(text).norm;

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Longest phrase first, so «عنهما» is not cut down to «عنه».
const alternation = (phrases: readonly string[]): string =>
  phrases
    .map(searchForm)
    .filter((s) => s !== "")
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");

const HONORIFIC_RE = new RegExp(`(?<=^| )(?:${alternation(HONORIFIC_PHRASES)})(?= |$)`, "g");
const PREAMBLE_RE = new RegExp(`^(?:${alternation(ATTRIBUTION_PREAMBLES)})(?: |$)`);

function removeHonorifics(n: Normalized): Normalized {
  const chars: string[] = [];
  const map: number[] = [];
  let last = 0;
  const keep = (from: number, to: number): void => {
    for (let i = from; i < to; i++) {
      chars.push(n.norm[i]!);
      map.push(n.map[i]!);
    }
  };
  for (const m of n.norm.matchAll(HONORIFIC_RE)) {
    keep(last, m.index);
    last = m.index + m[0].length;
  }
  if (last === 0) return n;
  keep(last, n.norm.length);
  return collapseSpaces(chars, map);
}

export interface NormalizeOptions {
  // Level "search" only. Keeps the HONORIFIC_PHRASES in the output. For Quran text, where
  // «رضي الله عنهم» is part of the ayah (5:119, 9:100, 58:22, 98:8) and must not be dropped.
  keepHonorificPhrases?: boolean;
  // Level "search" only. Writes «ءا» as «ا». For comparing with a Quran record's "uthmani" search
  // variant: Uthmani-script sources spell «الآخرة» either as «ٱلۡأٓخِرَةِ» or as «ٱلْـَٔاخِرَةِ».
  foldHamzaAlef?: boolean;
}

// The options every Quran "uthmani" search variant is built with (scripts/build-corpus.ts). A draft
// span compared with that variant must be normalized with the same options.
export const UTHMANI_VARIANT_OPTIONS: Readonly<NormalizeOptions> = { keepHonorificPhrases: true, foldHamzaAlef: true };

export function normalizeWithMap(
  text: string,
  level: NormalizationLevel,
  options: NormalizeOptions = {},
): Normalized {
  if (level === "strict") {
    let norm = "";
    const map: number[] = [];
    for (let i = 0; i < text.length; i++) {
      if (isMark(text.charCodeAt(i))) continue;
      norm += text[i];
      map.push(i);
    }
    return { norm, map };
  }
  const folded = foldCharacters(text, options.foldHamzaAlef);
  return options.keepHonorificPhrases ? folded : removeHonorifics(folded);
}

// Removes leading attribution formulas from a search-normalized string. The result is always a
// suffix of the input, so its offset in `norm` is `norm.length - result.length`.
export function stripAttributionPreamble(norm: string): string {
  let rest = norm;
  for (let m = PREAMBLE_RE.exec(rest); m !== null && m[0] !== ""; m = PREAMBLE_RE.exec(rest)) rest = rest.slice(m[0].length);
  return rest;
}

export function tokenize(norm: string): string[] {
  return norm.split(/\s+/).filter((w) => w !== "");
}
