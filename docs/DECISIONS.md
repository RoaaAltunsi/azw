# Decisions for human review

Conservative choices made where the instructions did not settle a religious-content question
(AGENTS.md §9). Each stays open until the owner confirms or reverses it.

## D-1 — Bukhari split entries cite the integer number (2026-10-02)

The source has 26 entries numbered like `402.2`, `1390.3`. Showing «حديث رقم 402.2» would present a
number that no printed edition uses. `citation.number` is therefore the integer part (`402`), the
full source value is kept in `citation.subNumber`, and the id stays `bukhari:402.2`. These records
are excluded from a collection-level approval.

## D-2 — No grade without a citation number (2026-10-02)

AGENTS.md §6 gives every Sahihayn record the grade «صحيح» attributed to its collection. For the 148
Muslim records with no `arabicnumber` the grade is withheld: there is no reference to attribute it
to, and three of them belong to Muslim's introduction, which is not under the Sahih's condition.
They stay pending and cannot be approved until a citation number exists.

## D-3 — Records excluded from a collection-level approval (2026-10-02)

Approving a whole collection in `data/review/reviewed.json` does not mark these as reviewed; each
needs its own approval: records with damaged text (U+FFFD/U+FFFC), Bukhari split entries, and
records whose text block the source repeats under several numbers (the block cannot be tied to a
single hadith number). Records without a citation number can never be marked reviewed.

## D-4 — `matnText` is quoted speech only (2026-10-02)

`matnText` is stored only when the source text holds exactly one quoted segment, introduced by an
explicit attribution of speech to the Prophet ﷺ and followed by nothing. Narratives, multiple quotes
and unterminated quotes get no `matnText`. The value is copied verbatim from `exactText`.

## D-5 — `bukhari:2819` held: Dorar grades it «[معلق]», our record says «صحيح» (2026-10-02)

Found in the review of P0.1. The Dorar spot-check confirmed `bukhari:2819` by number and matn, but
Dorar's grade line for that entry is «[معلق]», not «[صحيح]» (`data/review/dorar-verification.json`,
`dorarGrade`). Our text opens «وَقَالَ اللَّيْثُ حَدَّثَنِي …», and the record carries the collection
grade «صحيح» by «صحيح البخاري» under the Sahihayn policy (AGENTS.md §6). The first run of the
spot-check stored the grade line but did not report it; the script now lists such cases.

What was done (conservative, AGENTS.md §9): the record is in `data/review/held-records.json`, so it
is pending and cannot produce MATCH. Its text and its grade field are unchanged — the tool does not
grade, and removing or changing a grade is not its decision either.

Open for the owner (needs a qualified reviewer, not a script):

1. Whether the collection grade may be shown for this record at all.
2. The wider question: the Sahihayn policy gives «صحيح» to every numbered record, including any
   whose chain al-Bukhari did not connect. The data has no field that marks them. As a scale
   indicator only — **not** a classification — 199 Bukhari and 28 Muslim records open with
   «قال» / «وقال» (188 and 27 of them are reviewed after this hold); many of those are ordinary connected
   narrations (e.g. `bukhari:4` continues the previous chain). Only `bukhari:2819` has evidence
   against it, and only because it happened to be in the 30-record sample.
3. Whether a grade may be displayed for pending records in any status other than MATCH.

## D-6 — Evaluation labels that rest on an open or conservative choice (2026-10-02)

Made while writing `eval/cases` (details in `docs/EVALUATION.md` section 6). None is confirmed by a
person yet.

1. `T-007` (Uthmani-script paste) and `H-008` («رحمة» for the mushaf's «رحمت») are labeled `MATCH`.
   The task requires orthographic variants to be `MATCH`, but how to bridge mushaf spellings is still
   open (`docs/SOURCES.md` §5 item 3). If the owner decides not to bridge one of them, its label
   must change with that decision.
2. A vague attribution («في الأثر», «قال بعض السلف») is labeled `NEEDS_SPECIALIST` even when the
   saying is not in the corpus, not `NOT_FOUND`.
3. A hadith the draft cites to a book outside the covered sources (al-Tirmidhi) is labeled
   `NOT_FOUND`. The label says nothing about the hadith; the displayed wording must not either.
4. `T-013`, `H-018` and `H-019` label a collection reference as wrong because the other collection's
   records do not contain the wording. The corpus has gaps, so each needs a specialist's confirmation
   that the hadith is indeed absent from the other book. An AI source check on 2026-10-02 found no
   result for them in the other book on dorar.net (`docs/EVALUATION.md` section 7); that supports
   the labels but is not the specialist's confirmation.
5. Four reason codes are provisional names: `MATCH_REF_OK`, `UNCLEAR_ATTRIBUTION`,
   `INTERPRETIVE_CLAIM`, `PERSONAL_RULING`.

## D-7 — Honorific phrases are not removed from Quran search text (2026-10-03)

The normalization task removes «رضي الله عنه / عنها / عنهما / عنهم» at level "search". The phrase
«رضي الله عنهم» is part of four ayat (5:119, 9:100, 58:22, 98:8). Removing it there would make a
quotation with an altered pronoun («رضي الله عنهما ورضوا عنه») equal to the ayah's search text.
Conservative choice: Quran `searchText` is built with `keepHonorificPhrases: true`, and a draft span
compared with a Quran record must be normalized the same way (P2). Hadith records follow the task as
written; the same words inside a matn are removed on both sides, so `searchText` equality alone must
not decide MATCH.

## D-8 — Normalization bridges «الملإ» / «نبإ» but adds nothing for the open spelling decision (2026-10-03)

`docs/SOURCES.md` §5 item 3 stays open. The task's rule «أ إ آ ٱ → ا» makes «الملأ» equal to the
source's «الملإ» (and «نبأ» to «نبإ») as a side effect. The other mushaf spellings (رحمت، امرأت، رءوف،
مسئولا، داوود، مائة) and Uthmani-script words that write an alef as U+0670 (العٰلمين) are not bridged;
no folding rule, variant list or second text was added. Table in `docs/ARCHITECTURE.md`.

Three readings of the task that the owner may want to reverse:

1. Punctuation and ﷺ become a word separator instead of being deleted, so «قال:«إنما» stays two words.
2. Level "strict" also removes the superscript alef (U+0670), which the task did not list.
3. Invisible direction marks and zero-width characters are handled although the task did not list
   them (the hadith source is full of U+200F).

## D-9 — Quran spelling: ayah-bound variant list plus a second search text (2026-10-03)

Closes `docs/SOURCES.md` §5 item 3. Decided by the owner on `docs/QURAN_SPELLING_REVIEW.md`.

1. **Everyday spellings** («رحمة» for «رحمت», «رؤوف» for «رءوف», «مئة» for «مائة» …) are bridged by a
   reviewed list, `data/aliases/quran-spelling-variants.json`. No folding rule was added to
   normalization: a rule applies to every word of the Quran and could make a wrong word equal to the
   right one. Each pair is bound to its ayat for the same reason — «لعنت» is a noun in 3:61 and a
   verb in 7:38.
2. **Rejected pairs** stay unbridged: «داود», «إذن» for «إِذًا», and «يستهزؤون»-type forms. A draft
   that uses them differs from the source in that word.
3. **Uthmani-script pastes** are bridged by a second search text per ayah, for search only:
   Quranpedia mushaf 2 (Hafs, Uthmani script, King Fahd Complex), stored as
   `searchVariants: [{ label: "uthmani", text }]` on each Quran record. The owner approved it on the
   condition that it agrees with the package's approved sources; the package's Quran row names the
   King Fahd Complex edition and quranpedia.net (`docs/SOURCES.md` 1.1).
   - The variant is built with one extra option, `foldHamzaAlef` («ءا» → «ا»), because Uthmani texts
     spell «الآخرة» in two ways. This is a folding rule, limited to the variant; the main
     `searchText` has none. The owner may want to reverse it: without it 271 more ayat of the
     Tanzil text are not found as exact.
   - A second option, `superscriptAlefAsAlef`, keeps the Uthmani superscript alef as the letter «ا»
     in the variant. It was added in review on 2026-10-03: without it the variant read «الكتب» for
     «ٱلۡكِتَٰبُ» and «ملك» for «مَٰلِكِ», so an everyday-script draft with a dropped alef («ذلك الكتب لا
     ريب فيه») equalled the variant and could have ended `MATCH`. Pinned by tests.
   - **Decided by the owner on 2026-10-03:** a spelling error must not end `MATCH`. A draft that
     writes «الرحمان», «هاذا» or «ذالك» equals the variant, but it is everyday script with a
     non-standard spelling. The matcher may give `MATCH` through the variant only when the span is
     actually written in Uthmani script, i.e. it carries Uthmani signs (ٱ, the superscript alef,
     Quranic marks). Otherwise the span is compared with `searchText` only, and a difference there
     is `DIFFERS`.
   - The source calls the file «غير موافق للمطبوع». It is never displayed, so a difference from
     the printed mushaf can cause a missed or a wrong retrieval, not a wrong displayed text. The
     status must still be decided against `exactText`.
4. Whoever builds the Quran matcher must treat a variant or second-text match as a spelling
   difference only: `exactText` is still what is displayed and diffed.

Effect on `D-6` item 1: `H-008` («رحمة», 7:56) can stay `MATCH` once the matcher uses the list.
`T-007` (Uthmani paste) can stay `MATCH` once the matcher uses the "uthmani" search variant: its
quote, normalized with `UTHMANI_VARIANT_OPTIONS`, equals the variant of `quran:103:2` (pinned in
`src/core/normalize/index.test.ts`).

## D-10 — Corpus index: choices the prompt did not settle (2026-10-03)

Made while building the search layer (`docs/ARCHITECTURE.md`, "Corpus index"). For the owner's review.

1. **A layer is addressed by collection and name**, not by name alone. The prompt's
   `candidates(normQuery, layer)` reads as one lookup over every collection that has the layer, but
   Quran "default" is normalized with `keepHonorificPhrases` and hadith "default" without it (D-7).
   One normalized query for both would compare a text with a query normalized differently, which the
   prompt forbids. The caller loops over `index.layers` and normalizes per layer.
2. **The "everyday" layer covers every ayah.** Ayat the list does not name keep their `searchText`,
   so that a quote running over a listed and an unlisted ayah is still one hit. A hit on "everyday"
   therefore proves a spelling bridge only when "default" has no hit for the same quote. In a listed
   ayah every listed word is replaced; the mushaf spelling is found on "default" only.
3. **The Quran adapter refuses a spelling list that is out of step with the records** (an ayah or
   a word that is not there) instead of skipping the pair. A silent skip would turn a reviewed
   bridge into a missed quote with no sign of it.
4. **Bigram containment counts distinct bigrams, per record.** A bigram repeated in the query counts
   once. Bigrams do not cross ayah boundaries, so a multi-ayah quote has no single candidate with
   score 1; the matcher must combine neighbours.
5. **Kind labels**: «آية قرآنية» and «حديث نبوي» (`src/i18n/ar.ts`). Editorial wording; the owner
   may change it.
6. **`citationFormatter` returns `citation.display` unchanged** for both kinds. The display string is
   written by the corpus build from the source data and already omits a missing number. Composing a
   citation at runtime from `citation.number` would add a second place where a number could be
   invented. Formatting an ayah range («الآيتان 153–154») is not built; it needs the matcher's range.
7. **`src/core/corpus/kind-meta.ts` imports `src/i18n/ar.ts`.** The prompt wants the label text to
   come from the i18n file. `src/i18n` is pure TypeScript with no dependency, so core stays pure;
   the boundary test now lists it as an allowed import.
8. **A hit carries the records as well as their ids**, so that the caller reads `reviewStatus`
   without a second lookup.
9. **Loader details.** The root defaults to `process.cwd()` and the cache is per root. The adapter
   for a corpus file is chosen by its `kind` from a table in the loader; a kind without an entry
   stops the load. The manifest schema checks only the fields the runtime uses.
10. **One record schema.** `scripts/lib/schema.ts` held a second copy of `SourceRecordSchema`. It
    now re-exports the one in `src/core/types.ts` (same rules), together with the corpus-file and
    spelling-list schemas moved to `src/core/corpus/schema.ts`. `npm run verify:corpus` passes
    against the unchanged corpus.

## D-11 — A reference that was not read in full: NEEDS_SPECIALIST / REF_NOT_CHECKED (2026-10-03)

**Decided** while writing the status rules (`docs/ARCHITECTURE.md`, "Status rules", rule 4). The
owner left the choice to the build and asked for it to be recorded as decided.

The case: the quote occurs word for word in a reviewed record, and the draft cites a reference the
parser returned as `unknown` («[2:153]», «(الآية 153 من البقرة)») or `partial` («(البقرة: 153، 155)»).
Such a reference may be right or wrong; the tool has not compared it. It can never give
`MATCH_REF_OK`.

Options weighed:

| Option | For | Against |
|---|---|---|
| `MATCH` / `MATCH_NO_REFERENCE` | The text does match | The sentence would say no reference was given, which is untrue. §4 allows `MATCH` only when the "cited reference (if any) is correct" |
| `MATCH` / a new code (reference not checked) | The label «مطابق لنص المصدر» is true of the text; no false alarm on a correct citation in an unread form | Same §4 rule: a reference is cited and was not found correct. A wrong reference in an unread form would sit under the match badge, and wrong references are a critical category of the evaluation. §2 rule 3: no unsupported positive result |
| `DIFFERS` | — | Nothing was shown to differ. A reference that was not read is never reported as a wrong one (`attachReference` follows the same principle) |
| `NOT_FOUND` | — | The record was found |
| **`NEEDS_SPECIALIST` / `REF_NOT_CHECKED`** (chosen) | §1: the tool refers "whenever the evidence is not enough". The evidence for the reference is missing. §9: the more conservative status. The sentence says the text matches, names the source reference, and asks the writer to compare | A correct citation in an unread form is flagged although nothing is wrong, and the label «يحتاج مراجعة مختص» overstates it: the writer can compare two references without a specialist |

The tune cases do not separate the options: every reference in `tune.jsonl` is read in full.

Two limits of the choice:

1. A `partial` Quran reference still carries its surah. When that surah is not the surah of the
   text, the result is `DIFFERS` / `REF_MISMATCH_SURAH`: what was read is wrong, whatever the unread
   part says. Only a partial reference whose surah agrees is `REF_NOT_CHECKED`.
2. A reference of another kind attached to a quote (a hadith citation on a text claimed and found
   as a verse) is also `REF_NOT_CHECKED`.

The cost falls with every citation form the parser learns (`docs/BACKLOG.md`, P3: surah by number,
lists of ayat). If the owner prefers the second option, the change is one line in `decide()` and
one sentence.

## D-12 — Quran matcher, word diff and status rules: choices the prompt did not settle (2026-10-03)

For the owner's review. Items 1–3 touch what the user is told about a Quran text.

1. **Closed by D-13.** As first built, one Uthmani sign anywhere made a span "Uthmani script", and
   the pause marks and superscript alef of our own `exactText` counted as such signs, so
   «بِسْمِ اللَّهِ الرَّحْمَانِ الرَّحِيمِ ۚ» ended `MATCH`.
2. **A cited ayah range must equal the range the quote covers.** A quote of ayat 153–154 cited as
   «[البقرة: 153]», or one ayah cited with a range around it, is `DIFFERS` / `REF_MISMATCH_AYAH`.
   The conservative reading of "consistent with ayahRange"; the sentence names the range of the
   source. A reference that names the surah only is consistent when the surah is right.
3. **`DIFFERS` is not given on pending records either.** The prompt forbids `MATCH` on a pending
   record. Telling a writer that the wording differs from a text nobody reviewed is no better
   supported, so rules 2–7 and 11 all end `NEEDS_SPECIALIST` / `SOURCE_NOT_REVIEWED` when no
   reviewed candidate remains. The middle band keeps `LOW_CONFIDENCE_MATCH`.
4. **New reason codes**: `REF_NOT_CHECKED` (D-11), `LOW_CONFIDENCE_MATCH` (middle band),
   `AMBIGUOUS_CANDIDATES`, `SOURCE_NOT_REVIEWED` (named by the prompt). `docs/EVALUATION.md`
   section 4 lists them. The four provisional names of D-6 item 5 are kept as they are.
5. **Level D comes from `claimLevel`, not from a new `claimedKind`.** AGENTS.md §6 names
   `unclear_attribution` and `interpretive_claim` only, and the evaluation cases mark a personal
   ruling as kind `interpretive_claim` with `contentLevel: "D"`. `decide()` takes the same shape:
   `claimLevel: "D"` on an interpretive claim gives `PERSONAL_RULING`, level D. The extractor (P10)
   must set it. (A first version used a third claimed kind, `personal_ruling`; removed.)
6. **`unclear_attribution` is level A.** The question is whether a text is in a source, which is
   level A content; no interpretation or ruling is involved. Claims carry no evidence, even when
   the same words are found in a source: the tool cannot tell what is attributed to whom.
7. **No reason code of its own for a spelling match.** `docs/ARCHITECTURE.md` suggested one; the
   prompt and the tune cases (`T-007`) expect `MATCH_REF_OK`. The route is on the candidate
   (`layer`, `spelling: "bridged"`).
8. **Kind is compared for exact hits only.** A close, non-exact candidate of another kind is
   `WORDING_DIFF`, not `KIND_MISMATCH`.
9. **Diff keys come from the layer the candidate was found on**, ranges from `exactText`. The
   prompt says to diff against `exactText`, never a search layer. Compared by the `default` words
   alone, an approved «رحمة» and every Uthmani-script word would show as a difference inside a
   `MATCH`. No layer text is ever in an op or shown.
10. **Reason sentences are editorial wording** (`src/i18n/ar.ts`), including «من … إلى …» for a
    range and «(وفي n من المواضع الأخرى)». The prompt's example for `REF_MISMATCH_AYAH` ended
    «المرجع الصحيح: {ref}»; the same prompt forbids «صحيح» in reason sentences, so it reads
    «المرجع في المصدر: {ref}».
11. **Fuzzy search sizes**: 5 index candidates per layer, at most 5 results; alignment scoring
    +2 / −1 / −1. Not tuned.

## D-13 — A spelling error never ends MATCH: the Uthmani rule, word by word (2026-10-03)

**Decided by the owner** on the review of P5: "we cannot consider a spelling error as match".
It sharpens D-9 item 3 and replaces D-12 item 1. Rule and measurements: `docs/ARCHITECTURE.md`,
"Quran matcher".

What changed, and why each part was needed:

1. **What counts as an Uthmani sign is narrower.** D-9 listed ٱ, the superscript alef and the
   Quranic marks U+06D6–U+06ED. The everyday-script source text itself carries the superscript alef
   (3,215 times) and the pause marks, so text copied from it passed as "Uthmani script". The signs
   are now ٱ (U+0671), U+0656–U+065F and U+06DF–U+06ED without ۩: none of them occurs in any Quran
   record (tested). AGENTS.md §5 was edited to say so.
2. **A word with a superscript alef is Uthmani script by itself.** 92 ayat of mushaf 2 have
   none of the signs of item 1; without this, the ones that differ from the main text only where
   they carry the mark («رَبِّ مُوسَىٰ وَهَٰرُونَ») would be refused. The mark cannot
   be typed, so a word that carries it was copied from a mushaf text.
3. **No word may spell out a superscript alef**, even inside a span that is in Uthmani script
   («بِسۡمِ ٱللَّهِ ٱلرَّحۡمَانِ ٱلرَّحِيمِ» is `DIFFERS`). The corpus stores the variant with the
   mark already written as «ا», so where the mushaf has the mark is inferred from the main text,
   letter by letter. It is an inference, not a lookup.

Limits the owner should know:

- **A plain alef that the everyday text writes too is accepted** in a span that is in Uthmani
  script, also where the mushaf writes it above the line: «ءَايَات» for «ءَايَٰت», «يَاأَيُّهَا»
  for «يَٰٓأَيُّهَا». The word is then the mushaf's letters with the everyday alef. It can only
  arise in text that already carries Uthmani signs.
- **32 genuine mushaf pastes are refused** (two wordings, «فَبِأَيِّ ءَالَآءِ رَبِّكُمَا
  تُكَذِّبَانِ» and 53:55): no sign, no superscript alef, and «ءالاء» differs from «آلاء». They
  end `DIFFERS`. Accepting «ءا» as proof of Uthmani script would also accept it typed in everyday
  script; that is the owner's call.
- **An exact check needs the data to say where the mushaf has the mark.** A second search variant
  that keeps U+0670 as its own character would make rule 3 a plain comparison. It means rebuilding
  `data/corpus` (new `corpusVersion`), which was not done here: corpus changes need the owner's
  approval. Recorded in `docs/BACKLOG.md`.

Other fixes made in the same pass, each closing a way to a wrong result:

- **A reference followed by a number it did not read is `partial`** («سورة البقرة (152)»,
  «الآية 3 والآية 4», «ح 2699»), and so is «رواه البخاري تعليقاً». Before, «سورة البقرة (152)» on
  the text of ayah 153 ended `MATCH_REF_OK`. Now it is `REF_NOT_CHECKED` (D-11). This changed
  `src/core/references`.
- **Exact occurrences are collected over all layers, per place.** Before, `everyday` was skipped
  when `default` had any hit, so «نعمة الله» cited as [إبراهيم: 34] (which the mushaf writes
  «نعمت») was compared only with the ayat that write «نعمة» and ended `REF_MISMATCH`.
- **Ayah numbers typed between the ayat of a quote are left out of the quote's words.** Before, they
  made a correct multi-ayah quote `WORDING_DIFF`.
