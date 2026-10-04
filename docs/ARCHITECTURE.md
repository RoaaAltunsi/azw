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
  the same ayah of the same riwayah (Hafs) in two scripts. It is told apart from a match on
  `searchText` by the candidate's `layer` ("uthmani") and `spelling` ("bridged"), not by a
  `reasonCode` of its own: the reason codes of `MATCH` say what happened to the reference
  ("Quran matcher", `docs/DECISIONS.md` D-12 item 7).
- **Only for words written as the mushaf writes them** (owner's decisions, `docs/DECISIONS.md` D-9
  and D-13). A draft that spells out an alef the source writes as a mark («الرحمان», «هاذا», «ذالك»)
  also equals the variant, but it is a spelling error and must never end `MATCH`. The rule is applied
  word by word and is described under "Quran matcher": a word that differs from `searchText` may
  match through the variant only when it is in Uthmani script and does not spell out a superscript
  alef. The superscript alef and the pause marks alone do not make a span "Uthmani script": the
  everyday-script source text carries them too.
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
| `quran` | `surah`; `ayahStart?`; `ayahEnd?` (only for a range, always greater than `ayahStart`); `partial?` |
| `hadith` | `collections` (ids, e.g. `bukhari`, `muslim`, `tirmidhi`); `number?` when one collection is cited; `numbers?` (collection → number) when several are cited and some carry a number; `partial?` |
| `unknown` | — |

`partial: true` means the writer cited more than the fields express: a list of ayat
(«(البقرة: 153، 155)» keeps the surah only) or a number after a group («متفق عليه (1907)» drops
the number). The status rules must treat a partial reference like an `unknown` one: never as a
reference that was checked and found correct.

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
- A list of ayat («153، 155») cannot be expressed as a range: the reference keeps the surah only
  and is marked `partial`.
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
- For the same reason a phrase after «شرح», «بشرح» or «مختصر» («شرح صحيح مسلم», «مختصر صحيح
  البخاري (5)») is a commentary or an abridgement, not the collection: `unknown`.
- A number after a group («متفق عليه (1907)») belongs to no single collection: it is dropped and
  the reference is marked `partial`.
- «رواه البخاري تعليقاً» («معلقاً»): the writer says more about the hadith than the fields can
  carry. The reference is read as the collection and marked `partial`.

### A number the reference did not take in

A reference is also `partial` when a number the writer cited stands right after it, outside what
was read (the number stays outside `raw` and `span`):

| Form | Read as |
|---|---|
| «سورة البقرة (153)» outside a bracket | the surah, `partial` |
| «سورة البقرة الآية 3 والآية 4», «… آية 3، وآية رقم 4» | the surah and ayah 3, `partial` |
| «رواه مسلم ح 2699» | the collection, `partial` |

The rule: after the reference (and an optional «،») comes an ayah word, «و» + an ayah word or «ح»,
then a number; or the reference carries no number and a bracket holding only a number follows.
A bracketed number after a reference that already has one («سورة البقرة: 153 (1)», a footnote
mark) and a bare number with words after it («سورة البقرة 3 مرات») do not count.

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

## Corpus index

Code: `src/core/corpus/` (`adapter.ts`, `corpus-index.ts`, `kind-meta.ts`, `schema.ts`) and
`src/server/corpus-loader.ts`. Tests beside each file. Benchmark: `npm run bench:index`.

The index answers two questions about a normalized quote: where exactly it occurs in the sources,
and which records are closest to it. It does not score beyond bigram containment, align, diff,
decide a status or give a reason code; those belong to the matchers. It never logs or stores a
query, and its error messages never contain one (a query is draft content, `AGENTS.md` §2 rule 8).

### Adapters, units and layers

A `SourceAdapter` describes one collection, so that the index never branches on a kind or a
collection:

| Member | Meaning |
|---|---|
| `kind`, `collection` | As on the records |
| `load()` | The records. Core does no I/O: the adapter was given them already loaded |
| `units(records)` | The records grouped into units, in reading order. The index joins the records of one unit with a space, so a quote that runs over several records of a unit is one hit. Two units are never joined |
| `layers` | The search layers: `{ name, options, text(record) }` |

A **layer** is one normalized text per record plus the `NormalizeOptions` a query must be
normalized with (level "search") to be compared with it. Layer texts are for retrieval only: never
displayed, never diffed, never cited.

| Adapter | Units | Layers |
|---|---|---|
| `createQuranAdapter(records, spellingVariants)` | One per surah, ayat in ayah order (whatever order the records arrive in) | `default` = `searchText`, options `{ keepHonorificPhrases: true }`. `uthmani` = the `searchVariants` entry with that label, options `UTHMANI_VARIANT_OPTIONS`. `everyday` = see below, options as `default` |
| `createHadithAdapter(collection, records)` | One per record | `default` = `searchText`, no options |

**The "everyday" layer** is derived when the Quran adapter is created, from
`data/aliases/quran-spelling-variants.json`. It is not written to `data/corpus` and does not change
`corpusVersion`. For each ayah the list names, the words of `searchText` equal to a normalized
`sourceForm` are replaced by the normalized `everydayForm`: whole words only («برحمت» is not touched
by the pair for «رحمت»), and only in the listed ayat («لعنت» stays in 7:38). Every other ayah keeps
its `searchText`, so a surah is still one continuous text on this layer. Consequences:

- A quote with no listed word is found on `default` and on `everyday` alike. Only a hit on
  `everyday` that `default` does not have went through the spelling list.
- In a listed ayah the layer holds the everyday form only. A quote that writes one listed word in
  the mushaf spelling and another in the everyday spelling is not an exact hit on any layer
  (`docs/BACKLOG.md`).
- The adapter throws if the list names an ayah, or a word of an ayah, that the records do not have.

The index reports which layer produced a hit and nothing more. Whether a hit on `uthmani` or
`everyday` may end `MATCH` is a status rule (`docs/DECISIONS.md` D-9), decided by the matcher.

### API

`buildCorpusIndex(adapters)` takes the adapters of all kinds and returns a `CorpusIndex`. It throws
on a record id held twice, on a unit grouping that loses or repeats records, and on a duplicate layer.

A layer is addressed by `LayerRef = { collection, layer }`, not by its name alone: Quran "default"
and hadith "default" are normalized with different options (D-7), so one normalized query cannot
serve both. To search every source, loop over `index.layers`.

| Member | Result |
|---|---|
| `layers` | Every layer: `{ collection, kind, layer, options }`, in adapter order |
| `normalizeFor(layer, text)` | `normalizeWithMap(text, "search", <the layer's options>)`: `{ norm, map }`. The way to normalize a query for a layer |
| `findExact(normQuery, layer)` | Every occurrence, as `ExactHit[]`, in text order |
| `candidates(normQuery, layer, k = 10)` | The `k` closest records, as `Candidate[]`, best first |
| `record(id)` | The `SourceRecord`, or `undefined` |
| `layerText(layer, recordId)` | The record's text on that layer: what a hit's offsets point into |
| `recordCount` | Number of records over all adapters |

**Exact lookup.** An occurrence must start and end on word boundaries: «من الله» is not found
inside «المؤمن الله». All occurrences are returned, including overlapping ones, several in one
record, the same text under several numbers and in several collections (one call per collection
layer). Pending records are indexed like any other; the hit carries the records, so the caller sees
`reviewStatus`. Whitespace in the query is collapsed; nothing else is changed, so a query that was
not normalized with `normalizeFor` simply misses. An empty query returns `[]`.

```ts
interface ExactHit {
  collection: string;
  layer: string;
  recordIds: string[];      // the records the occurrence runs over, in unit order
  records: SourceRecord[];  // the same records
  start: number;            // offset in the layer text of the first record
  end: number;              // offset (exclusive) in the layer text of the last record
}
```

From this the matcher derives an ayah range (first and last record) and tells a whole record from a
part of one (`start === 0` and `end === layerText(layer, lastId).length`). The offsets are in layer
text, not in `exactText`; mapping to `exactText` is the matcher's alignment step.

**Fuzzy candidates.** Each layer has an inverted index from word bigram to the records holding it
(Quran: ayat). `score = |distinct query bigrams the record holds| / |distinct query bigrams|`. Ties
are broken by record id (code-unit order), so the order is the same on every run and does not
depend on the order of the records. Limits:

- A query of fewer than two words has no bigrams: the result is `[]`.
- Bigrams do not cross record boundaries. A quote spanning two ayat gets each ayah as a separate
  candidate with a score below 1.
- A record that holds the query exactly is also a candidate (score 1).

### Implementation

Per layer: one string holding every unit (records joined by a space, units by a line break, which
normalized text never contains), an array of record start offsets, and the bigram map. Exact lookup
is `indexOf` over that string, a boundary check, and a binary search for the first and last record.

### Loader

`loadCorpus(root = process.cwd())` in `src/server/corpus-loader.ts` is the only runtime code that
reads files, and `src/core` may not import it (lint rule, `src/core/boundary.test.ts`). It returns
`{ index, corpusVersion, coverage, aliases: { surahs, collections } }`, built once per root and
server instance. It reads `data/corpus/manifest.json`, the corpus files the manifest lists and the
three alias files, and throws if: a file is missing or is not JSON; a file fails its zod schema; a
corpus file's sha256 differs from the manifest; `recordCount`, the number of records and the
manifest's count are not all equal; a file's kind or collection differs from the manifest, or a
record's from its file; `coverage` and the corpus files differ; a kind has no adapter factory. A
failed load is not cached. `reviewStatus` is read from the records; `data/review/` is not read.

The steps are exported separately (`readCorpus`, `validateCorpus`, `buildCorpus`) so that the
benchmark can time them. The file schemas live in `src/core/corpus/schema.ts`;
`scripts/lib/schema.ts` re-exports them, and the record schema from `src/core/types.ts`.

### kindMeta

`kindMeta` / `getKindMeta(kind)` in `src/core/corpus/kind-meta.ts`: `{ labelAr, citationFormatter }`
per kind, so that the UI and the status rules do not branch on a kind. "quran" and "hadith" are
registered; the labels come from `src/i18n/ar.ts` (`kind.quran`, `kind.hadith`). Both formatters
return `record.citation.display`, which the corpus build writes from the source data: a record with
`citation.number = null` is shown without a number and none is ever composed at runtime.

### Measured

`npm run bench:index` on 2026-10-03 (Node 22.16, Windows 11 laptop; 21,176 records, 5 layers):

| Step | Result | Budget |
|---|---|---|
| Read + parse (42 MB of JSON, with sha256) | 250–270 ms | — |
| zod validation | about 105 ms | — |
| Index build | 400–640 ms cold over five runs; 360–840 ms on repeats, depending on what else the machine is doing (one repeat under heavy load took 2.5 s) | < 1.5 s |
| Heap used | 80 MB after read + parse, 88 MB after validation, 170 MB after the build (highest sample of one load); 157 MB retained after gc | — |
| `findExact`, 300-word draft with 5 quotes, each on all 5 layers | median 0.2 ms, max 0.8 ms | < 50 ms |
| `candidates`, same draft | median 0.2 ms, max 2.2 ms | < 50 ms |
| The whole draft: 25 × (normalize + exact + candidates) | 19 ms | — |
| Worst case, `findExact` of the one word «الله» | 14 ms on `muslim` (14,373 hits), 12 ms on `bukhari` (15,572 hits), 2 ms on a Quran layer | < 50 ms |

Heap is sampled at the end of each phase, so a higher transient peak inside a phase is not seen.
The retained figure includes the parsed files the benchmark script keeps; the records themselves
(`exactText` included) are shared with the index, not copied.

## Quran matcher

Code: `src/core/matchers/` (`matcher.ts`, `quran.ts`, `layer-words.ts`, `index.ts`). Tests:
`src/core/matchers/quran.test.ts` (fixture records) and
`src/server/quran-review.integration.test.ts` (real corpus, through the orchestrator; it sits
beside the loader because `src/core` may not read files).

A matcher finds where a quote stands in the records of its kind and reports what it found. It
decides no status.

### API

```ts
interface QuoteInput {                 // src/core/types.ts
  span: { start: number; end: number; text: string };   // text = draft.slice(start, end)
  claimedKind: ClaimedKind;
  reference?: Reference;               // from attachReference, if any
}

interface Matcher {
  kind: ContentKind;
  match(quote: QuoteInput, index: CorpusIndex): MatchCandidate[];   // best first
}

interface MatchCandidate {
  kind: ContentKind;
  collection: string;
  recordIds: string[];                 // the records the quote runs over, in reading order
  records: SourceRecord[];
  ayahRange?: [number, number];
  score: number;                       // quote words equal to their source word / quote words
  layer: string;                       // the search layer it was found on
  hit: "exact" | "fuzzy";
  spelling: "same" | "bridged" | "error";
  reference: ReferenceCheck;           // none | consistent | unchecked | mismatch + reason code
  claimAdmitted?: boolean;             // of another kind than claimed, in words that also cite this kind ("Hadith matcher")
  alignment: Alignment;                // quote words and source words; input of wordDiff
}
```

| Export of `src/core/matchers` | |
|---|---|
| `matchers`, `getMatcher(kind)` | The registry, by kind: `quran` and `hadith`. A new kind adds one line |
| `matchAll(quote, index)` | Runs every registered matcher, whatever the claimed kind (a "hadith" may be a verse) |
| `quranMatcher`, `hadithMatcher` | The two matchers ("Hadith matcher" below) |
| `inVerseMarks(draft, span)` | Whether a span stands between `﴿` and `﴾` in the draft: `QuoteInput.verseMarks` |
| `hasUthmaniSigns(text)` | Whether a span carries a sign that only Uthmani-script texts have. The one place this check lives (`uthmani-spelling.ts`) |
| `evidenceOf(candidate)` | The `Evidence[]` of a `ReviewItem`: one entry per record (as an `ApiSourceRecord`, without the retrieval keys: see "API v1"), each with the part of the word diff that concerns it. An `insert` (no source) goes with the record of the op before it, or the first |

The result type is `MatchCandidate`, because `Candidate` is the index's type.

### The quote

For each layer the span text is normalized with `index.normalizeFor(layer, text)`, and leading
attribution formulas are removed with `stripAttributionPreamble`. Words made of digits only are
left out: they are ayah numbers typed between the ayat («… (153) …»), and the Quran text has no
digits. The words that remain keep their ranges in the draft (through the offset map, shifted by
`span.start`). A span with no words gives no candidates.

### Exact hits and the layer rules

`index.findExact` is run on the three layers in the order below. Every occurrence is one candidate
(`hit: "exact"`), reported on the **first layer that finds it at that place**; a place is where the
occurrence starts in `exactText`, so the same occurrence found on two layers is one candidate.
Candidates are in mushaf order.

| Layer | An occurrence found here and not on a layer above | Reported as |
|---|---|---|
| `default` | The quote reads as the source text does | `spelling: "same"`, score 1 |
| `everyday` | It reads so through a spelling of the approved list (D-10 item 2) | `spelling: "bridged"`, score 1 |
| `uthmani` | Every word is written as the mushaf writes it (below) | `spelling: "bridged"`, score 1 |
| `uthmani` | At least one word is not | `spelling: "error"`, score < 1 |

When the quote is found somewhere as it stands (`same` or `bridged`), the `error` occurrences are
dropped: they matter only when there is nothing else. The status rules never give an `error`
candidate `MATCH`.

`ayahRange` is the ayah of the first and of the last record of the hit.

**The "uthmani" layer, word by word** (`uthmani-spelling.ts`; `docs/DECISIONS.md` D-9, D-13). The
layer writes the superscript alef as «ا» and «ءا» as «ا», so it is also equal to everyday-script
text that spells such an alef out. For each word of the quote:

1. If the word, normalized as for `default`, is the main text's word, it needs no bridge.
2. Otherwise it must be **in Uthmani script**: the span carries a sign that only Uthmani texts have
   (`hasUthmaniSigns`: ٱ U+0671, the marks U+0653–U+065F, the Quranic marks U+06DF–U+06ED without
   ۩), or the word itself carries a superscript alef (U+0670), which no keyboard types.
3. And it must **not spell out a superscript alef** (`spellsOutSuperscriptAlef`). The word's letters
   are aligned with the main text's letters; a bare alef of the draft is
   - the everyday spelling of that alef, where the main text has an alef too — unless the letter
     before it is a «و» or «ي» the main text does not have («الصلواة» for «الصلوٰة»);
   - the mushaf's own letter, where it stands in the place of another letter («لدا» for «لدى»);
   - a superscript alef spelt out, where the main text has no letter there («الرحمان», «هاذا»).
   An alef with hamza or wasla, and an alef marked silent (U+06DF, U+06E0, or U+0652 on an alef),
   are never counted.

The superscript alef, the pause marks and ۞ do not make a span "Uthmani script": the
everyday-script source text has them (3,215 superscript alefs, 4,364 pause marks), and no Quran
record has any of the signs `hasUthmaniSigns` accepts (tested on the corpus).

A word that fails is compared as the main text reads it, on both sides, so the diff shows exactly
the misspelt words as `replace`; the score is the share of the quote's words that pass.

Measured on 2026-10-03 with every ayah of Quranpedia mushaf 2 (the Uthmani text the variant is
built from; `data/raw`, test input only) pasted whole:

| Input | `default` | `uthmani`, accepted | `uthmani`, spelling error |
|---|---|---|---|
| The 6236 ayat as they are | 2248 | 3988 | 0 |
| The 4367 ayat that have a superscript alef, with every one of them spelt out as «ا» | 1231 | 552 | 2584 |

- Re-measured on 2026-10-03, after the combining maddah and hamza (U+0653–U+0655) were added to
  the signs (`docs/DECISIONS.md` D-13). Before, 32 pastes were refused: «فَبِأَيِّ ءَالَآءِ رَبِّكُمَا
  تُكَذِّبَانِ» (31 ayat of الرحمن) and 53:55, whose only Uthmani sign is the maddah of «ءَالَآءِ».
  Mushaf 1 never carries these three marks (it writes آ أ إ as single characters); mushaf 2 carries
  them 6161 times. The second row did not change.
- In the second row, the 552 accepted ayat are those where every spelt-out alef is one the everyday
  text writes too («ءايات», «ياأيها», «القرءان»); the 2584 with an alef the everyday text does not
  write are all refused.
- Tanzil and quran.com texts were not re-measured after this rule (no local copy).

### From a layer back to exactText

A hit's offsets are in layer text. `layerWords(index, layer, record)` gives every word of a record
on a layer the range of `exactText` it stands for. `exactText` is normalized with the layer's own
options, which keeps an offset map; where that text equals the layer text word for word (always on
`default`), the ranges are read off the map. Where it does not (`everyday`: «رحمه» for «رحمت»;
`uthmani`: «ياايها» for «يا أيها», «والصلواه» for «والصلاة»), the two are aligned letter by letter
and each layer word takes the words of `exactText` its letters fall on. One layer word may cover two
words of `exactText`. The result is cached per index and record; it holds source text only.

### Fuzzy candidates

Only when no layer has an exact hit. Layers: `default` and `everyday`, plus `uthmani` when the span
has an Uthmani sign or a superscript alef (a close candidate is never a match, so any mushaf mark
is enough here).

1. `index.candidates(quote, layer, 5)` gives the closest ayat by word bigrams.
2. For each, the window is that ayah and the two ayat before and after it in the same surah.
3. The quote's words are aligned with the window's words by Smith-Waterman on words
   (`alignTokens(…, "local")`: match +2, different word −1, gap −1).
4. `score = quote words equal to their source word / quote words`. The aligned stretch of the window
   gives the records and `ayahRange`.
5. Windows of neighbouring candidates overlap. Of several stretches that overlap in the mushaf only
   the best is kept (equal scores: `default` before `everyday` before `uthmani`). At most five
   candidates are returned, best first, then in mushaf order.

A quote of one word has no bigrams and so no fuzzy candidate. A quote with a word missing scores 1
and is still `hit: "fuzzy"`: the score counts the quote's words only.

### The cited reference

The matcher compares `quote.reference` with each candidate, because what a reference means depends
on the kind; the status rules only read the outcome.

| Reference | Outcome |
|---|---|
| None | `none` |
| `unknown`, or of another kind (a hadith citation) | `unchecked` |
| Quran, another surah (also when `partial`) | `mismatch` / `REF_MISMATCH_SURAH` |
| Quran, `partial` (a list of ayat), same surah | `unchecked` |
| Quran, the surah only, same surah | `consistent` |
| Quran, an ayah or a range equal to `ayahRange` | `consistent` |
| Quran, same surah, any other ayah or range | `mismatch` / `REF_MISMATCH_AYAH` |

A cited range must equal the range the quote covers: two ayat cited with the first ayah only is a
mismatch. When a reference is cited, exact candidates are ordered: those it agrees with, then
unchecked, then same surah, then the rest.

## Hadith matcher

Code: `src/core/matchers/hadith.ts`, `verse-marks.ts`. Tests: `src/core/matchers/hadith.test.ts`
(fixture records) and `src/server/hadith-review.integration.test.ts` (real corpus, through the
orchestrator). Decisions: `docs/DECISIONS.md` D-22.

`hadithMatcher` (kind "hadith") searches the `default` layer of every hadith collection the index
holds, in corpus order (`bukhari`, then `muslim`). It names no collection: a new hadith book is a
corpus file and an adapter. The layer is the whole `searchText`, chain included; `matnText` is not
used. Like the Quran matcher it reports what it found and decides no status, and it adds no grade:
a grade reaches a result only as `record.grade` of an evidence record, with its `by`.

### The quote

Normalized with the layer's options; a leading attribution formula is left out, as for the Quran.
A quote with no word left gives no candidate.

### Exact hits

`findExact` on each collection. **One candidate per record** that holds the quote word for word: a
second occurrence inside the same record is the same place (the first is aligned). `score` 1,
`hit: "exact"`, `spelling: "same"` (there is one layer, so nothing is bridged), no `ayahRange`.
The same wording under several numbers or in both books gives several candidates, which `decide()`
reads as one result ("Status rules").

`alignment` is built when it is read. A short quote stands in thousands of records («رسول الله»:
7534), and only the occurrences that are shown need their words, so the words of a record are
computed for those and are not cached (`wordsOnLayer`; the Quran matcher's `layerWords` caches,
which for 14,000 long records would grow with every quote).

### Close candidates

Only when no hadith collection has an exact hit.

1. `index.candidates(quote, layer, 10)` per collection: the closest records by word bigrams.
2. The quote's words are aligned with the words of the whole record (Smith-Waterman on words, as
   for the Quran). `score = quote words equal to their source word / quote words`; the aligned
   stretch is the candidate's source side.
3. A record in which fewer than three words of the quote stand (`MIN_MATCHED_WORDS`) is not a
   candidate. Records are long and hold the chain, so two neighbouring words of almost any
   sentence stand in some record: «النظافة من الإيمان» shares «من الإيمان» with several, and must
   not be shown as a near match of them (tune case `T-015`, D-22 item 9).
4. Best first; equal scores keep the corpus order of the collections. At most five are returned.

A quote of one word has no bigrams and so no close candidate. A quote of two or three words is
either found word for word or not found: with one word changed, fewer than three are left.

### The cited reference

Each candidate carries the comparison of `quote.reference` with its record. `found` is where the
quote was found, over all candidates. The first row that applies:

| Reference | Outcome |
|---|---|
| None | `none` |
| `unknown`, or of another kind (a Quran citation) | `unchecked` |
| Names a book the index does not hold («رواه الترمذي», «رواه البخاري والترمذي») | `unchecked` |
| Does not name the record's collection (also when `partial`) | `mismatch` / `REF_MISMATCH_COLLECTION` |
| `partial` | `unchecked` |
| Names several books («متفق عليه», «رواه البخاري ومسلم») and one of them holds the quote in no record | `mismatch` / `REF_NOT_AGREED_UPON` (exact hits); `unchecked` (close candidates: they are the best few only) |
| A number for this collection (`number`, or `numbers[collection]`), and the record has no `citation.number` | `unchecked` |
| A number that is not `citation.number` (leading zeros aside) | `mismatch` / `REF_MISMATCH_NUMBER` |
| One of the cited books holds the quote in pending records only | `unchecked` |
| Otherwise | `consistent` |

- **A book the tool has no copy of** can be neither confirmed nor contradicted: the text may well
  be in al-Tirmidhi too. Such a citation on a text found in the Sahihayn ends `NEEDS_SPECIALIST` /
  `REF_NOT_CHECKED`, never a wrong reference.
- **The number** is compared with `citation.number`: for Muslim the Abd al-Baqi number, not the
  record id (`muslim:534` is cited as no. 223). A split entry is cited by its integer part.
  Editions number differently, and the `REF_MISMATCH_NUMBER` sentence says so.
- **Pending records** hold a text but confirm nothing (D-22 item 1): a cited book counts as
  confirmed only through a reviewed record. «متفق عليه» on a text that is reviewed in one book and
  pending in the other is `unchecked` on every candidate, so the result is `NEEDS_SPECIALIST` /
  `REF_NOT_CHECKED` on the reviewed record: not `MATCH_REF_OK`, and not a wrong reference.
- Exact candidates are ordered: those the reference agrees with, then unchecked, then a wrong
  number, then a book missing from a group, then another book. `decide()` gives the reason of the
  first, so the nearest miss is the one reported.

The sentences of `REF_MISMATCH_COLLECTION` and `REF_NOT_AGREED_UPON` say that the text was not found
in the tool's copy of the book («لم نجده في نسختنا من الكتاب …. هذا لا يعني أنه ليس فيه»), never
that the book does not contain it (`docs/DECISIONS.md` D-6 item 4): the corpus has gaps.

### Hadith qudsi: a claim another kind admits

«قال الله تعالى: «…»» is the claim of a verse and also a form of citing a hadith qudsi (D-20
item 9). The extractor gives such a quote the kind `quran`. So that a hadith qudsi cited this way
does not end `DIFFERS` / `KIND_MISMATCH`:

- `QuoteInput.verseMarks` says whether the span stands between `﴿` and `﴾` in the draft
  (`inVerseMarks`, set by the orchestrator, whoever extracted the span).
- The hadith matcher sets `claimAdmitted: true` on its candidates when the claimed kind is `quran`
  and the span is not in verse marks.
- `decide()` reads `claimAdmitted` only when no exact hit is of the claimed kind: the admitted
  candidates then stand for it, and the reference is read as for a hadith claim (rule 2 of "Status
  rules"). It names no kind.

`ReviewItem.claimedKind` stays `quran`: it is what the draft says. A verse after «قال الله تعالى»
is found in the Quran and is answered by the Quran records alone, even when a hadith record
quotes it. A `﴿…﴾` quote found only in a hadith record stays `KIND_MISMATCH`. The rule does not
read whose words the text is inside the record (D-22 item 2 gives the reason and the limit).

### Measured

On 2026-10-03 (Node 22.16, Windows 11 laptop, the real corpus, warm): one review of a draft with
ten hadith quotes, regex extractor, no LLM: 28–53 ms over four runs. A two-word quote found in
7534 records: 42 ms.

## Word diff

Code: `src/core/diff/` (`index.ts`, `align.ts`). Tests: `src/core/diff/index.test.ts`.

| Function | Result |
|---|---|
| `wordsOf(normalized, original, from?, offset?)` | The words of a normalized text, each with its `key` (the normalized word) and its range in the original, trailing diacritics included |
| `alignTokens(a, b, mode)` | `mode` "local" is Smith-Waterman, "global" is Needleman-Wunsch, over any tokens: the pairs, the number of equal pairs and the aligned stretch. Same scoring in both modes |
| `wordDiff(alignment)` | `DiffOp[]` |

`Alignment` is `{ quote: Word[]; source: SourceWord[] }`: every word of the quote with its range in
the draft, and the stretch of source words the matcher aligned it to, each with its `recordId` and
its range in that record's `exactText`. `wordDiff` aligns the two globally by `key` and merges
consecutive words with the same op and the same record.

```ts
interface DiffOp {                                   // src/core/types.ts, DiffOpSchema
  op: "equal" | "replace" | "insert" | "delete";
  draft?: { start: number; end: number };            // in the user's draft; absent only for "delete"
  source?: { recordId: string; start: number; end: number };   // in exactText; absent only for "insert"
}
```

- Ops are in reading order and describe the draft relative to the source: `insert` = words only in
  the draft, `delete` = words only in the source, `replace` = other words in the draft.
- An op carries ranges, never text. The client slices the draft and `exactText`. Layer text never
  appears in an op.
- An op never crosses a record: a quote over two ayat gives at least one op per ayah.
- A `delete` has no place in the draft of its own; it stands between the ops before and after it.
- The `key` two words are compared by comes from the layer the candidate was found on, so «رحمة»
  is `equal` to the «رحمت» of `exactText` in a listed ayah, and an Uthmani-script word is `equal`
  to its everyday spelling. In a spelling-error candidate the misspelt words are compared as the
  main text reads them, so exactly those words show as `replace`. The ranges are always those of
  `exactText`.
- A word's range takes in the marks after its last letter and a letter normalization dropped
  before its first (the hamza of «ءا»).

## Status rules

Code: `src/core/status/` (`decide.ts`, `reason.ts`, `reason-codes.ts`). Tests: `decide.test.ts`
(one row per branch), `reason.test.ts`.

`decide({ claimedKind, claimLevel?, candidates }, config = STATUS_CONFIG)` is a pure function and the only place
a status is decided. It reads what the matchers reported (`kind`, `hit`, `spelling`, `score`,
`reference`, `reviewStatus` of the records) and never branches on a specific kind. It returns
`{ status, contentLevel, reasonCode, evidence }`; `evidence` holds the candidates the decision rests
on, best first. It never returns `ERROR` (the orchestrator sets it when something throws).

`STATUS_CONFIG = { T_HIGH: 0.8, T_LOW: 0.5, AMBIGUITY_MARGIN: 0.05 }`: initial values, to be tuned
on `eval/cases/tune.jsonl` only.

The rules, in order. The first that applies decides.

| # | Condition | Status | Reason code | Level |
|---|---|---|---|---|
| 1 | `claimedKind` is `interpretive_claim` | `NEEDS_SPECIALIST` | `INTERPRETIVE_CLAIM` | C |
| 1 | `claimedKind` is `interpretive_claim` and `claimLevel` is `"D"` (a ruling for a personal case) | `NEEDS_SPECIALIST` | `PERSONAL_RULING` | D |
| 1 | `claimedKind` is `unclear_attribution` | `NEEDS_SPECIALIST` | `UNCLEAR_ATTRIBUTION` | A |
| 2 | Exact hits (spelling `same` or `bridged`), none of the claimed kind and none with `claimAdmitted` | `DIFFERS` | `KIND_MISMATCH` | A |
| 2 | Exact hits, none of the claimed kind, some with `claimAdmitted` | rules 3–6 on those candidates | | A |
| 3 | Exact, claimed kind, the reference is `consistent` with an occurrence | `MATCH` | `MATCH_REF_OK` | A |
| 4 | Exact, claimed kind, the reference is `unchecked` | `NEEDS_SPECIALIST` | `REF_NOT_CHECKED` | A |
| 5 | Exact, claimed kind, the reference is a `mismatch` for every occurrence | `DIFFERS` | the first occurrence's code (`REF_MISMATCH_AYAH`, `REF_MISMATCH_SURAH`; hadith: `REF_MISMATCH_NUMBER`, `REF_NOT_AGREED_UPON`, `REF_MISMATCH_COLLECTION`) | A |
| 6 | Exact, claimed kind, no reference | `MATCH` | `MATCH_NO_REFERENCE` | A |
| 7 | Exact hit with spelling `error` only | `DIFFERS` | `WORDING_DIFF` | A |
| 8 | No candidate, or best score < `T_LOW` | `NOT_FOUND` | `NO_RECORD_IN_COVERED_SOURCES` | A |
| 9 | Two or more candidates within `AMBIGUITY_MARGIN` of the best, with different texts | `NEEDS_SPECIALIST` | `AMBIGUOUS_CANDIDATES` | A |
| 10 | `T_LOW` ≤ best score < `T_HIGH` | `NEEDS_SPECIALIST` | `LOW_CONFIDENCE_MATCH` | A |
| 11 | Best score ≥ `T_HIGH`, not exact | `DIFFERS` | `WORDING_DIFF` | A |
| — | Rules 2–7 and 11, when none of the candidates the result would rest on is wholly `reviewed` | `NEEDS_SPECIALIST` | `SOURCE_NOT_REVIEWED` | A |

- **Claims are not compared** and carry no evidence, even when the same words are in a source.
  `claimLevel` comes from whoever extracted the claim (P10); it is absent for everything else. This
  is the shape the evaluation cases use: kind `interpretive_claim` with `contentLevel` C or D.
- **Pending records** give neither `MATCH` nor `DIFFERS`. A candidate counts as reviewed only when
  every record it runs over is. When a text is in a reviewed and in a pending record, the result
  rests on the reviewed one and the pending one is left out of the evidence.
- **Several exact occurrences are one result**, never ambiguity: they are the same wording.
  With `MATCH_REF_OK` the evidence is the occurrences the reference agrees with; otherwise all.
- **"Different texts"** in rule 9 compares the aligned source words of the candidates. The same
  wording found close in two places is one result with both as evidence.
- **A claim another kind admits** (`claimAdmitted`, set by a matcher): the quote claims one kind
  in words that are also a way of citing another («قال الله تعالى» before a hadith qudsi). It is
  read only when nothing of the claimed kind was found word for word; the rule names no kind
  (`docs/DECISIONS.md` D-22 item 2).
- **Kind** is compared only for exact hits (rule 2). A close candidate of another kind is rule 11:
  the sentence names the source, and the wording is the first thing to correct.
- **Rule 4** is `docs/DECISIONS.md` D-11.

### Reason sentences

`reasonAr(decision, { coverage })` returns the one Arabic sentence of a decision. The sentences are
in `src/i18n/ar.ts` under `reason.<CODE>` and are filled with `format()`: `{ref}` is the citation of
the first evidence candidate through `kindMeta.citationFormatter` (a quote over several records:
«من … إلى …»; several occurrences: «… (وفي n من المواضع الأخرى)»), `{kind}` the label of the record's
kind, `{coverage}` the covered collections (`ReviewResult.coverage`: those that are searched, see "Orchestrator"), each shown by its name
(`collection.<id>` in `src/i18n/ar.ts`: «القرآن الكريم», «صحيح البخاري», «صحيح مسلم»; a collection
without a name is shown by its id), joined with «، ».

The sentences themselves never contain «صحيح» (tested; the book titles in `{coverage}` are names), the `NOT_FOUND` sentence never judges the text, and
the `WORDING_DIFF` sentence points to the source without repeating the altered words.

## Regex extractor

Code: `src/core/extract/index.ts`. Tests: `src/core/extract/index.test.ts` (hand-written drafts).

`regexExtractor` is an `Extractor` (`draft → ExtractedQuote[]`, `extractedBy: "regex"`). It is the
fallback when no LLM takes part and the baseline the LLM extractor ("LLM extractor" below) is compared with. It reads
the draft only: no corpus, no alias list, no LLM. It decides no status; a quote it returns is a
claim of the writer that the matchers then check.

### Forms

1. **`﴿…﴾`, anywhere**: always `quran`, whatever stands before it, and also when it is one word.
2. **The text after an attribution phrase.** The phrases are `ATTRIBUTION_PATTERNS`, an exported
   list; `createRegexExtractor(patterns)` builds an extractor from an extended list.

| Kind | Phrases | Marks | Without marks |
|---|---|---|---|
| `quran` | «قال تعالى», «قال الله تعالى», «قال سبحانه», «يقول الله», «قوله تعالى» | `«…»`, `“…”`, `"…"`, and `(…)` right after the phrase | up to the sentence end |
| `hadith` | «قال رسول الله», «قال النبي», «قال ﷺ», «عن النبي … قال» | `«…»`, `“…”`, `"…"` | up to the sentence end |
| `hadith` | «في الحديث», «ورد عنه» | the same | only after a colon |
| `unclear_attribution` | «في الأثر», «قال بعض السلف», «يروى», «يقال إن النبي» | the same | only after a colon |

- **A phrase is matched as whole words**, whatever the diacritics, the hamza on an alef, «ى/ي» and
  «ة/ه»; also after «و» or «ف» and a prefix «ك», «ل», «ب» («وقال تعالى», «لقوله تعالى»). In
  «قال ﷺ» the sign stands for any of `PROPHET_HONORIFICS` («قال صلى الله عليه وسلم»). In
  «عن النبي … قال» the gap is at most `MAX_PHRASE_GAP_CHARS` (40) characters of the same sentence
  («عن النبي ﷺ أنه قال»).
- **Between the phrase and the quote**: honorifics (`PROPHET_HONORIFICS`, `DIVINE_HONORIFICS`:
  «ﷺ», «صلى الله عليه وسلم», «عز وجل» …) and at most `MAX_LEAD_CHARS` (60) characters of the same
  sentence («قال رسول الله ﷺ لمعاذ: «…»»), with no other quotation mark. A bracket there is
  stepped over («قال تعالى (البقرة: 153): …»).
- **Where the quote starts.** After the first colon, if there is one: marks there give a marked
  quote, otherwise the text runs unmarked. Without a colon, the first quotation mark within the
  60 characters. Without either, and only for the phrases that are a verb of speech, the text
  right after the phrase and its honorifics. «في الحديث عن الصبر …» is ordinary prose, so the
  phrases that are not a verb of speech need marks or a colon.
- **Where an unmarked quote ends**: before the first sentence end (`. ! ? ؟ …` or a line break),
  quotation mark or `﴿`, opening bracket `( [ {`, reference word (`REFERENCE_WORDS`: «رواه»,
  «أخرجه», «خرجه», «متفق عليه», also after «و» / «ف»), or next attribution phrase. So a cited
  reference is not part of the quote, and `attachReference` still finds it after the span.
- **A round bracket is a quote** only for the Quran phrases, only right after the phrase or its
  colon, and not when it holds a digit or opens with «سورة» or a reference word (it is a
  reference then).
- **Kind.** Text in marks takes the kind of its phrase, also when it is really a verse: the
  matchers search every kind and the status rules report the wrong kind (`KIND_MISMATCH`).
- **Two phrases before one quote** («يُروى عن النبي ﷺ أنه قال: «…»», «قال رسول الله ﷺ: قال الله
  تعالى: «…»», «قال الله تعالى في الحديث القدسي: «…»»): one quote, with the weaker claim.
  `unclear_attribution` wins over both; `hadith` wins over `quran`. A second phrase written with
  «و» or «ف» («… وقال تعالى: «…»») is a new clause: its quote is its own, and the first phrase
  takes nothing from beyond it.

### The span

The quoted words only, trimmed: no marks, no phrase, no honorific; for an unmarked quote also no
comma, dash or colon at either end. `draft.slice(start, end) === text`, always.

- A quote of one word is dropped, except inside `﴿…﴾` (a one-word quote is an exact hit in
  thousands of ayat).
- A mark that is never closed, or `«` inside `«…»`, gives nothing. `"…"` and `(…)` do not run over
  a line break.
- The spans do not overlap and come in draft order: the earlier start wins, then the longer span
  (the merge rule of the orchestrator). A `﴿…﴾` inside a marked hadith quote is therefore part of
  that quote and not an item of its own. An unmarked quote stops before `﴿`, so there the verse is
  its own item.

### Limits

- Without marks the extractor cannot tell narration from quotation: «قال رسول الله كلاماً كثيراً.»
  gives «كلاماً كثيراً» as a hadith quote, and an unmarked quote runs to the sentence end even
  when the writer's own words follow it. The extractor only proposes the span; the matchers and
  the status rules decide what it ends as.
- Without a colon, words between the phrase and an unmarked quote are part of the span
  («قال النبي ﷺ لمعاذ اتق الله»). A colon inside the first 60 characters of an unmarked quote that
  has no colon before it is taken as its start.
- A full stop inside an unmarked quote ends it. A quote in marks that opens more than 60
  characters after the phrase is not read as marked.
- Marks with no phrase before them are never a quote (a book title, a term). Phrases outside the
  list («يقول النبي», «قال الله عز وجل» without «تعالى», «رُوي»), `{…}` and single quotes are not
  read (`docs/BACKLOG.md`).
- An unbracketed «سورة البقرة: 153» after an unmarked verse is inside the span.
- Interpretive claims and personal rulings are not detected: that is the LLM extractor's.

## LLM extractor

Code: `src/core/extract/llm.ts` (the output schema and `validateSpans`, pure), `src/llm/`
(`index.ts`: configuration; `openai.ts`: the adapter; `prompts/extract.ts`: the prompt). Tests:
`src/core/extract/llm.test.ts`, `src/llm/openai.test.ts` (a fake client, no network), and the
mocked port in `src/core/review.test.ts`. Choices: `docs/DECISIONS.md` D-21.

The model reads the draft and returns text; it returns no offset and decides nothing. What it
returns is untrusted input (`AGENTS.md` §2 rule 9).

**The port** (`LlmPort`, declared in `src/core/review.ts`):
`extractQuotes(draft) → Promise<LlmExtraction>` and `explainDiff(input) → Promise<string | null>`
("Explanation" below). A rejected extraction means that no LLM took part; a rejected explanation
means no explanation for that item.

**The output schema** (`LlmExtractionSchema`, zod; the same object is the structured-output schema
sent to the provider and the check `review()` runs on what the port returns):

```ts
{ items: Array<{ quote: string;
                 kind: "quran" | "hadith" | "unclear_attribution" | "interpretive_claim";
                 claimLevel: "C" | "D" | null;
                 citedReference: string | null;
                 attributionPhrase: string | null }>,
  isDraft: boolean }
```

`citedReference` and `attributionPhrase` are kept for the evaluation only. Nothing in the pipeline
reads them: the reference of an item is the one `attachReference` finds. A field outside the
schema (a status, an offset) is not read.

**`validateSpans(draft, items)`** → `{ quotes: ExtractedQuote[], notInDraft }`:

- Each quote is looked up in the draft as literal text; only the whitespace between its words may
  differ. A diacritic, a letter or a completed text is a difference: the quote is not in the draft.
- The offsets are those of the place found, and the span text is `draft.slice(start, end)`.
- A quote returned twice takes the next occurrence. A further copy, when the draft has no further
  occurrence, is dropped and not counted.
- A quote that is not found is dropped and counted in `notInDraft`; the result then carries the
  warning `LLM_SPAN_NOT_IN_DRAFT`.
- A quote of one word (words that hold a letter) is dropped, unless its kind is
  `interpretive_claim`.
- `claimLevel` is kept for an interpretive claim only (`null` there is `"C"`).

**The adapter** (`createOpenAiPort`): the OpenAI Responses API with structured output
(`responses.parse`, the JSON schema made from the zod schema by the SDK's `zodTextFormat`, strict).

| | |
|---|---|
| System prompt | Appendix A1 of the prompt pack, verbatim (`EXTRACT_SYSTEM_PROMPT`, `EXTRACT_PROMPT_VERSION = "1"`), sent as `instructions` |
| Draft | A user message of its own: `<draft>\n…\n</draft>` |
| Temperature | 0. A model that refuses the parameter (HTTP 400 naming `temperature`) is called again without it, and without it from then on |
| Timeout | `LLM_TIMEOUT_MS` (15000) for the extraction as a whole, the retry included: one `AbortSignal`. The explanations of a review have the same budget again ("Explanation") |
| Retry | One, and only after a connection error, 429 or 5xx. Not after a timeout, a 4xx, a refusal or a cut output. The SDK's own retries are off |
| Storage | `store: false` |
| Logging | None |

`createLlmPort(readLlmConfig())` returns the port when `LLM_PROVIDER`, `LLM_MODEL` and
`LLM_API_KEY` are set and an adapter exists for the provider (`openai`); otherwise `undefined`,
and the review runs on the regex extractor. A new provider is one adapter file and one entry of
`PROVIDERS` in `src/llm/index.ts`.

Limits: the automated tests use a fake client. Against the provider the adapter was run by hand
only, on seven short drafts through the running app (2026-10-03, `docs/DECISIONS.md` D-21, "Live
run"); the prompt was not measured on the evaluation cases (P14). A draft that contains the text `</draft>` closes the delimiter early; the draft is not
rewritten for it, and what the model returns is validated whatever it read.

## Explanation

Code: `src/core/explain/index.ts` (`buildExplainInput`, `validateExplanation`, pure),
`src/llm/openai.ts` (`explainDiff`), `src/llm/prompts/explain.ts` (the prompt). Tests:
`src/core/explain/index.test.ts`, `src/llm/openai.test.ts`, and "explanations" in
`src/core/review.test.ts` (a mocked port). Choices: `docs/DECISIONS.md` D-23.

A short generated note on how a quote differs from its source. It is an addition to `reasonAr`,
shown under «شرح مولّد آلياً»; it never changes `status`, `reasonCode`, `reasonAr` or `evidence`.

**When.** For an item whose status is `DIFFERS`, when the LLM extraction of this review succeeded
(the result carries no `LLM_UNAVAILABLE_REGEX_ONLY`). No other status is explained.

**The input** (`ExplainDiffInput`, built by `buildExplainInput` from the item and the entries of
the first occurrence of its evidence):

```ts
{ draftExcerpt: string;          // span.text
  sourceText: string;            // exactText of the occurrence's records, joined by a space
  sourceCitation: string;        // citation.display; several records: «من … إلى …»
  draftCitation: string | null;  // citedReference.raw
  reasonCode: string;
  diffOps: Array<{ op: "replace" | "insert" | "delete"; draft?: string; source?: string }> }
```

`diffOps` are the item's diff ops with the words cut from the draft and from `exactText` through
their ranges; `equal` ops are left out. No layer text, no grade and no other part of the draft is
in the input.

**The adapter.** `responses.create`, plain text. System prompt: Appendix A2 of the prompt pack,
verbatim (`EXPLAIN_SYSTEM_PROMPT`, `EXPLAIN_PROMPT_VERSION = "1"`), sent as `instructions`; the
input as JSON in the user message. `store: false`, no logging, temperature as for the extraction
(0, or none once the model refused it). The output is trimmed; `NULL` or an empty output is
`null`. No retry. Each call has a timeout of `LLM_TIMEOUT_MS`; `review()` starts all calls of a
review in one pass, in parallel, so they end at one deadline. A review can therefore take up to
twice `LLM_TIMEOUT_MS` (extraction, then explanations).

**The validator.** `validateExplanation(text, input, bookTitles)` returns the trimmed note or
`null`. The note is accepted only if all of these hold:

| Check | Rule |
|---|---|
| Length | At most 240 characters (UTF-16 code units), and not empty |
| Quoted segments | Every segment inside `«…»` or `﴿…﴾` (trimmed) is not empty and stands verbatim in `draftExcerpt`, `sourceText`, `sourceCitation` or `draftCitation`. Verbatim means the same characters, diacritics included |
| Other quotation marks | None: an unmatched `«`, `»`, `﴿`, `﴾`, or any of `" “ ” „ ‘ ’` outside a matched segment rejects the note, because words quoted that way cannot be checked |
| Sentences | At most 2. A sentence ends at `.`, `!`, `?`, `؟` or a line break; the quoted segments are taken out first, so a full stop inside one ends nothing |
| Numbers | Every run of digits (Arabic-Indic digits read as ASCII) equals a run of digits of one of the two citations |
| Words | None of «صحيح», «ضعيف», «موضوع», «حكم», «يجب», «يحرم», «فتوى», compared without diacritics, anywhere in a word and inside quoted segments too. `bookTitles` (the names of the covered collections, from `collection.<id>`) are taken out first, as whole words |

A `null`, a failure, a timeout, an answer that is not a string or a note the validator rejects
all end the same way: the item has no `explanation`, the result has no warning for it, and nothing
else changes.

Limits: the validator checks form and grounding, not truth. A note with no quotation, no number
and no listed word passes whatever it says (a model that obeyed an instruction in the quote could
write «النص مطابق» on a `DIFFERS` item); it is shown labeled as generated, beside the deterministic
`reasonAr` and status, which it cannot change. A number written in words is not checked. Not run
against the provider: the prompt was not measured (P14).

## Orchestrator

Code: `src/core/review.ts`, `src/core/extract/` (`index.ts`: "Regex extractor"; `llm.ts`: "LLM
extractor"; `merge.ts`: step 3 below). Tests: `src/core/review.test.ts` (fixture records, a mocked
`LlmPort`), `src/core/extract/*.test.ts`, and `src/server/quran-review.integration.test.ts` (real
corpus).

`review(draft, deps)` returns a `Promise<ReviewResult>`. It does no I/O and reads no clock of its
own: everything comes in through `deps`. The same draft with the same `deps` and the same answer
of the LLM gives the same result, ids included; a result holds no time.

| `deps` | |
|---|---|
| `index`, `aliases`, `corpusVersion`, `coverage` | From `loadCorpus`. `coverage` is what the corpus holds |
| `extractors` | `Extractor[]`, in priority order, all before the LLM. An extractor is a function `draft → ExtractedQuote[]`, each `{ span, claimedKind, claimLevel?, extractedBy }` |
| `llm?` | `LlmPort`. Absent = no LLM takes part: no extraction and no explanation. Its time budget is the adapter's own |
| `now` | The clock. Not read |
| `matchers?` | The matcher registry; defaults to `matchers` of `src/core/matchers`. A test passes its own |
| `limits?` | Defaults to `REVIEW_LIMITS` |

### Steps

The order is that of `AGENTS.md` §6.

1. **Extract.** `deps.llm.extractQuotes(draft)` is started, the extractors read the draft, and the
   LLM's answer is awaited. When no LLM took part (none was passed in, the call failed or timed
   out, or the answer does not fit `LlmExtractionSchema`) the result carries the warning
   `LLM_UNAVAILABLE_REGEX_ONLY`, and only then.
2. **Validate.** An extractor's span is kept only if it lies in the draft and
   `draft.slice(start, end)` is its `text`. The LLM's quotes go through `validateSpans` ("LLM
   extractor"): offsets computed in the draft; a quote the draft does not hold is dropped, with
   the warning `LLM_SPAN_NOT_IN_DRAFT`.
   **Not a draft.** `isDraft: false` counts only when the extractors found no quote either: then
   the result has zero items and the warning `NOT_A_DRAFT`. When they found a quote, everything
   is reviewed as usual: the model's output never removes an item.
3. **Merge** (`mergeQuotes`, `src/core/extract/merge.ts`). In draft order; a place of the draft
   belongs to one item only.
   - *The same item*: identical spans, or an overlap with intersection over union ≥ 0.5
     (`SAME_ITEM_MIN_IOU`). One quote whose `extractedBy` names every extractor. The LLM's span is
     kept, because a regex quote without marks runs to the sentence end. The kind is the weaker
     claim (D-20 item 2: `unclear_attribution`, then any other kind, then `quran`; of two other
     kinds, the earlier extractor's), except that a regex `﴿…﴾` quote stays `quran`.
   - An `interpretive_claim` and a quotation are never the same item. A claim whose span
     overlaps a quotation («يجوز لك أن تفطر لقوله تعالى: ﴿…﴾») is cut to the part outside it,
     before anything else: the longest stretch no quotation covers (the first, of two equally
     long), trimmed of whitespace, marks and punctuation. Both are items. A claim with no letter
     left is dropped. So a claim never removes a quotation.
   - *Any other overlap*: one span is kept. The earlier start wins, then the longer span.

   Then the item limit is applied.
4. **References.** `parseReferences(draft, aliases)` once per draft.
5. **Per item**: `attachReference` → `inVerseMarks` (whether the span stands in `﴿…﴾`: "Hadith
   matcher") → `matchAll` (every registered matcher, whatever the claimed kind) → `decide` → `reasonAr` → `evidenceOf` for the occurrences that are shown. The word diff
   is a pure function of the alignment the matcher made, and `decide` does not read it, so it is
   computed after the decision and only for the evidence that is returned.
6. **Explanations** ("Explanation" above). When the extraction of step 1 succeeded, every
   `DIFFERS` item is explained from the first occurrence of its evidence: `buildExplainInput` →
   `deps.llm.explainDiff` → `validateExplanation`, all items in parallel. An accepted note becomes
   `explanation: { text, generated: true }`; anything else leaves the item as it was. The step
   adds no warning and changes no other field.

`citedReference` is the attached reference as it was read: `{ raw, span, parsed }`, with `parsed`
typed by `ParsedReferenceSchema` (`docs/DECISIONS.md` D-17).

**Item ids** are `item-<start>-<end>`: the position of the span in the draft. Step 3 leaves at most
one item per place, so they are unique.

**What the API passes in**: `regexExtractor` as the one extractor, and as `llm` the port built from
the `LLM_*` variables (`createLlmPort`, built on the first request and kept), or nothing.

**Warnings**, in this order: `LLM_UNAVAILABLE_REGEX_ONLY`, `LLM_SPAN_NOT_IN_DRAFT`, `NOT_A_DRAFT`,
`ITEM_LIMIT_REACHED`. The UI shows each with its sentence `warning.<CODE>` of `src/i18n/ar.ts`.

### Coverage

`ReviewResult.coverage`, and the `{coverage}` of the reason sentences, is
`searchedCoverage(deps.coverage, index, registry)`: the collections of the corpus whose kind has a
registered matcher. It is derived from `index.layers` and the registry and names no kind. The
corpus holds `quran`, `bukhari` and `muslim` and both matchers are registered, so the coverage is
`["quran", "bukhari", "muslim"]`: a quote that ends `NOT_FOUND` is told «لم نجد هذا النص في
المصادر المغطاة (القرآن الكريم، صحيح البخاري، صحيح مسلم)». A corpus file whose kind had no matcher
would be left out, because nothing would look in it.

### Bounds

`REVIEW_LIMITS = { MAX_EVIDENCE_PER_ITEM: 5, MAX_ITEMS_PER_DRAFT: 40 }`.

- **Evidence.** At most 5 occurrences per item, in the order of the decision. An occurrence that
  runs over several records shows all of them, so the number of evidence entries can be higher.
  `reasonAr` is built from the whole decision: «… (وفي n من المواضع الأخرى)» counts the occurrences
  that are not shown too. «الله» alone is in more than 2000 ayat and returns 5.
- **Items.** At most 40 per draft, the first in draft order. A draft with more carries the warning
  `ITEM_LIMIT_REACHED`, so that a cut result never looks complete.

### Errors

An exception while one item is reviewed (step 5) gives that item `status: "ERROR"`,
`reasonCode: "INTERNAL_ERROR"`, the sentence `item.error.INTERNAL_ERROR` of `src/i18n/ar.ts`,
`contentLevel: "A"`, no evidence and no cited reference; the other items are not affected.
`ReviewItemSchema` rejects an `ERROR` item that carries evidence or an explanation. An exception
outside step 5 (an extractor, the reference parser) is thrown to the caller: the API answers 500.

`summary` counts every status, zeros included.

## API v1

Code: `src/server/api-handlers.ts` (the handlers, as functions of a Web `Request`),
`src/server/api-config.ts`, `src/server/rate-limit.ts`, and the two route files
`src/app/api/v1/review/route.ts` and `src/app/api/v1/health/route.ts`, which only wire the handlers
(Node runtime). Tests: `src/server/api-handlers.test.ts`. The contract (schemas, limits, error
codes, one example from a real run) is `docs/API.md`, generated by `npm run docs:api` from the zod
schemas; `scripts/lib/api-doc.test.ts` fails when the file is out of date.

### POST /api/v1/review

In this order; the first that applies answers.

| Step | Outcome |
|---|---|
| Origin not allowed | 403 `ORIGIN_NOT_ALLOWED` |
| Rate limit exceeded | 429 `RATE_LIMITED`, with `Retry-After` |
| Body larger than `MAX_DRAFT_CHARS × 6 + 1024` bytes (it is not read to its end) | 413 `DRAFT_TOO_LONG` |
| Body not JSON, or not exactly `{ text: string }` | 400 `INVALID_REQUEST` |
| `text` empty or whitespace | 400 `EMPTY_DRAFT` |
| `text.length > MAX_DRAFT_CHARS` | 413 `DRAFT_TOO_LONG` |
| The corpus does not load, `review` throws, or the result fails `ReviewResultSchema` | 500 `INTERNAL_ERROR` |
| Otherwise | 200, the validated `ReviewResult` |

An error body is `{ apiVersion, error: { code, message } }` (`ApiErrorSchema`), with a fixed Arabic
sentence from `src/i18n/ar.ts` (`api.error.<CODE>`). It never has `items`, so a failure cannot be
taken for a result, and a result is never sent in part. Every response has `Cache-Control: no-store`.

**What leaves the API.** `evidence[].record` is an `ApiSourceRecord`: a `SourceRecord` without
`searchText`, `searchVariants` and `matnText`. `toApiRecord` (an allowlist of fields, in
`src/core/types.ts`) is applied in `evidenceOf`, the one place evidence is made, and
`ApiSourceRecordSchema` is strict, so a record that still carried one of them would fail the
validation above and be answered with 500. `grade` is copied only when the record has one.

**Settings** (`.env.example`), read on each request; a missing or malformed value falls back to
the default: `MAX_DRAFT_CHARS` (12000, UTF-16 code units), `RATE_LIMIT_PER_MIN` (10),
`CORS_ALLOWLIST` (empty). The LLM: `LLM_PROVIDER` (`openai`), `LLM_MODEL`, `LLM_API_KEY`,
`LLM_TIMEOUT_MS` (15000), read once, on the first request ("LLM extractor").

**Rate limit.** A token bucket per client in memory: `RATE_LIMIT_PER_MIN` tokens, refilled evenly
over a minute. The client is the first address of `X-Forwarded-For` (else `X-Real-IP`). Limits:
`docs/DECISIONS.md` D-17.

**CORS.** No `Origin` header, or the API's own origin: served, no CORS header. An origin listed in
`CORS_ALLOWLIST`: served with `Access-Control-Allow-Origin: <that origin>`; its preflight gets 204.
Any other origin: 403 and no CORS header. `*` is not accepted in the list. This is the hook for
the browser extension: its origin is added to the list, nothing else changes.

**Logging.** One JSON line per request: `requestId`, `httpStatus`, `outcome`, `chars`, `loadMs`,
`reviewMs`, `totalMs`, `items`, `summary`, `warnings`, and for a 500 a fixed `failure` word with
the class of the error (or, for a corpus that did not load, the loader's message, which names
files only). `LogEntry` has no field for the draft, a quote, a header or an address. A log sink
that throws does not change the answer.

### GET /api/v1/health

`{ ok, corpusVersion, coverage, llmConfigured }`. `coverage` is the searched coverage, as in a
result. `llmConfigured` is true when `LLM_PROVIDER`, `LLM_MODEL` and `LLM_API_KEY` are all set; it
does not say that an LLM is used. When the corpus does not load: 503 with `ok: false`,
`corpusVersion: null`, `coverage: []`. The first call loads the corpus (about 0.8 s). Whether an
LLM took part in a review is read from the result: it did unless the warning
`LLM_UNAVAILABLE_REGEX_ONLY` is there.

### Deployment

`loadCorpus` reads `data/corpus` and `data/aliases` from `process.cwd()` with paths taken from the
manifest, which the build cannot trace. `next.config.ts` lists `data/corpus/*.json` and
`data/aliases/*.json` in `outputFileTracingIncludes` for both routes.

## UI

Code: `src/app` (pages), `src/components` (components), `src/components/lib` (pure functions, no
React). Strings: `src/i18n/ar.ts` only. Tests: `src/components/lib/*.test.ts` and
`src/components/ui.test.ts` (components rendered to static markup). Choices: `docs/DECISIONS.md`
D-19.

The UI is a client of API v1 and of nothing else. It imports the schemas and types of
`src/core/types.ts` and never `src/server`, the corpus or a matcher.

| Route | |
|---|---|
| `/` | `ReviewApp`: scope note and sources line from `GET /api/v1/health`, the draft form, the states, the result |
| `/privacy` | What `docs/PRIVACY.md` says, in Arabic |
| `/sources` | `SourcesRegister`: the sources of `docs/SOURCES.md` whose collections are in the API's coverage |
| `/how-it-works` | The steps, the statuses, what the tool does not do |

The layout (`src/app/layout.tsx`) carries the banner «أداة مدعومة بالذكاء الاصطناعي، وليست بديلاً
عن المختص.», a skip link and the footer on every page.

| `src/components/lib` | |
|---|---|
| `api-client.ts` | `requestReview`, `fetchHealth`: fetch, then validation against the zod schemas. A result comes only from a 200 that parses |
| `segments.ts` | From diff ops (ranges) to the pieces of a text: `draftSegments`, `sourceSegments`, `alignedSourceSegments`, and `draftPieces` for the highlighted draft |
| `occurrences.ts` | `groupOccurrences` (evidence → places), `occurrenceCitation`, `occurrenceText`, `sourceCopyText` |
| `report.ts` | `reportText(result, date)`: the result as plain text for «انسخ التقرير» |
| `labels.ts` | Names for ids from the API (`collection.<id>`, `kind.<id>`, `warning.<CODE>`), and the summary row |
| `kind-ui.ts` | Per kind: the marks around its source text and its font. The only place the UI names a kind |

States of the home screen (`Phase` in `ReviewApp.tsx`): `idle` (the empty state), `loading`
(skeleton), `error` (the API's `error.message`, or a fixed sentence when there is no API answer),
`done` (a result; with no item, the "no quotes found" state). A `role="status"` line announces the
loading and the summary; after a result the focus moves to its heading.

A card (`ReviewCard`): the status pill (label + icon), the quote as written with the diff marks,
the dashed trace line, the source block (`ScriptureBlock`: `exactText` only, the citation, a grade
only when the record has one with its `by`, the source link when the record has a `sourceUrl`),
`reasonAr`, «قارن النصين», «انسخ نص المصدر مع المرجع», and `ExplanationBox` under «شرح مولّد آلياً»
when an item carries an explanation (a `DIFFERS` item only: "Explanation"). An `ERROR` item shows
its `reasonAr` and nothing from a source.

**«انسخ التقرير»** (`CopyReportButton`, in the results header when the result has items) copies
`reportText(result, new Date())`: plain text, one field per line, each line opening with its
Arabic label so that it reads right-to-left where it is pasted. Blocks are separated by an empty
line.

- Header: the title, the date (`YYYY-MM-DD` on the reader's clock at the click; a result holds no
  time), `corpusVersion`, the coverage names, and one line per warning with its sentence.
- One block per item: «النقل n», the status label, the quote, the cited reference when the draft
  has one, then for the first occurrence the source text (as `sourceCopyText` gives it), its
  citation and `record.sourceName`, then `reasonAr`. An item without evidence has no source
  lines; an `ERROR` item has status, quote and reason only, whatever it holds.
- The fixed footer `report.footer`.

The report holds no generated explanation and no grade. Both copy buttons are one component
(`CopyButton`): the same status line says whether the copy worked.

Status styling is driven by data: an element carries `data-status`, and `globals.css` sets the
color, the text color and the underline style from it. The icon registry in `StatusPill.tsx` is
typed over `Status`, so a new status does not compile without an icon.
