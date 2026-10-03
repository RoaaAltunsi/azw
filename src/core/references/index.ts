// Deterministic citation parsing (surah/ayah, collection/number, «متفق عليه»). No LLM and no I/O:
// the alias lists are passed in. Every rule is documented in docs/ARCHITECTURE.md
// ("Reference parsing").
import { z } from "zod";
import { normalizeWithMap } from "../normalize";
import { SpanSchema, type Span } from "../types";

export const ParsedReferenceSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("quran"),
    surah: z.number().int().min(1).max(114),
    // Absent = the writer cited the surah only, or a list of ayat that a range cannot express.
    ayahStart: z.number().int().positive().optional(),
    ayahEnd: z.number().int().positive().optional(), // only for a range; always > ayahStart
    // The writer cited more than the fields above express (a list of ayat). Such a reference
    // must never count as one that was checked and found correct.
    partial: z.literal(true).optional(),
  }),
  z.strictObject({
    type: z.literal("hadith"),
    collections: z.array(z.string().min(1)).min(1),
    number: z.string().min(1).optional(), // only when a single collection is cited
    // When several collections are cited and some carry their own number: collection → number.
    numbers: z.record(z.string(), z.string().min(1)).optional(),
    // The writer gave a number that the fields above do not carry («متفق عليه (1907)»). Such a
    // reference must never count as one that was checked and found correct.
    partial: z.literal(true).optional(),
  }),
  z.strictObject({ type: z.literal("unknown") }),
]);
export type ParsedReference = z.infer<typeof ParsedReferenceSchema>;

export const ReferenceSchema = z.object({
  raw: z.string().min(1), // draft.slice(span.start, span.end)
  span: SpanSchema,
  parsed: ParsedReferenceSchema,
});
export type Reference = z.infer<typeof ReferenceSchema>;

// One entry of data/aliases/surahs.json (`surahs`). Extra keys in the file are ignored.
export const SurahAliasSchema = z.object({
  number: z.number().int().min(1).max(114),
  bareName: z.string().min(1),
  spellingVariants: z.array(z.string().min(1)),
  alternateNames: z.array(z.string().min(1)),
});
export type SurahAlias = z.infer<typeof SurahAliasSchema>;

// One entry of data/aliases/collections.json (`entries`). `names` count only after a narration
// verb or alone inside a citation bracket; `phrases` count anywhere.
export const CollectionAliasSchema = z.object({
  collections: z.array(z.string().min(1)).min(1),
  names: z.array(z.string().min(1)),
  phrases: z.array(z.string().min(1)),
});
export type CollectionAlias = z.infer<typeof CollectionAliasSchema>;

export interface ReferenceAliases {
  surahs: readonly SurahAlias[];
  collections: readonly CollectionAlias[];
}

// ---------------------------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------------------------

interface Token {
  kind: "word" | "num" | "punct";
  // word: search-normalized; num: ASCII digits; punct: the character (dashes → "-", «،» → ",").
  norm: string;
  start: number;
  end: number;
}

const LETTER = /\p{L}/u;
const MARK = /\p{M}/u;
const TATWEEL = "ـ";
const PUNCT_FOLDS: Readonly<Record<string, string>> = { "–": "-", "—": "-", "−": "-", "،": "," };

const fold = (text: string): string => normalizeWithMap(text, "search", { keepHonorificPhrases: true }).norm;

function digitValue(c: number): number {
  if (c >= 0x30 && c <= 0x39) return c - 0x30;
  if (c >= 0x0660 && c <= 0x0669) return c - 0x0660;
  return -1;
}

// Zero-width characters that can sit inside a word (same set as normalization).
const isZeroWidth = (c: number): boolean => (c >= 0x200b && c <= 0x200d) || c === 0x2060 || c === 0xfeff;

function tokenizeDraft(draft: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < draft.length) {
    const ch = draft[i]!;
    if (digitValue(ch.charCodeAt(0)) >= 0) {
      let j = i;
      let norm = "";
      while (j < draft.length && digitValue(draft.charCodeAt(j)) >= 0) norm += digitValue(draft.charCodeAt(j++));
      tokens.push({ kind: "num", norm, start: i, end: j });
      i = j;
    } else if (LETTER.test(ch)) {
      let j = i + 1;
      while (j < draft.length && (LETTER.test(draft[j]!) || MARK.test(draft[j]!) || isZeroWidth(draft.charCodeAt(j)))) j++;
      const run = draft.slice(i, j);
      const norm = fold(run);
      if (norm !== "") tokens.push({ kind: "word", norm, start: i, end: j });
      // A tatweel standing alone is used as a dash («153ـ154»).
      else if (run.includes(TATWEEL)) tokens.push({ kind: "punct", norm: "-", start: i, end: j });
      i = j;
    } else {
      // Whitespace, stray marks and invisible characters separate tokens and are dropped.
      if (!/\s/.test(ch) && !MARK.test(ch) && !/\p{Cf}/u.test(ch)) {
        tokens.push({ kind: "punct", norm: PUNCT_FOLDS[ch] ?? ch, start: i, end: i + 1 });
      }
      i++;
    }
  }
  return tokens;
}

const isP = (t: Token | undefined, ...chars: string[]): boolean => t?.kind === "punct" && chars.includes(t.norm);
const isW = (t: Token | undefined, ...words: string[]): boolean => t?.kind === "word" && words.includes(t.norm);
const wordOf = (t: Token | undefined): string | undefined => (t?.kind === "word" ? t.norm : undefined);

// Longest phrase starting at token i. `first` replaces the first word, for a stripped «و».
type PhraseMatcher<T> = (tokens: readonly Token[], i: number, first?: string) => { length: number; value: T } | undefined;

function phraseMatcher<T>(entries: ReadonlyArray<readonly [string, T]>): PhraseMatcher<T> {
  const byFirst = new Map<string, Array<{ words: string[]; value: T }>>();
  for (const [phrase, value] of entries) {
    const words = fold(phrase).split(" ").filter((w) => w !== "");
    if (words.length === 0) continue;
    const list = byFirst.get(words[0]!) ?? [];
    list.push({ words, value });
    byFirst.set(words[0]!, list);
  }
  for (const list of byFirst.values()) list.sort((a, b) => b.words.length - a.words.length);
  return (tokens, i, first = wordOf(tokens[i])) => {
    if (first === undefined || tokens[i]?.kind !== "word") return undefined;
    for (const c of byFirst.get(first) ?? []) {
      if (c.words.every((w, k) => k === 0 || isW(tokens[i + k], w))) return { length: c.words.length, value: c.value };
    }
    return undefined;
  };
}

// ---------------------------------------------------------------------------------------------
// Grammar
// ---------------------------------------------------------------------------------------------

// All words below are in search-normalized spelling (أ→ا، ة→ه، ى→ي), as the tokens are.
const SURAH_WORDS = ["سوره", "وسوره", "بسوره", "لسوره", "فسوره", "كسوره"];
const AYAH_WORDS = ["الايه", "ايه", "الايات", "ايات", "الايتان", "الايتين", "ايتان", "ايتين"];
const RANGE_WORDS = ["الي", "حتي"];
const NARRATION_VERBS = new Set(["رواه", "روي", "اخرجه", "اخرج", "خرجه"]);
// «رواه مسلم في صحيحه», «رواه أحمد في المسند»: still the collection the name stands for.
const IN_HIS_BOOK = ["صحيحه", "صحيحيهما", "الصحيح", "سننه", "السنن", "مسنده", "المسند", "جامعه", "موطيه", "الموطا", "مستدركه", "المستدرك"];
// «رواه البخاري في كتاب الإيمان»: a place inside the collection.
const PLACE_WORDS = ["كتاب", "باب"];
// «شرح صحيح مسلم», «مختصر صحيح البخاري»: another book, not the collection.
const DERIVED_WORK_WORDS = ["شرح", "بشرح", "مختصر"];
// A bracket with one of these is a citation even when it cannot be parsed.
const CITATION_WORDS = ["رواه", "اخرجه", "خرجه", "سوره", "تفسير", "انظر", "راجع"];
// … and so is a bracket where one of these stands before a number.
const NUMBER_UNITS = ["ص", "ج", "صفحه", "رقم", "برقم", "حديث", "الحديث", ...AYAH_WORDS];
const MAX_BRACKET_TOKENS = 40;

interface Found {
  from: number; // token index, inclusive
  to: number; // token index, exclusive
  parsed: ParsedReference;
}

interface Ayat {
  end: number;
  ayahStart?: number; // absent = a list of ayat
  ayahEnd?: number;
}

interface Cite {
  end: number;
  collections: string[];
  number?: string;
}

// No surah has more than 286 ayat, so a number of four digits or more is not an ayah number.
function ayahNumber(t: Token | undefined): number | undefined {
  if (t?.kind !== "num" || t.norm.length > 3) return undefined;
  const n = Number(t.norm);
  return n >= 1 ? n : undefined;
}

// NUM, NUM-NUM, or a list «153، 155».
function ayatAt(tokens: readonly Token[], i: number): Ayat | undefined {
  const first = ayahNumber(tokens[i]);
  if (first === undefined) return undefined;
  let end = i + 1;
  let last = first;
  const rangeEnd = (at: number): number | undefined =>
    isP(tokens[at], "-") || isW(tokens[at], ...RANGE_WORDS) ? ayahNumber(tokens[at + 1]) : undefined;
  const second = rangeEnd(end);
  if (second !== undefined) {
    last = second;
    end += 2;
  }
  let list = false;
  while ((isP(tokens[end], ",") || isW(tokens[end], "و")) && ayahNumber(tokens[end + 1]) !== undefined) {
    list = true;
    end += 2;
    if (rangeEnd(end) !== undefined) end += 2;
  }
  if (list) return { end };
  // With Arabic-Indic digits a range displays reversed, so writers also type it reversed.
  const lo = Math.min(first, last);
  const hi = Math.max(first, last);
  return lo === hi ? { end, ayahStart: lo } : { end, ayahStart: lo, ayahEnd: hi };
}

// What may follow a surah name: separators, an ayah word, then the ayah numbers.
// Outside a bracket a bare number counts only when it is not followed by a word («البقرة 3 مرات»).
function ayahPartAt(tokens: readonly Token[], i: number, inBracket: boolean): Ayat | undefined {
  let j = i;
  let strong = false;
  for (let n = 0; n < 2 && isP(tokens[j], ":", ",", "-", "/"); n++) {
    if (isP(tokens[j], ":", "/")) strong = true;
    j++;
  }
  if (isW(tokens[j], ...AYAH_WORDS)) {
    strong = true;
    j++;
    if (isW(tokens[j], "رقم")) j++;
    if (isP(tokens[j], ":")) j++;
  }
  const paren = isP(tokens[j], "(");
  if (paren) {
    if (!strong && !inBracket) return undefined;
    j++;
  }
  const ayat = ayatAt(tokens, j);
  if (!ayat) return undefined;
  j = ayat.end;
  if (paren) {
    if (!isP(tokens[j], ")")) return undefined;
    j++;
  }
  if (!strong && !inBracket && tokens[j]?.kind === "word") return undefined;
  return { ...ayat, end: j };
}

function quranParsed(surah: number, ayat?: Ayat): ParsedReference {
  const parsed: Extract<ParsedReference, { type: "quran" }> = { type: "quran", surah };
  if (ayat?.ayahStart !== undefined) parsed.ayahStart = ayat.ayahStart;
  if (ayat?.ayahEnd !== undefined) parsed.ayahEnd = ayat.ayahEnd;
  if (ayat && ayat.ayahStart === undefined) parsed.partial = true;
  return parsed;
}

function hadithParsed(cites: readonly Cite[]): ParsedReference {
  const collections = [...new Set(cites.flatMap((c) => c.collections))];
  // Only other works of the named authors («رواه البخاري في الأدب المفرد»).
  if (collections.length === 0) return { type: "unknown" };
  // A number after a group («متفق عليه») belongs to no single collection and is dropped.
  const numbered = cites.filter((c) => c.number !== undefined && c.collections.length === 1);
  const parsed: Extract<ParsedReference, { type: "hadith" }> = { type: "hadith", collections };
  if (cites.some((c) => c.number !== undefined && c.collections.length > 1)) parsed.partial = true;
  if (numbered.length === 0) return parsed;
  if (collections.length === 1) parsed.number = numbered[0]!.number;
  else parsed.numbers = Object.fromEntries(numbered.map((c) => [c.collections[0]!, c.number!]));
  return parsed;
}

function compile(aliases: ReferenceAliases) {
  // A name that would resolve to two surahs resolves to none.
  const surahByName = new Map<string, number | null>();
  for (const s of aliases.surahs) {
    for (const name of [s.bareName, ...s.spellingVariants, ...s.alternateNames]) {
      const key = fold(name);
      const known = surahByName.get(key);
      surahByName.set(key, known === undefined || known === s.number ? s.number : null);
    }
  }
  const surahAt = phraseMatcher([...surahByName].flatMap(([name, n]) => (n === null ? [] : [[name, n] as const])));
  const nameAt = phraseMatcher(aliases.collections.flatMap((e) => e.names.map((n) => [n, e.collections] as const)));
  const phraseAt = phraseMatcher(aliases.collections.flatMap((e) => e.phrases.map((p) => [p, e.collections] as const)));

  const isOneLetter = (tokens: readonly Token[], i: number, length: number): boolean =>
    length === 1 && tokens[i]!.norm.length === 1;

  // «سورة البقرة», «سورة البقرة الآية 153», «سورة البقرة: 153»
  function quranFromSurahWord(tokens: readonly Token[], i: number): Found | undefined {
    if (!isW(tokens[i], ...SURAH_WORDS)) return undefined;
    const name = surahAt(tokens, i + 1);
    if (!name) return undefined;
    const j = i + 1 + name.length;
    const ayat = ayahPartAt(tokens, j, false);
    return { from: i, to: ayat?.end ?? j, parsed: quranParsed(name.value, ayat) };
  }

  // «الآية 153 من سورة البقرة»
  function quranFromAyahWord(tokens: readonly Token[], i: number): Found | undefined {
    if (!isW(tokens[i], ...AYAH_WORDS)) return undefined;
    let j = i + 1;
    if (isW(tokens[j], "رقم")) j++;
    const ayat = ayatAt(tokens, j);
    if (!ayat) return undefined;
    j = ayat.end;
    if (!isW(tokens[j], "من", "في") || !isW(tokens[j + 1], "سوره")) return undefined;
    const name = surahAt(tokens, j + 2);
    if (!name) return undefined;
    return { from: i, to: j + 2 + name.length, parsed: quranParsed(name.value, ayat) };
  }

  // «البقرة/153». One-letter names (ص، ق، ن) are left out: «ص/15» is a page.
  function quranFromSlash(tokens: readonly Token[], i: number): Found | undefined {
    const name = surahAt(tokens, i);
    if (!name || isOneLetter(tokens, i, name.length) || isP(tokens[i - 1], "/")) return undefined;
    const j = i + name.length;
    if (!isP(tokens[j], "/")) return undefined;
    const ayat = ayatAt(tokens, j + 1);
    return ayat && { from: i, to: ayat.end, parsed: quranParsed(name.value, ayat) };
  }

  // The whole content of a bracket, tokens [a, b): «البقرة: 152», «البقرة 153», «البقرة».
  function quranFromBracket(tokens: readonly Token[], a: number, b: number, square: boolean): ParsedReference | undefined {
    const name = surahAt(tokens, a);
    if (!name) return undefined;
    const j = a + name.length;
    const oneLetter = isOneLetter(tokens, a, name.length);
    // A name alone is a citation only in square brackets: «(محمد)» and «(ص)» are ordinary text.
    if (j === b) return square && !oneLetter ? quranParsed(name.value) : undefined;
    // «(ص 15)» is a page; «[ص: 29]» is the surah.
    if (oneLetter && !isP(tokens[j], ":")) return undefined;
    const ayat = ayahPartAt(tokens, j, true);
    return ayat?.end === b ? quranParsed(name.value, ayat) : undefined;
  }

  // The hadith number after a collection: «(1)», «برقم 1907», «، حديث رقم 13», and a bare number
  // when no ordinary word follows it. «1/20» is a volume and page, not a hadith number; in
  // brackets, «(5/231)», it is skipped so that the collections after it are still read.
  function numberAt(tokens: readonly Token[], i: number, inBracket: boolean): { end: number; number?: string } | undefined {
    let j = i;
    let strong = false;
    const separator = isP(tokens[j], ",", ":") ? tokens[j]!.norm : undefined;
    if (separator) j++;
    if (isW(tokens[j], "حديث", "الحديث")) {
      strong = true;
      j++;
    }
    if (isW(tokens[j], "رقم", "برقم")) {
      strong = true;
      j++;
    }
    if (strong && isP(tokens[j], ":")) j++;
    const paren = isP(tokens[j], "(");
    if (paren) j++;
    const num = tokens[j];
    if (num?.kind !== "num") return undefined;
    j++;
    if (isP(tokens[j], "/") && tokens[j + 1]?.kind === "num") {
      return paren && isP(tokens[j + 2], ")") ? { end: j + 3 } : undefined;
    }
    if (paren) {
      if (!isP(tokens[j], ")")) return undefined;
      j++;
      strong = true;
    }
    if (!strong) {
      if (separator === "," && !inBracket) return undefined;
      if (tokens[j]?.kind === "word" && !citeAt(tokens, j, true, true, inBracket)) return undefined;
    }
    return { end: j, number: num.norm };
  }

  // One collection with its optional number. `stripWa`: the word carries a leading «و».
  function citeAt(tokens: readonly Token[], i: number, viaName: boolean, stripWa: boolean, inBracket: boolean): Cite | undefined {
    let j = i;
    let first = wordOf(tokens[j]);
    if (first === undefined) return undefined;
    if (stripWa) {
      if (!first.startsWith("و") || first.length < 2) return undefined;
      first = first.slice(1);
    }
    let hit = phraseAt(tokens, j, first);
    const byPhrase = hit !== undefined;
    if (hit) {
      // «غير متفق عليه», «متفق عليه بين العلماء»: the everyday sense, not a citation.
      if (isW(tokens[i - 1], "غير", "ليس", "ليست") || isW(tokens[j + hit.length], "بين")) return undefined;
    } else if (viaName) {
      if (first === "الامام") {
        j++;
        first = wordOf(tokens[j]);
      }
      hit = phraseAt(tokens, j, first) ?? nameAt(tokens, j, first);
    }
    if (!hit) return undefined;
    j += hit.length;
    let collections = hit.value;
    if (byPhrase && isW(tokens[i - 1], ...DERIVED_WORK_WORDS)) collections = [];
    if (isW(tokens[j], "في")) {
      if (isW(tokens[j + 1], ...IN_HIS_BOOK)) j += 2;
      // «رواه البخاري في الأدب المفرد»: another work of the author, not the collection.
      else if (!byPhrase && !isW(tokens[j + 1], ...PLACE_WORDS)) collections = [];
    }
    const number = numberAt(tokens, j, inBracket);
    const cite: Cite = { end: number?.end ?? j, collections };
    if (number?.number !== undefined) cite.number = number.number;
    return cite;
  }

  // «البخاري ومسلم», «البخاري (6018) ومسلم (2564)»; inside a bracket also «البخاري 6018، مسلم 2564».
  function citesAt(tokens: readonly Token[], i: number, viaName: boolean, inBracket: boolean): Cite[] | undefined {
    const first = citeAt(tokens, i, viaName, false, inBracket);
    if (!first) return undefined;
    const cites = [first];
    for (;;) {
      const j = cites[cites.length - 1]!.end;
      const k = isP(tokens[j], ",") ? j + 1 : j;
      const next = citeAt(tokens, k, true, true, inBracket) ?? (inBracket && k > j ? citeAt(tokens, k, true, false, true) : undefined);
      if (!next) return cites;
      cites.push(next);
    }
  }

  // «رواه البخاري», «أخرجه مسلم (1907)», «متفق عليه», «صحيح مسلم برقم 1907»
  function hadithAt(tokens: readonly Token[], i: number): Found | undefined {
    const word = wordOf(tokens[i]);
    if (word === undefined) return undefined;
    const isVerb = NARRATION_VERBS.has(word) || (/^[وف]/.test(word) && NARRATION_VERBS.has(word.slice(1)));
    const cites = isVerb ? citesAt(tokens, i + 1, true, false) : citesAt(tokens, i, false, false);
    return cites && { from: i, to: cites[cites.length - 1]!.end, parsed: hadithParsed(cites) };
  }

  // The whole content of a bracket: «البخاري», «البخاري: 1», «البخاري 6018، مسلم 2564».
  function hadithFromBracket(tokens: readonly Token[], a: number, b: number): ParsedReference | undefined {
    const cites = citesAt(tokens, a, true, true);
    return cites && cites[cites.length - 1]!.end === b ? hadithParsed(cites) : undefined;
  }

  return { quranFromSurahWord, quranFromAyahWord, quranFromSlash, quranFromBracket, hadithAt, hadithFromBracket };
}

// A bracket that names a source in a form the parser does not resolve.
function looksLikeCitation(tokens: readonly Token[], a: number, b: number, square: boolean): boolean {
  // «[2:153]», «(2:153-154)»: a surah cited by its number. Not resolved, but a citation.
  const surah = tokens[a]!;
  if (surah.kind === "num" && Number(surah.norm) >= 1 && Number(surah.norm) <= 114 && isP(tokens[a + 1], ":")) {
    if (ayatAt(tokens, a + 2)?.end === b) return true;
  }
  let words = 0;
  for (let i = a; i < b; i++) {
    const t = tokens[i]!;
    if (t.kind === "word") {
      words++;
      if (CITATION_WORDS.includes(t.norm)) return true;
    } else if (t.kind === "num" && words > 0) {
      const before = tokens[i - 1];
      if (isP(before, ":", "/") || isW(before, ...NUMBER_UNITS)) return true;
      if (square && i === b - 1 && before?.kind === "word") return true;
    }
  }
  return false;
}

const CLOSERS: Readonly<Record<string, string>> = { "(": ")", "[": "]", "{": "}" };

function closingBracket(tokens: readonly Token[], open: number): number | undefined {
  const opener = tokens[open]!.norm;
  const closer = CLOSERS[opener]!;
  let depth = 0;
  for (let i = open + 1; i < tokens.length && i <= open + MAX_BRACKET_TOKENS; i++) {
    if (isP(tokens[i], opener)) depth++;
    else if (isP(tokens[i], closer) && depth-- === 0) return i;
  }
  return undefined;
}

export function parseReferences(draft: string, aliases: ReferenceAliases): Reference[] {
  const tokens = tokenizeDraft(draft);
  const grammar = compile(aliases);
  const found: Found[] = [];

  // Pass 1: forms that announce themselves (سورة، الآية، رواه، متفق عليه، «البقرة/153»).
  for (let i = 0; i < tokens.length; ) {
    const hit =
      grammar.quranFromSurahWord(tokens, i) ??
      grammar.quranFromAyahWord(tokens, i) ??
      grammar.quranFromSlash(tokens, i) ??
      grammar.hadithAt(tokens, i);
    if (hit) found.push(hit);
    i = hit ? hit.to : i + 1;
  }

  // Pass 2: brackets. A bare surah or collection name is a citation only as a whole bracket.
  for (let open = 0; open < tokens.length; open++) {
    if (!isP(tokens[open], ...Object.keys(CLOSERS))) continue;
    const close = closingBracket(tokens, open);
    if (close === undefined) continue;
    const a = open + 1;
    let b = close;
    while (b > a && isP(tokens[b - 1], ".", ",")) b--;
    if (a >= b) continue;
    const inside = found.filter((f) => f.from <= close && f.to > open);
    if (inside.length > 0) {
      // «(سورة البقرة: 153)»: the brackets belong to the reference.
      const only = inside[0]!;
      if (inside.length === 1 && only.from === a && only.to === b) {
        only.from = open;
        only.to = close + 1;
      }
      continue;
    }
    const square = tokens[open]!.norm === "[";
    const parsed =
      grammar.quranFromBracket(tokens, a, b, square) ??
      grammar.hadithFromBracket(tokens, a, b) ??
      (looksLikeCitation(tokens, a, b, square) ? ({ type: "unknown" } as const) : undefined);
    if (parsed) found.push({ from: open, to: close + 1, parsed });
  }

  return found
    .map(({ from, to, parsed }) => {
      const span = { start: tokens[from]!.start, end: tokens[to - 1]!.end };
      return { raw: draft.slice(span.start, span.end), span, parsed };
    })
    .sort((x, y) => x.span.start - y.span.start);
}

// ---------------------------------------------------------------------------------------------
// Attaching a reference to a quote
// ---------------------------------------------------------------------------------------------

// A reference before the quote counts only within this many words of it.
export const MAX_WORDS_BEFORE_QUOTE = 15;

const SENTENCE_END = /[.!?؟…\n]/;
const QUOTE_MARK = /[«»﴿﴾“”"]/;
const QUOTE_OPENER = /[«﴿“"]/;
const WORD_CHAR = /[\p{L}\p{N}]/u;

// The reference a quote is cited with: the nearest one after the quote in the same sentence,
// else one just before it. `quoteSpan` may include the quotation marks or not.
export function attachReference(quoteSpan: Span, references: readonly Reference[], draft: string): Reference | undefined {
  const ordered = [...references].sort((x, y) => x.span.start - y.span.start);

  const after = ordered.find((r) => r.span.start >= quoteSpan.end);
  if (after) {
    const gap = draft.slice(quoteSpan.end, after.span.start);
    // An opening mark in the gap means another quote stands between; the reference is that quote's.
    const otherQuote = QUOTE_OPENER.test(gap.replace(/^[\s»﴾”"]+/, ""));
    // «"…". رواه البخاري»: a full stop with no word after it does not separate the two.
    if (!otherQuote && (!SENTENCE_END.test(gap) || !WORD_CHAR.test(gap))) return after;
  }

  const before = ordered.filter((r) => r.span.end <= quoteSpan.start).pop();
  if (before) {
    const gap = draft.slice(before.span.end, quoteSpan.start).replace(/[\s«﴿“"]+$/, "");
    let sentenceStart = before.span.start;
    while (sentenceStart > 0 && !SENTENCE_END.test(draft[sentenceStart - 1]!)) sentenceStart--;
    // A quote earlier in the sentence means the reference is cited for that quote.
    const lead = draft.slice(sentenceStart, before.span.start);
    const words = gap.split(/\s+/).filter((w) => WORD_CHAR.test(w)).length;
    if (!SENTENCE_END.test(gap) && !QUOTE_MARK.test(gap) && !QUOTE_MARK.test(lead) && words <= MAX_WORDS_BEFORE_QUOTE) {
      return before;
    }
  }
  return undefined;
}
