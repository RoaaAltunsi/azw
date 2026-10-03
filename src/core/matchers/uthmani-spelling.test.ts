import { describe, expect, test } from "vitest";
import { hasSuperscriptAlef, hasUthmaniSigns, spellsOutSuperscriptAlef } from "./uthmani-spelling";

describe("hasUthmaniSigns", () => {
  test.each([
    ["alef wasla", "ٱلله", true],
    ["the mushaf's sukun (U+06E1)", "الۡحَمۡدُ", true],
    ["the mushaf's tanwin (U+0657)", "عِظَٰمٗا", true],
    ["a small waw (U+06E5)", "لَهُۥ", true],
    // Marks the everyday-script source text carries too: they prove nothing.
    ["a superscript alef alone", "الرَّحْمَٰنِ", false],
    ["a pause mark alone", "الصلاة ۚ إن", false],
    ["the rub al-hizb and sajdah signs", "۞ واسجد ۩", false],
    ["plain letters with diacritics", "إِنَّ الْإِنْسَانَ", false],
    ["a spelt-out alef", "الرحمان", false],
    ["an empty text", "", false],
  ])("%s", (_name, text, expected) => {
    expect(hasUthmaniSigns(text)).toBe(expected);
  });
});

describe("hasSuperscriptAlef", () => {
  test.each([
    ["الرَّحْمَٰنِ", true],
    ["وَهَٰرُونَ", true],
    ["الرحمان", false],
    ["", false],
  ])("%s", (word, expected) => {
    expect(hasSuperscriptAlef(word)).toBe(expected);
  });
});

// [what the draft writes, the same word in the main search text, spelt out?]
describe("spellsOutSuperscriptAlef", () => {
  test.each([
    // A plain alef where the main text has no letter: the mushaf writes it above the line.
    ["الرحمان", "الرحمن", true],
    ["ٱلرَّحْمَانِ", "الرحمن", true],
    ["هاذا", "هذا", true],
    ["ذالك", "ذلك", true],
    ["ولاكن", "ولكن", true],
    // After a carrier letter the main text does not have: «الصلوٰة» spelt «الصلواة».
    ["ٱلصَّلَواةَ", "الصلاه", true],
    ["الزكواة", "الزكاه", true],
    // The mushaf's own spelling: the alef is above the line, or carries hamza or wasla.
    ["ٱلرَّحْمَٰنِ", "الرحمن", false],
    ["ٱلۡإِنسَٰنَ", "الانسان", false],
    ["ٱلصَّلَوٰةَ", "الصلاه", false],
    ["يَٰٓأَيُّهَا", "ياايها", false],
    // A plain alef the everyday text writes too.
    ["ءَامَنُواْ", "امنوا", false],
    ["ءَايَٰتٖ", "ايات", false],
    // A plain alef in the place of another letter of the main text: the mushaf's letter.
    ["لَدَا", "لدي", false],
    ["أَقۡصَا", "اقصي", false],
    ["تَبُوٓأَ", "تبوء", false],
    // An alef marked silent, in the Tanzil and in the King Fahd Complex encodings.
    ["لَأَا۟ذْبَحَنَّهُ", "لاذبحنه", false],
    ["لِشَاْيۡءٍ", "لشيء", false],
    // No alef at all.
    ["خُسۡرٍ", "خسر", false],
  ])("%s against %s", (written, mainKey, expected) => {
    expect(spellsOutSuperscriptAlef(written, mainKey)).toBe(expected);
  });
});
