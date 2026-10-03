// When a draft word may match through the Quran "uthmani" search layer. That layer writes the
// superscript alef as the letter «ا» and «ءا» as «ا», so it is also equal to everyday-script text
// that spells such an alef out («الرحمان», «هاذا», «الصلواة»). Those are spelling errors and must
// never match (owner's decision, docs/DECISIONS.md D-9 and D-13). A word that differs from the main
// text may match through the layer only when both hold:
//   1. it is written in Uthmani script: the span carries a sign only Uthmani texts have
//      (hasUthmaniSigns), or the word itself carries a superscript alef (hasSuperscriptAlef);
//   2. it does not spell out an alef the mushaf writes above the line (spellsOutSuperscriptAlef).
import { alignTokens } from "../diff";
import { normalizeWithMap, UTHMANI_VARIANT_OPTIONS } from "../normalize";

// Signs that only Uthmani-script texts carry: ٱ (U+0671), the marks U+0656–U+065F (the mushaf's
// tanwin and small-letter forms) and the Quranic marks U+06DF–U+06ED without ۩ (U+06E9). The
// superscript alef (U+0670), the pause marks (U+06D6–U+06DC) and ۞ (U+06DE) are left out on
// purpose: the everyday-script source text carries them too, and so does text copied from it
// (checked against the corpus in src/server/quran-review.integration.test.ts).
const isUthmaniSign = (c: number): boolean =>
  c === 0x0671 || (c >= 0x0656 && c <= 0x065f) || (c >= 0x06df && c <= 0x06ed && c !== 0x06e9);

export function hasUthmaniSigns(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (isUthmaniSign(text.charCodeAt(i))) return true;
  }
  return false;
}

const SUPERSCRIPT_ALEF = 0x0670;

// No keyboard types this mark: a word that carries it was copied from a mushaf text.
export function hasSuperscriptAlef(word: string): boolean {
  for (let i = 0; i < word.length; i++) {
    if (word.charCodeAt(i) === SUPERSCRIPT_ALEF) return true;
  }
  return false;
}

const ALEF = "ا";
// Letters the mushaf writes with a superscript alef on them where everyday spelling has an alef
// alone: «الصلوٰة», «التورىٰة».
const ALEF_CARRIERS = "وي";
// The marks on an alef that is written but not pronounced: U+06DF, U+06E0 (Tanzil encoding) and
// U+0652 (King Fahd Complex encoding, where the real sukun is U+06E1).
const isSilentMark = (c: number): boolean => c === 0x06df || c === 0x06e0 || c === 0x0652;

// Whether one word of the draft, found equal to a word of the "uthmani" layer, writes as a plain
// letter an alef that the mushaf writes above the line. `mainKey` is the same word in the main
// search text (several words joined, when the layer word covers several).
//
// The mushaf's own plain alefs are told apart from a spelt-out one by where they stand against the
// main text, letter by letter:
// - an alef with hamza or wasla (أ إ آ ٱ) and an alef marked silent are never a superscript alef;
// - a bare alef where the main text has an alef too is the everyday spelling of that alef, unless
//   the letter before it is a carrier the main text does not have («الصلواة» for «الصلوٰة»);
// - a bare alef in the place of another letter of the main text is the mushaf's letter («لدا»
//   for «لدى»): a superscript alef never replaces a letter;
// - a bare alef where the main text has nothing is a superscript alef spelt out.
export function spellsOutSuperscriptAlef(written: string, mainKey: string): boolean {
  const { norm, map } = normalizeWithMap(written, "search", UTHMANI_VARIANT_OPTIONS);
  const partner = new Map<number, number>();
  for (const [i, j] of alignTokens([...norm], [...mainKey], "global").pairs) {
    if (i !== null && j !== null) partner.set(i, j);
  }
  return [...norm].some((letter, i) => {
    const at = map[i]!;
    if (letter !== ALEF || written[at] !== ALEF || isSilentMark(written.charCodeAt(at + 1))) return false;
    const inMain = partner.get(i);
    if (inMain === undefined) return true;
    if (mainKey[inMain] !== ALEF) return false;
    return i > 0 && !partner.has(i - 1) && ALEF_CARRIERS.includes(norm[i - 1]!);
  });
}
