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

## Reference parsing

Code: `src/core/references/index.ts`. Tests: `src/core/references/index.test.ts`.

The parser reads what the writer **claims** as a source. It is deterministic, uses no LLM, and
matches no text and decides no status. It never reads files: the alias lists are passed in.

### API

| Function | Result |
|---|---|
| `parseReferences(draft, aliases)` | Every citation in the draft, in draft order: `{ raw, span, parsed }`. `raw` is `draft.slice(span.start, span.end)` |
| `attachReference(quoteSpan, references, draft)` | The reference a quote is cited with, or `undefined` |
| `ParsedReferenceSchema`, `ReferenceSchema` | zod schemas of the output |
| `SurahAliasSchema`, `CollectionAliasSchema` | zod schemas of one entry of each alias file, for the caller that loads them |

`aliases` is `{ surahs, collections }`: the `surahs` array of `data/aliases/surahs.json` and the
`entries` array of `data/aliases/collections.json`. `attachReference` takes the draft as a third
argument, because a sentence boundary cannot be found from spans alone.

`parsed` is one of:

| `type` | Fields |
|---|---|
| `quran` | `surah`; `ayahStart?`; `ayahEnd?` (only for a range, always greater than `ayahStart`) |
| `hadith` | `collections` (ids, e.g. `bukhari`, `muslim`, `tirmidhi`); `number?` when one collection is cited; `numbers?` (collection → number) when several are cited and some carry a number |
| `unknown` | — |

### Reading the draft

The draft is cut into words, numbers and punctuation marks, each with its offsets. Words are
compared in level-"search" spelling, so diacritics, hamza forms, «ة/ه» and «ى/ي» do not matter:
«(البقره: 153)» and «رَوَاهُ الْبُخَارِيُّ» are read. Arabic-Indic digits are read as ASCII digits. The
dashes «- – — −» and a tatweel standing alone are one range sign; «،» is a comma.

### Quran forms

A surah name is any `bareName`, `spellingVariants` or `alternateNames` entry; the longest name
wins («حم السجدة» is فصلت, not السجدة). A name that would resolve to two surahs resolves to none.
Many surah names are ordinary words (النساء، محمد، الملك، ص), so a bare name is a citation only in
the shapes below.

| Shape | Example | Where |
|---|---|---|
| «سورة» + name | «سورة الكهف», «بسورة الفاتحة» | anywhere; surah only |
| «سورة» + name + ayah | «سورة البقرة الآية 153», «سورة البقرة: 153», «سورة البقرة آية رقم 255» | anywhere |
| ayah + «من سورة» + name | «الآية 255 من سورة البقرة» | anywhere |
| name `/` ayah | «البقرة/153» | anywhere; not for one-letter names («ص/15» is a page) |
| name + ayah as a whole bracket | «(البقرة: 152)», «[البقرة 153]», «(البقرة، 153)», «{البقرة: 153}» | `( )`, `[ ]`, `{ }` |
| name alone as a whole bracket | «[البقرة]» | square brackets only; «(محمد)» is ordinary text |

- Ayat: one number, or a range with a dash, «إلى» or «حتى». A range typed reversed
  («١٥٤-١٥٣», which is how a range in Arabic-Indic digits displays) is read in order.
- An ayah number has at most three digits. It is **not** checked against the surah's length:
  «(البقرة: 300)» is still a Quran citation, and the status rules report the mismatch.
- A list of ayat («153، 155») cannot be expressed as a range: the reference keeps the surah only.
- Outside brackets, a number with no «الآية», `:` or `/` before it is an ayah only when no word
  follows it: «قرأت سورة البقرة 3 مرات» cites the surah only.
- One-letter names (ص، ق، ن) in a bracket need a colon: «[ص: 29]» is the surah, «(ص 15)» is a
  page, «(ص)» is the abbreviation of ﷺ and is no reference.

### Hadith forms

`data/aliases/collections.json` gives each collection its `names` (البخاري، مسلم، الترمذي …) and
its `phrases` (صحيح البخاري، متفق عليه، الصحيحين …). The grammar holds no collection names.

| Shape | Example |
|---|---|
| narration verb + name(s) | «رواه البخاري», «أخرجه مسلم», «روى البخاري», «ورواه مسلم», «رواه البخاري ومسلم» |
| phrase, anywhere | «متفق عليه», «في الصحيحين», «صحيح مسلم برقم 1907» |
| name(s) as a whole bracket | «(البخاري)», «[مسلم: 2699]», «(البخاري 6018، مسلم 2564)» |

- Verbs: رواه، روى، أخرجه، أخرج، خرّجه, also with a leading «و» or «ف». «لم يروه» and «لم يخرجه»
  are other word forms and are not read. A verb with no known collection after it is no reference.
- A name alone is never a reference outside those shapes: «مسلم», «أحمد» and «مالك» are ordinary words.
- «متفق عليه» in its everyday sense is skipped: after «غير» or «ليس», or before «بين».
- Number: «(1)», «برقم 1907», «رقم (6018)», «، حديث رقم 13», or a bare number that no ordinary
  word follows. «1/20» is a volume and page, not a hadith number.
- «الإمام» before the name and «في صحيحه» (في سننه، في المسند …) after it are skipped.
- «رواه البخاري في الأدب المفرد»: «في» followed by anything other than the collection itself,
  «كتاب» or «باب» names another work of the author. That author's collection is dropped from the
  reference; if nothing is left the reference is `unknown`. The parser must not turn a citation
  of another book into a citation of the Sahih (AGENTS.md §2 rule 1).

### Unknown

A bracket in which no reference was found is `unknown` when it looks like a citation: it has one
of «رواه، أخرجه، خرّجه، سورة، تفسير، انظر، راجع», or a number that follows `:`, `/` or one of
«ص، ج، صفحة، رقم، حديث، آية», or (square brackets) words that end with a number, or it is a surah
number (1–114), a colon and ayat. Examples: «[تفسير ابن كثير 1/20]», «(البقرا: 153)», «[2:153]».
A reference that is `unknown` was seen but not read: the status rules must never treat it as a
reference that was checked and found correct. Any other bracket («(وهو حبس النفس)», «(عام 2020)»,
«(1)») is ordinary text and gives nothing.

When the brackets hold exactly one reference («(سورة البقرة: 153)», «(رواه البخاري)»), the
brackets are part of its `raw` and `span`.

### Attaching a reference to a quote

`attachReference` returns, in this order:

1. **The first reference after the quote**, if no sentence end (`. ! ? ؟ …` or a line break) lies
   between them. A sentence end with no word after it does not count: «"…". رواه البخاري».
   If an opening quotation mark lies between them, another quote stands there and the reference
   is that quote's: nothing is attached.
2. Otherwise **the last reference before the quote**, in the same sentence, at most
   `MAX_WORDS_BEFORE_QUOTE` (15) words away, with no quotation mark between them and none earlier
   in that sentence: «قال تعالى في سورة البقرة: ﴿…﴾», «روى البخاري عن أنس أن النبي ﷺ قال: «…»».
   A reference that follows an earlier quote is that quote's and is not taken.
3. Otherwise none.

When in doubt it attaches nothing: a missing reference is never reported as a wrong one.
`quoteSpan` may include the quotation marks or not.
