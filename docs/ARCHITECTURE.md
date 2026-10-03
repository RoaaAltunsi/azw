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

### What normalization does not bridge (open decision)

`docs/SOURCES.md` §5 item 3 — how to bridge the Quran source's mushaf spellings — is still the
owner's decision. Nothing was added for it. Measured with the rules above
(pinned in the tests under "samples from data/corpus/quran.json"):

| Writer's form | Source form | Equal at level "search" |
|---|---|---|
| الملأ، نبأ | الملإ، نبإ | Yes — a side effect of rule 6 |
| رحمة، امرأة | رحمت، امرأت | No |
| رؤوف | رءوف | No |
| مسؤولا | مسئولا | No |
| داود | داوود | No |
| مئة | مائة | No |
| Uthmani paste «ٱلْعَـٰلَمِينَ» | «الْعَالَمِينَ» | No — Uthmani script writes this alef as U+0670, which rule 2 removes |

An Uthmani-script paste is equal to the source only where the two differ in marks and wasla
(e.g. al-Fatiha 1, al-Ikhlas 1). Until item 3 is decided, such quotations reach the matcher as
close candidates, not exact ones.

### Use in the corpus

`scripts/build-corpus.ts` fills `searchText = normalizeWithMap(exactText, "search").norm` for every
record (Quran records with `keepHonorificPhrases`). `scripts/verify-corpus.ts` recomputes it and
fails if a record's `searchText` is empty or stale. Corpus versions built this way start with `p1-`.
