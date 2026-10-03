# Azw — architecture

The overall layout, contracts and pipeline are in `AGENTS.md` §6. This file documents each part as
it is built.

## Normalization

Code: `src/core/normalize/index.ts`. Tests: `src/core/normalize/index.test.ts`.

Normalization produces text for **retrieval and comparison only**. It is never displayed and never
replaces `exactText` or the user's draft. Both sides of a comparison (the draft span and the source
record) go through the same function, so a rule can only make two texts equal if it treats both
the same way.

### API

| Function | Result |
|---|---|
| `normalizeWithMap(text, level, options?)` | `{ norm, map }`. `level` is `"search"` or `"strict"`. `map[i]` is the index in `text` (UTF-16 code unit) of the character behind `norm[i]` |
| `stripAttributionPreamble(norm)` | `norm` without leading attribution formulas. The result is always a suffix of the input, so its offset in `norm` is `norm.length - result.length` |
| `tokenize(norm)` | The words of `norm` (split on whitespace, no empty words) |
| `HONORIFIC_PHRASES`, `ATTRIBUTION_PREAMBLES` | The two phrase lists, each in one exported constant |

### The offset map

`map` has one entry per character of `norm` and is strictly increasing. It lets a match or a diff
found in normalized text be drawn on the original: the span `norm[a..b]` covers
`text.slice(map[a], map[b] + 1)`.

- A kept or folded letter maps to the letter it came from.
- A space maps to the first separator of the run it replaced (a space, a punctuation mark, ﷺ).
- Removed characters and removed honorific phrases have no entry; the map jumps over them.

### Level "search"

Used for `searchText` and for the draft span when looking for candidates. Rules, in order:

| # | Rule | Why |
|---|---|---|
| 1 | Remove harakat U+064B–U+065F | Writers quote with full, partial or no diacritics; the source is fully diacritized. The range includes the combining maddah and hamza (U+0653–U+0655), so a decomposed «آ» or «أ» ends the same as the precomposed letter after rule 6 |
| 2 | Remove the superscript alef U+0670 | The Quran source writes «الرَّحْمَٰنِ», «ذَٰلِكَ»; everyday spelling has no such mark |
| 3 | Remove Quranic annotation marks U+06D6–U+06ED | Pause marks, ۞ and ۩ are inside the source's ayah text; a writer does not type them |
| 4 | Remove tatweel U+0640 | Decorative stretching, no meaning |
| 5 | Punctuation and brackets become a word separator | Covers ﴿﴾ «» () [] {} " ' , . : ؛ ، ؟ ! ? … and every other Unicode punctuation character (`\p{P}`), including the `{ }` and `-` the hadith source uses. A separator, not a plain deletion: «قال:«إنما» must give two words, not «قالانما» |
| 6 | أ إ آ ٱ → ا | Hamza on alef is the most common spelling variation in typed Arabic; ٱ (wasla) appears in Uthmani-script pastes |
| 7 | ى → ي | Final ya is typed either way («على» / «علي»); the hadith source itself writes «رضى» |
| 8 | ة → ه | Final ta marbuta is often typed as ha |
| 9 | ؤ → و, ئ → ي | Hamza seats vary between writers. ء on the line is kept |
| 10 | ﷺ (U+FDFA) becomes a word separator | An honorific added by the writer or the editor, not part of the quoted text |
| 11 | Arabic-Indic digits ٠–٩ → 0–9 | So a cited number reads the same in both scripts |
| 12 | Zero-width characters (U+200B–U+200D, U+2060, U+FEFF) are removed; direction marks (U+061C, U+200E, U+200F, U+202A–U+202E, U+2066–U+2069) become a word separator | Invisible characters. The hadith source has about 133,000 U+200F, some with no space beside them |
| 13 | Whitespace runs collapse to one space; the result is trimmed | Line breaks and spacing are not part of the wording |
| 14 | Remove the phrases in `HONORIFIC_PHRASES`: «صلى الله عليه وسلم», «عليه الصلاة والسلام», «رضي الله عنه / عنها / عنهما / عنهم» | The hadith source repeats them after every name; writers keep, drop or replace them with ﷺ. Matched after rules 1–13 and only as whole words, so «رضي الله عنهن» and «صلى الله عليه بها عشرا» are untouched |

Everything else is unchanged, including Latin letters (no case folding) and ASCII digits.

**Rule 14 and the Quran.** «رضي الله عنهم» is part of four ayat (5:119, 9:100, 58:22, 98:8).
Removing it there would let a quotation with a different pronoun compare equal to the ayah. The
option `keepHonorificPhrases: true` turns rule 14 off; the corpus build uses it for Quran records,
and whoever compares a draft span with a Quran record must normalize the span the same way.
Recorded as `docs/DECISIONS.md` D-7.

**Option `foldHamzaAlef` (off by default).** Writes «ءا» as «ا». «ءا» is the decomposed spelling of
«آ», which rule 6 already turns into «ا». Uthmani-script sources disagree on it: the King Fahd
Complex text writes «ٱلۡأٓخِرَةِ», the Tanzil text writes «ٱلْءَاخِرَةِ». The option is used only for
the Quran "uthmani" search variant (below), through the exported `UTHMANI_VARIANT_OPTIONS`. It is not
part of the main search text: there «ءا» also occurs where the alef carries a tanwin
(«جُزْءًا», «سُوءًا»), and folding it would turn «سوءا» into «سوا».

**Option `superscriptAlefAsAlef` (off by default).** The superscript alef (U+0670) becomes the letter
«ا» instead of being removed by rule 2. Uthmani script writes many alefs only as this mark
(«ٱلۡكِتَٰبُ», «مَٰلِكِ»). If the mark were removed, the Uthmani text would read «الكتب», «ملك», and an
everyday-script draft that really wrote «الكتب» for «الكتاب» would equal it. With the option the
Uthmani text reads «الكتاب», «مالك», and only a draft that carries the mark is equal to it. Used only
for the "uthmani" search variant, through `UTHMANI_VARIANT_OPTIONS`.

**Known limit of rule 14 in hadith.** The same words inside a matn (a hadith quoting one of those
ayat, for example) are removed from the hadith record's `searchText` and from the draft alike.
Retrieval is unaffected; a status must not be decided on `searchText` equality alone (see "strict").

### Level "strict"

Removes only rules 1–4 (harakat, superscript alef, annotation marks, tatweel). Letters,
punctuation, honorifics, digits and whitespace stay as they are. It answers one question for the
diff display: do two texts differ only in diacritics, or in letters? «إِنَّمَا» and «إنما» are equal
at level "strict"; «أحمد» and «احمد» are equal at level "search" but different at level "strict".

The superscript alef is removed here too. The task listed "harakat, tatweel and annotation marks";
U+0670 is a mark of the same kind and a writer without a Quran keyboard cannot type it, so keeping
it would report «الرحمن» as differing from «الرَّحْمَٰنِ».

### Attribution formulas

`stripAttributionPreamble` removes, from the start of a search-normalized string only, the formulas
in `ATTRIBUTION_PREAMBLES`: «قال رسول الله», «قال النبي», «عن النبي أنه قال», «في الحديث»,
«قال تعالى», «قال الله تعالى», «يقول الله تعالى». They are written in ordinary spelling and
normalized when the module loads, matched as whole words, longest first, and repeatedly (so
«في الحديث: قال رسول الله ﷺ: …» loses both). The formula says who the text is attributed to; it is
not part of the quoted wording, so it must not count as a difference from the source.

### What normalization does not bridge

Normalization itself adds nothing for the Quran source's mushaf spellings. The owner decided on
2026-10-03 (`docs/DECISIONS.md` D-9) to bridge them outside normalization: an ayah-bound variant
list (`data/aliases/quran-spelling-variants.json`) for everyday spellings, and a second,
Uthmani-script search text for pastes (next section). Measured with the rules above
(pinned in the tests under "samples from data/corpus/quran.json"):

| Writer's form | Source form | Equal at level "search" |
|---|---|---|
| الملأ، نبأ | الملإ، نبإ | Yes — a side effect of rule 6 |
| رحمة، امرأة | رحمت، امرأت | No |
| رؤوف | رءوف | No |
| مسؤولا | مسئولا | No |
| داود | داوود | No — and not in the variant list: the owner writes «داوود» |
| مئة | مائة | No |
| Uthmani paste «ٱلْعَـٰلَمِينَ» | «الْعَالَمِينَ» | No — Uthmani script writes this alef as U+0670, which rule 2 removes |

An Uthmani-script paste is equal to `searchText` only where the two differ in marks and wasla
(e.g. al-Fatiha 1, al-Ikhlas 1). The other ayat are found through the "uthmani" search variant.

### The Quran "uthmani" search variant

Every Quran record carries `searchVariants: [{ label: "uthmani", text }]`. `text` is the same ayah
in Uthmani script (Quranpedia mushaf 2, `docs/SOURCES.md` 1.1) normalized with
`normalizeWithMap(ayah, "search", UTHMANI_VARIANT_OPTIONS)`. It exists so that an ayah copied from a
mushaf site or app is found. Rules for whoever uses it (the Quran matcher):

- **For retrieval only.** It is never displayed and never the text of a diff. What the user sees,
  and what the word diff runs against, is `exactText`.
- **Same options on both sides.** Compare the variant with the draft span normalized with
  `UTHMANI_VARIANT_OPTIONS`; compare `searchText` with the span normalized with
  `{ keepHonorificPhrases: true }`. A span is found when either comparison succeeds.
- **A match through the variant is a spelling match**, not a wording difference: the two texts are
  the same ayah of the same riwayah (Hafs) in two scripts. It should carry its own `reasonCode`, so
  that it can be told apart from a match on `searchText`.
- **Only for spans written in Uthmani script** (owner's decision, `docs/DECISIONS.md` D-9). A draft
  that spells out an alef the source writes as a mark («الرحمان», «هاذا», «ذالك») also equals the
  variant, but it is a spelling error in everyday script and must not end `MATCH`. Use the variant
  for `MATCH` only when the span carries Uthmani signs: ٱ (U+0671), the superscript alef (U+0670) or
  a Quranic mark (U+06D6–U+06ED). A span without them is compared with `searchText` only.
- A quotation that spans several ayat must be compared with the variants of those ayat joined in
  order, not with a mix of variant and `searchText`.

Measured on 2026-10-03 against whole-ayah pastes from two widely used Uthmani texts (test input
only; neither is a source of Azw):

| Pasted text | Ayat found (of 6236) | Through `searchText` | Through the variant | Not found |
|---|---|---|---|---|
| quran.com `text_uthmani` | 6234 | 2250 | 3984 | 2:72, 15:7 |
| Tanzil Uthmani (as served by api.alquran.cloud) | 6230 | 2189 | 4041 | 2:72, 8:6, 12:39, 12:41, 13:37, 15:7 |

The ayat not found differ from mushaf 2 in one word's spelling or word division («فَٱدَّٰرَْٰٔتُمْ» in
2:72, «يَٰصَىٰحِبَىِ» in 12:39 and 12:41, «بَعْدَمَا» for «بَعۡدَ مَا» in 8:6 and 13:37, «لَّوْ مَا» for
«لَّوۡمَا» in 15:7). They reach the matcher as close candidates. Other Uthmani encodings were
not measured.

### Use in the corpus

`scripts/build-corpus.ts` fills `searchText = normalizeWithMap(exactText, "search").norm` for every
record (Quran records with `keepHonorificPhrases`), and the "uthmani" search variant for every Quran
record. `scripts/verify-corpus.ts` recomputes both and fails if either is empty or stale. Corpus
versions start with `p1-` when only `searchText` is filled and with `p2-` once the variant exists.
