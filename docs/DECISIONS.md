# Decision log

Choices made where the instructions did not settle a question about religious content or about how
the sources are handled (AGENTS.md §9).

**Every entry below is closed.** On 2026-10-03 the owner delegated these decisions to the AI
assistant, on the condition that each one is researched in the sources the scientific package
approves and recorded with its evidence (D-16). The entries D-1 to D-13 were closed in one review
on that date; each carries a "Closed" paragraph with the decision and what it rests on. The owner
can reverse any of them; nothing here waits for an answer.

What "closed" does not mean: no entry grades a hadith, interprets a verse or issues a ruling. The
decisions are about which text the tool shows, which reference it cites, and when it abstains.
They were made by an AI assistant from published sources, not by a qualified scholar.

Sources consulted in the review of 2026-10-03 (named in «المرجعية والحزمة العلمية», or classical
works of the discipline):

| Source | Used for |
|---|---|
| shamela.ws — «صحيح البخاري، ط السلطانية» (book 1681) | `bukhari:2075`, `bukhari:2819` (D-5, D-14) |
| shamela.ws — «صحيح مسلم، ط التركية» (book 711) and «ت عبد الباقي» (book 1727) | The five held Muslim records (D-14) |
| dorar.net — الموسوعة الحديثية (API and «أصول الحديث») | Grade line of `bukhari:2819`; the three single-collection claims (D-6) |
| ابن الصلاح، «معرفة أنواع علوم الحديث» (المقدمة)، النوع الأول، الفائدة السادسة — read on ar.wikisource.org | Suspended reports in the Sahihayn (D-5) |
| السيوطي، «الإتقان في علوم القرآن»، النوع السابع عشر — shamela.ws book 11728, pages 171–194 | Alternate surah names (D-15) |
| Quranpedia mushaf 1 and mushaf 2 (the corpus sources) and the Tanzil "simple" text (api.alquran.cloud) | Quran text integrity (D-15), Uthmani signs (D-13) |

## D-1 — Bukhari split entries cite the integer number (2026-10-02)

The source has 26 entries numbered like `402.2`, `1390.3`. Showing «حديث رقم 402.2» would present a
number that no printed edition uses. `citation.number` is therefore the integer part (`402`), the
full source value is kept in `citation.subNumber`, and the id stays `bukhari:402.2`. These records
are excluded from a collection-level approval.

**Closed 2026-10-03 — confirmed.** The citation number stays the integer part. Checked on
shamela.ws «ط السلطانية»: the edition numbers hadith with whole numbers only (e.g. `2075 -`,
`2819 -`); a decimal is an artefact of the digital source, which split one numbered entry in two.
The 26 split records stay pending: each holds part of the text of its number, so a quote found
there cannot be shown as "the text of hadith 402". A quote found only in one of them ends
`NEEDS_SPECIALIST` / `SOURCE_NOT_REVIEWED`.

## D-2 — No grade without a citation number (2026-10-02)

AGENTS.md §6 gives every Sahihayn record the grade «صحيح» attributed to its collection. For the 148
Muslim records with no `arabicnumber` the grade is withheld: there is no reference to attribute it
to, and three of them belong to Muslim's introduction, which is not under the Sahih's condition.
They stay pending and cannot be approved until a citation number exists.

**Closed 2026-10-03 — confirmed and widened.** The rule is now: **a hadith record carries the
collection grade only when it is reviewed.** A pending record has no `grade` field at all
(`scripts/build-corpus.ts`; checked by `scripts/verify-corpus.ts`). Basis: the package's rule
«لا ينسب حديث دون مصدر وحكم معتمد في البيانات» — a grade stated of a text nobody approved, or of a
text with no reference, is not an approved grade. The 148 records without a number stay pending and
can never be approved. Muslim's introduction is outside the Sahih proper; Ibn al-Salah's statement
of what the two authors judged sound covers «ما أسنده البخاري ومسلم في كتابيهما بالإسناد المتصل».

## D-3 — Records excluded from a collection-level approval (2026-10-02)

Approving a whole collection in `data/review/reviewed.json` does not mark these as reviewed; each
needs its own approval: records with damaged text (U+FFFD/U+FFFC), Bukhari split entries, and
records whose text block the source repeats under several numbers (the block cannot be tied to a
single hadith number). Records without a citation number can never be marked reviewed.

**Closed 2026-10-03 — confirmed.** These classes stay pending for the whole MVP; no per-record
approval is planned. A fifth class was added by D-5: records whose text does not open with a
formula of direct transmission. Counts after the rebuild (corpus `p2-e2bfaf5a3ad2`): Bukhari 6701
reviewed / 879 pending, Muslim 7145 / 215. The cost is abstention, never a wrong positive: a quote
found only in a pending record ends `NEEDS_SPECIALIST` / `SOURCE_NOT_REVIEWED`. Many of these
texts are also in a reviewed record (repeated narrations); how many quotes are affected was not
measured.

## D-4 — `matnText` is quoted speech only (2026-10-02)

`matnText` is stored only when the source text holds exactly one quoted segment, introduced by an
explicit attribution of speech to the Prophet ﷺ and followed by nothing. Narratives, multiple quotes
and unterminated quotes get no `matnText`. The value is copied verbatim from `exactText`.

**Closed 2026-10-03 — confirmed.** `matnText` is a search aid only. It is never displayed in place
of `exactText`, never decides a status, and is always a verbatim substring of `exactText`
(checked by `scripts/verify-corpus.ts`). A wrong boundary can only cost a retrieval, so the
narrow rule (one quoted segment, explicit attribution) is kept.

## D-5 — `bukhari:2819` held: Dorar grades it «[معلق]», our record says «صحيح» (2026-10-02)

Found in the review of P0.1. The Dorar spot-check confirmed `bukhari:2819` by number and matn, but
Dorar's grade line for that entry is «[معلق]», not «[صحيح]» (`data/review/dorar-verification.json`,
`dorarGrade`). Our text opens «وَقَالَ اللَّيْثُ حَدَّثَنِي …», and the record carries the collection
grade «صحيح» by «صحيح البخاري» under the Sahihayn policy (AGENTS.md §6). The first run of the
spot-check stored the grade line but did not report it; the script now lists such cases.

What was done (conservative, AGENTS.md §9): the record is in `data/review/held-records.json`, so it
is pending and cannot produce MATCH. Its text and its grade field are unchanged — the tool does not
grade, and removing or changing a grade is not its decision either.

The three questions this entry left open (closed below):

1. Whether the collection grade may be shown for this record at all.
2. The wider question: the Sahihayn policy gives «صحيح» to every numbered record, including any
   whose chain al-Bukhari did not connect. The data has no field that marks them. As a scale
   indicator only — **not** a classification — 199 Bukhari and 28 Muslim records open with
   «قال» / «وقال» (188 and 27 of them are reviewed after this hold); many of those are ordinary connected
   narrations (e.g. `bukhari:4` continues the previous chain). Only `bukhari:2819` has evidence
   against it, and only because it happened to be in the 30-record sample.
3. Whether a grade may be displayed for pending records in any status other than MATCH.

**Closed 2026-10-03.**

Evidence. Ibn al-Salah, المقدمة، النوع الأول، الفائدة السادسة: «ما أسنده البخاري ومسلم - رحمهما
الله - في كتابيهما بالإسناد المتصل فذلك الذي حكما بصحته بلا إشكال. وأما المعلق - وهو الذي حُذف من
مبتدأ إسناده واحد أو أكثر - وأغلب ما وقع ذلك في كتاب البخاري وهو في كتاب مسلم قليل جدا، ففي بعضه
نظر». He adds that a suspended report in a decisive form («قال فلان») is judged sound up to the
person it is suspended from, that one in a non-decisive form («رُوي عن») carries no such judgment,
and that statements about the soundness of the whole book mean «مقاصد الكتاب وموضوعه ومتون الأبواب
دون التراجم ونحوها». So the collection grade «صحيح», by «صحيح البخاري», is not the approved grade
of a suspended report as such. Dorar's grade line for no. 2819 is «[معلق]». shamela.ws
«ط السلطانية» 4/22 prints it as «2819 - وَقَالَ اللَّيْثُ حَدَّثَنِي جَعْفَرُ بْنُ رَبِيعَةَ …»
(<https://shamela.ws/book/1681/4468>): the text is right, the form is a suspension.

Decisions.

1. **`bukhari:2819` carries no grade and stays pending.** The tool neither grades it nor copies
   a grade for it. The same hadith is in the corpus under five other numbers that open with
   «حدثنا» and are reviewed (`bukhari:3424`, `5242`, `6639`, `6720`, `7469`).
2. **The wider question: a structural rule, not a classification.** A record whose own text does
   not open with a formula of direct transmission (حدثنا، حدثني، أخبرنا، أخبرني، سمعت, with or
   without «و») is kept pending and carries no grade: 250 Bukhari records («وقال» 149, «قال» 50,
   «وعن» 25, «وأن» 8, «وزاد» and others) and 30 Muslim records; 239 and 29 of them were reviewed
   before. Such a record is either a suspended report or the continuation of the previous record's
   chain (`bukhari:4`); the data has no field that tells them apart, and telling them apart is a
   specialist's work (Ibn Hajar gave it a book, «تغليق التعليق»). The tool therefore abstains on
   all of them. The rule looks at the form of the text only (`scripts/lib/transmission.ts`,
   tested); it says nothing about any hadith. Known limits: it over-holds connected continuations,
   and it cannot see a suspension inside a record that opens with «حدثنا».
3. **No grade on a pending record, in any status.** Settled in the data (D-2): pending records have
   no `grade` field, so no screen can show one.

To release one of these records later: an entry in `data/review/reviewed.json` `records` that
quotes a source naming the report as connected under that number (for example Dorar's grade line
«[صحيح]» for the same book and number with the same text).

## D-6 — Evaluation labels that rest on an open or conservative choice (2026-10-02)

Made while writing `eval/cases` (details in `docs/EVALUATION.md` section 6).

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

**Closed 2026-10-03.**

1. `T-007` and `H-008` stay `MATCH`: settled by D-9 and D-13 and pinned by tests.
2. Vague attribution → `NEEDS_SPECIALIST`: confirmed. The package asks the tool to
   «يصرح بعدم كفاية المعلومات» and to refer when a specialist's judgment is needed; who said a
   saying introduced by «في الأثر» is such a question. `NOT_FOUND` would claim a search the tool
   could not make: it does not know what is attributed to whom.
3. A hadith cited to a book outside the covered sources → `NOT_FOUND`: confirmed, with the fixed
   sentence «لم نجد هذا النص في المصادر المغطاة (…). هذا لا يعني الحكم عليه؛ راجعه قبل النشر.»
   This is the package's own expected behaviour: «بيان عدم العثور على دليل مطابق في المصادر المتاحة».
4. The three single-collection labels stand. Checked again on dorar.net on 2026-10-03 (the API,
   with and without the book filter): each phrase is returned when all books are searched, and
   none of the 15 results limited to the other book contains it — «خيركم من تعلم القرآن وعلمه» and
   «بلغوا عني ولو آية» not under صحيح مسلم, «الطهور شطر الإيمان» not under صحيح البخاري. Two
   searches, a day apart, agree with the corpus. A search is still not proof of absence, so the
   reason sentences for `REF_MISMATCH_COLLECTION` and `REF_NOT_AGREED_UPON` must say the text was
   not found in the tool's copy of the other book, never that it is not in the book (a requirement
   for P11).
5. The four reason-code names are final.

## D-7 — Honorific phrases are not removed from Quran search text (2026-10-03)

The normalization task removes «رضي الله عنه / عنها / عنهما / عنهم» at level "search". The phrase
«رضي الله عنهم» is part of four ayat (5:119, 9:100, 58:22, 98:8). Removing it there would make a
quotation with an altered pronoun («رضي الله عنهما ورضوا عنه») equal to the ayah's search text.
Conservative choice: Quran `searchText` is built with `keepHonorificPhrases: true`, and a draft span
compared with a Quran record must be normalized the same way (P2). Hadith records follow the task as
written; the same words inside a matn are removed on both sides, so `searchText` equality alone must
not decide MATCH.

**Closed 2026-10-03 — confirmed.** Words of the Quran are never removed from a Quran search text.
For hadith the phrase is removed on both sides, and a status is never decided by `searchText`
equality alone: the diff runs on `exactText`.

## D-8 — Normalization bridges «الملإ» / «نبإ» but adds nothing for the open spelling decision (2026-10-03)

`docs/SOURCES.md` §5 item 3 stays open. The task's rule «أ إ آ ٱ → ا» makes «الملأ» equal to the
source's «الملإ» (and «نبأ» to «نبإ») as a side effect. The other mushaf spellings (رحمت، امرأت، رءوف،
مسئولا، داوود، مائة) and Uthmani-script words that write an alef as U+0670 (العٰلمين) are not bridged;
no folding rule, variant list or second text was added. Table in `docs/ARCHITECTURE.md`.

Three readings of the task (all confirmed below):

1. Punctuation and ﷺ become a word separator instead of being deleted, so «قال:«إنما» stays two words.
2. Level "strict" also removes the superscript alef (U+0670), which the task did not list.
3. Invisible direction marks and zero-width characters are handled although the task did not list
   them (the hadith source is full of U+200F).

**Closed 2026-10-03 — the three readings are confirmed.** A separator keeps word boundaries where
the source has punctuation only; level "strict" removes U+0670 because our own Quran text carries
it as a mark, not a letter; direction marks carry no text. The spelling question the entry left
open was closed by D-9.

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
     `searchText` has none. Kept (closed 2026-10-03): without it 271 more ayat of the
     Tanzil text are not found as exact. It applies to the search variant only, and a match
     through the variant is still gated word by word (D-13).
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

**Closed 2026-10-03.** The owner's decisions stand; the one point left to the owner
(`foldHamzaAlef`) is kept, as noted above.

## D-10 — Corpus index: choices the prompt did not settle (2026-10-03)

Made while building the search layer (`docs/ARCHITECTURE.md`, "Corpus index").

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
5. **Kind labels**: «آية قرآنية» and «حديث نبوي» (`src/i18n/ar.ts`). Editorial wording, confirmed.
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

**Closed 2026-10-03 — all ten items confirmed.** They are engineering choices. The two that touch
religious content hold: item 3 (a reviewed spelling bridge is never skipped silently) and item 6
(a citation is never composed at runtime, so no number can be invented).

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
lists of ayat).

**Closed 2026-10-03 — confirmed.** The package puts abstention first when evidence is missing
(«عند غياب المرجع الكافي أو انخفاض الثقة، تكون الأولوية للامتناع أو التحفظ أو الإحالة»), and a
reference the tool did not read is missing evidence for the reference.

## D-12 — Quran matcher, word diff and status rules: choices the prompt did not settle (2026-10-03)

Items 1–3 touch what the user is told about a Quran text.

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

**Closed 2026-10-03 — items 2–11 confirmed** (item 1 was replaced by D-13). On item 2: a writer
who quotes two ayat and cites one has given an incomplete reference; the sentence names the range
in the source and blames nothing. On item 3: no statement about wording is made from a text that
was not approved. Item 11's sizes may still be tuned in P15, on the tune split only.

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

Limits (closed below):

- **A plain alef that the everyday text writes too is accepted** in a span that is in Uthmani
  script, also where the mushaf writes it above the line: «ءَايَات» for «ءَايَٰت», «يَاأَيُّهَا»
  for «يَٰٓأَيُّهَا». The word is then the mushaf's letters with the everyday alef. It can only
  arise in text that already carries Uthmani signs.
- **32 genuine mushaf pastes were refused** (two wordings, «فَبِأَيِّ ءَالَآءِ رَبِّكُمَا
  تُكَذِّبَانِ» and 53:55): no sign, no superscript alef, and «ءالاء» differs from «آلاء». They
  ended `DIFFERS`. Fixed on 2026-10-03, see "Closed" below.
- **An exact check needs the data to say where the mushaf has the mark.** A second search variant
  that keeps U+0670 as its own character would make rule 3 a plain comparison. It means rebuilding
  `data/corpus` (new `corpusVersion`), which was not done. Decided on 2026-10-03: not adopted, see "Closed" below.

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

**Closed 2026-10-03.**

1. **The 32 refused pastes now end `MATCH`.** Telling a writer that a verse copied from the
   Madinah mushaf "differs in wording" is a wrong statement about the Quran text, and the package
   names «النص القرآني بالرسم والنص المعتمد» as the reference. The mushaf writes the word
   «ءَالَآءِ» with a combining maddah (U+0653). Measured on the two source files: U+0653, U+0654 and
   U+0655 occur 5652, 495 and 14 times in mushaf 2 and **never** in mushaf 1, which writes آ أ إ as
   single characters. The three were added to the signs that mark a span as Uthmani script
   (`hasUthmaniSigns`). «ءالاء» typed in everyday script without the maddah still ends `DIFFERS`
   (tested).
2. **Measured after the change**, every ayah of mushaf 2 pasted whole: 6236 of 6236 end `MATCH`
   with their own ayah in the evidence (2248 on `default`, 3988 through `uthmani`), none refused.
   The same ayat with every superscript alef spelt out as «ا»: unchanged — 2584 refused, 552 and
   1231 accepted (the alefs the everyday text writes too). The owner's rule, "a spelling error
   never ends MATCH", holds as before.
3. Known limit: a draft whose آ أ إ arrive decomposed (Unicode NFD: alef plus a combining mark)
   counts as Uthmani script. The effect is that a word written as the mushaf writes it is
   accepted; a spelt-out superscript alef is still refused by rule 3.
4. **A second variant that keeps U+0670 is not adopted.** The inference is measured on all 6236
   ayat in both directions (item 2); a second variant would add corpus size for no measured gain.

## D-14 — The held hadith records, compared with a second edition (2026-10-03)

**Closed.** The six records held after the Dorar comparison (`docs/HADITH_FLAGGED_INVESTIGATION.md`)
were unresolved because Dorar's two texts disagreed and no second witness had been read. On
2026-10-03 each was read on shamela.ws, which the package names for «الطبعات المعتمدة لكتب السنة».

Finding: Dorar's "book text" for Sahih Muslim has the same wording as the digital copy shamela.ws
serves as «ت عبد الباقي» (book 1727), including the same slips («لتخذت», «وكيف أرضع؟», «عمر رضي
الله عليه وسلم», «أبي موس»). The two were therefore one witness, not two. The fully vocalized
«ط التركية» (book 711) is a separate text.

| Record | No. | «ط التركية» on shamela.ws | Result |
|---|---|---|---|
| `muslim:6172` | 2383 | «لَاتَّخَذْتُ أَبَا بَكْرٍ خَلِيلًا» — <https://shamela.ws/book/711/7369> | Agrees with our text. Released |
| `muslim:3600` | 1453 | «وَكَيْفَ أُرْضِعُهُ وَهُوَ رَجُلٌ كَبِيرٌ» — <https://shamela.ws/book/711/4266> | Agrees. Released |
| `muslim:3944` | 1547 | «يُكْرِي أَرَضِيهِ», «سَمِعْتُ عَمَّيَّ، وَكَانَا قَدْ شَهِدَا بَدْرًا، يُحَدِّثَانِ» — <https://shamela.ws/book/711/4668> | Agrees. Released |
| `muslim:2957` | 1221 | «فَقَدِمَ عُمَرُ ﵁» — <https://shamela.ws/book/711/3505> | Agrees. Released |
| `muslim:7314` | 2912 | The whole hadith — <https://shamela.ws/book/711/8756> | Agrees. Released |
| `bukhari:2075` | 2075 | «ط السلطانية» 3/57 ends «لَأَنْ يَأْخُذَ أَحَدُكُمْ أَحْبُلَهُ» — <https://shamela.ws/book/1681/3301> | Our text has six more words. **Stays held** |

Method: each Muslim record's `exactText` and the edition's text were reduced to words (diacritics
removed, أ إ آ and ى folded, ﷺ and ﵁ written out) and compared by a script. All five: the same
number of words, and no word on either side without its partner (59, 92, 131, 175 and 43 words).
The wording itself points the same way: «عمّي … يحدثان» needs the dual «وكانا قد شهدا», and «رضي
الله عليه وسلم» is not a phrase.

Decisions.

1. The five Muslim records are approved one by one in `data/review/reviewed.json` (`records`,
   with the page compared) and removed from `data/review/held-records.json`. The approval is
   recorded under the AI assistant's name, not the owner's.
2. `bukhari:2075` stays pending for as long as this source text is used. Two witnesses (Dorar,
   and «ط السلطانية» on shamela.ws) end the hadith of this number at «أحبله». The record's text is
   not edited: the tool does not rewrite a source.
3. What this says about the rest of Sahih Muslim: the differences found in the 12-record sample
   were slips of the copy used for comparison, not of our text. After this review 12 of 12 sampled
   Muslim records and 11 of 12 sampled Bukhari records agree with an edition's text. It is still a
   sample; the other records were not compared with a second text.

## D-15 — The other items of the source register (2026-10-03)

**Closed.** These were the rows still marked pending in `docs/SOURCES.md` section 5.

1. **Quranpedia checksum mismatch (item 2): accepted, not blocking.** The `.gz` served has the
   manifest's byte size and decompresses to exactly the local JSON, for both mushaf files; only the
   hash of the compressed file differs. The cause was not established. The integrity anchor is the
   sha256 of the decompressed JSON, recorded in `data/corpus/manifest.json` and re-checked by
   `npm run verify:corpus`. A second test was made on 2026-10-03: all 6236 ayat of
   `data/corpus/quran.json` were compared with the Tanzil "simple" text (api.alquran.cloud,
   edition `quran-simple`). With diacritics and marks removed, **6236 of 6236 ayat are identical
   letter for letter**, under the same surah and ayah numbers. Two texts this close probably share
   an origin, so the test shows our copy is intact and equal to a widely used text; it is not a
   comparison with an independent edition. Writing to Quranpedia about the manifest hash is
   optional and changes nothing here.
2. **The signs ۞ and ۩ (item 4): kept, in the data and on screen.** `exactText` is shown as the
   source gives it. The signs are not words: normalization drops them, so they take no part in
   matching or in the diff.
3. **Empty source entries (item 11): accepted.** 9 Bukhari and 203 Muslim source entries have no
   text. The `NOT_FOUND` sentence speaks of "the covered sources" and passes no judgment.
4. **Alternate surah names (item 14): approved, with one addition.** Checked on 2026-10-03:
   - No name or alternate name belongs to two surahs (script check over `data/aliases/surahs.json`).
   - Named in al-Suyuti's «الإتقان», النوع السابع عشر: براءة؛ سبحان، بني إسرائيل؛ الملائكة؛ المؤمن؛
     الشريعة؛ القتال؛ تبارك (الملك)؛ لم يكن؛ أرأيت؛ أم القرآن، السبع المثاني.
   - Opening words of the surah, checked against `data/corpus/quran.json`: براءة، سبحان، تبارك، ن،
     سأل سائل، هل أتى، عم، عم يتساءلون، ألم نشرح، اقرأ، لم يكن، لإيلاف، أرأيت، تبت.
   - Kept as common titles, without a source check: أم الكتاب، الحمد، الم السجدة، الم تنزيل،
     حم السجدة، حم عسق، الدهر (for al-Insan)، الانشراح، الزلزال، اللهب، التوحيد، النساء الصغرى.
   - **Added: «النساء القصرى»** for al-Talaq. It is the form in al-Itqan and in our own corpus
     (`bukhari:4532`, `bukhari:4910`).
   - Noted: al-Itqan reports «الدهر» as a name of al-Jathiyah («حكاه الكرماني»). The list keeps it
     for al-Insan. A wrong alias can cause a wrong `DIFFERS` on the reference; it cannot produce a
     `MATCH` on a text that does not match.
5. **Hadith collection names (item 17): approved as they are.** The list is used to recognise a
   citation only. Books outside the corpus are listed so that a citation of them is recognised as
   outside the coverage. The known weak spots are parser matters, in `docs/BACKLOG.md`.

## D-16 — How decisions of this kind are made from now on (2026-10-03)

**Decided by the owner.** Earlier prompts sent every choice about religious content back to the
owner. From 2026-10-03 the agent decides, on these conditions (AGENTS.md §9, "Decisions on
religious content"):

1. It researches first, in the sources the package approves (the King Fahd Complex mushaf and
   quranpedia.net; dorar.net; the editions on shamela.ws) and in the recognised works of the
   discipline, and it tests the claim on the data where a test is possible.
2. It decides, implements and tests, without stopping to ask.
3. It records the decision here as closed, with the sources, what was measured, and the limits.
4. Where the evidence is not enough, the decision is the conservative one (abstain, keep pending),
   recorded as a decision, not as a question.

The limits are unchanged: the non-negotiable rules of AGENTS.md §2. The agent decides how the tool
handles texts and references. It never grades a hadith, never interprets a verse, never issues a
ruling, and never edits a source text. An approval it gives is recorded in
`data/review/reviewed.json` under its own name, not the owner's.

## D-17 — Orchestrator and API v1: choices the prompt did not settle (2026-10-03)

Made while building `review()` and the two routes (`docs/ARCHITECTURE.md`, "Orchestrator" and
"API v1"). Items 1–4 decide what a writer or a client is told about a source; the rest are
engineering choices. None needed a source outside the repository: they follow from `AGENTS.md` §2
and were tested on the corpus.

1. **`citedReference.parsed` is typed by `ParsedReferenceSchema`** (the question left in
   `docs/BACKLOG.md`).

   | Option | For | Against |
   |---|---|---|
   | Keep `z.unknown()` | No contract to keep stable | Every client must guess the shape; anything could be sent under that key |
   | Leave `parsed` out of the API | Smallest surface | A client cannot say why an item is `REF_NOT_CHECKED` (the reference was `unknown` or `partial`, D-11), nor show which surah and ayah the tool read |
   | **`ParsedReferenceSchema`** (chosen) | One definition, validated at the boundary; `type: "unknown"` and `partial: true` are visible to the client | The parser's output shape is now part of API v1 |

   It carries only what the writer wrote, read deterministically; nothing from a source. The schema
   moved to `src/core/references/schema.ts`, which imports nothing from core, because
   `src/core/references/index.ts` imports `types.ts` at runtime; `src/core/references` still
   exports it.
2. **The API record.** `evidence[].record` is `ApiSourceRecordSchema`: `SourceRecordSchema` without
   `searchText`, `searchVariants`, `matnText`. `toApiRecord` builds it from a list of allowed
   fields, so a field added to `SourceRecord` later does not leave the server until it is named
   there. It is applied in `evidenceOf`, the only place evidence is made; the strict schema at the
   route is the second gate. Tested: the route's responses (handler tests, and a request to a
   running `next start`) and the generated `docs/API.md` contain none of the three keys.
3. **Coverage is what is searched.** `ReviewResult.coverage` = the corpus collections whose kind
   has a registered matcher (`searchedCoverage`), today `["quran"]`. The alternative, the manifest's
   coverage, would tell a writer «لم نجد هذا النص في … صحيح البخاري، صحيح مسلم» for a text nothing
   searched there: an unsupported statement about two books (§2 rules 1 and 3). Tested with a text
   that the corpus holds in `bukhari:1`: `NOT_FOUND`, and the sentence names «القرآن الكريم» only.
   `GET /health` reports the same list. Limit: a hadith quote is still given `NOT_FOUND` rather
   than a status that says "not searched"; the sentence is true, and no new status was added
   (§4 fixes the four).
4. **Bounds.** `MAX_EVIDENCE_PER_ITEM = 5`, `MAX_ITEMS_PER_DRAFT = 40`. The evidence limit counts
   occurrences, not records, so a quote over several ayat is never shown cut in the middle. The
   reason sentence counts every occurrence. Items beyond the limit are not reviewed and the result
   says so with the new warning `ITEM_LIMIT_REACHED`. Measured: «الله» (more than 2000 exact
   occurrences) returns 5 evidence entries. The values are not tuned.
5. **Merge rule.** Identical spans are merged (`extractedBy` names both; the kind of the first
   extractor in `deps.extractors` wins). Overlapping spans: the earlier start wins, then the longer
   span; the other is dropped. So a place of the draft belongs to one item, and
   `item-<start>-<end>` is a unique, deterministic id. A verse quoted inside a hadith quote is
   therefore not a separate item; P9 owns a finer rule. (Closed: D-20 item 1, the rule stays.)
   (Replaced by the merge rule of D-21 item 3.)
6. **The ERROR item** carries no evidence and no `citedReference`, even when the reference was
   attached before the failure: nothing found for a failed item is shown. `ReviewItemSchema` now
   also rejects an `ERROR` item with evidence or an explanation. Its sentence
   (`item.error.INTERNAL_ERROR`) says the fault is the tool's and says nothing about the text.
7. **Word diff after the decision.** §6 lists "word diff" before "status rules". `decide` does not
   read a diff, and a one-word quote has thousands of candidates, so the diff is computed after the
   decision, for the evidence that is returned. The alignment it is made from exists before the
   decision; the result is the same.
8. **`LLM_UNAVAILABLE_REGEX_ONLY` is on every result until P10**, also if a caller passes `llm`:
   nothing calls the port yet, and the warning states what happened. `review` is already `async`,
   so P10 does not change its signature. `deps.now` is declared and not read: a result holds no
   time, so that the same draft gives the same result. (Replaced: D-21 item 6. The warning is
   now added only when no LLM took part.)
9. **`deps.matchers` and `deps.limits`** are two optional fields the prompt did not list. The first
   lets a test make one matcher throw and lets the coverage test register a matcher; the second
   lets the bounds be tested on fixture records.
10. **Rate limit: an in-memory token bucket**, keyed by the first address of `X-Forwarded-For`.
    Its limits, accepted for the demo:
    - It is per server instance. On a serverless host each instance has its own buckets and a cold
      start empties them, so the real limit is `RATE_LIMIT_PER_MIN` × the number of instances.
    - The key is only as good as the proxy that sets the header. Behind a proxy that appends to a
      client-supplied `X-Forwarded-For` instead of replacing it, a client can pick its own key.
      A request with no address shares the one key `unknown`.
    - The address is held in memory as a map key until its bucket refills (at most 10,000 keys); it
      is never logged or returned.
    A shared store (Redis, the host's own rate limiting) replaces it for production
    (`docs/BACKLOG.md`).
11. **CORS.** An `Origin` equal to the request's own origin (or whose host is the `Host` /
    `X-Forwarded-Host` header) is same-origin. Another origin is served only if `CORS_ALLOWLIST`
    names it; otherwise 403 with no CORS header. `*` in the list is ignored. A request with no
    `Origin` header is served: CORS protects browser users, it is not authentication, and a
    non-browser client is held by the rate limit only.
12. **Error responses.** `{ apiVersion, error: { code, message } }` with HTTP 400 (invalid, empty),
    413 (too long), 403, 429, 500. The body is strict JSON `{ text }`; an unknown field is refused
    rather than ignored. The length limit counts UTF-16 code units (`String.length`), which is what
    a client's `text.length` gives. A body over `MAX_DRAFT_CHARS × 6 + 1024` bytes is refused
    without being read to its end.
13. **Logging.** The log entry type has no free-text field. For a 500 it holds a fixed word and the
    class name of the error; only the corpus loader's message is logged as text, because it names
    files and never a query (`docs/ARCHITECTURE.md`, "Corpus index").
14. **`GET /health` answers 503** with `ok: false` when the corpus does not load, so that a
    monitor needs no body parsing.
15. **The temporary extractor** takes `«…»` only when «قال رسول الله» is at most 60 characters
    before it in the same sentence. Other formulas («قال النبي», «عن النبي ﷺ أنه قال») are P9. (Replaced by the regex extractor: D-20.)

Limits of this entry: the routes were tested through their handlers with Web `Request` objects, by
`next build`, and with `curl` against `next start` on the build machine (health, a review, a refused
origin and its preflight, an empty draft). No browser made a cross-origin request, and the files
named by `outputFileTracingIncludes` were read in the build's trace files
(`.next/server/app/api/v1/*/route.js.nft.json`), not on a deployed host.

## D-18 — The documents brought in line before the UI (2026-10-03)

Before P7 the owner asked for every document to agree with what P6 built. Four points were
settled; each follows from a rule already in force, so no new source was consulted.

1. **`AGENTS.md` §6 now shows the contract as built** (D-17): `evidence[].record` is an
   `ApiSourceRecord`, `citedReference.parsed` is a `ParsedReference`, `coverage` is the searched
   coverage, and the pipeline lists the word diff after the status rules. Edited on the owner's
   instruction. `docs/API.md` (generated) stays the detailed contract.
2. **The UI never names a source that is not searched.** The home screen's scope note and the
   "covered sources" line are built from `coverage` of `GET /api/v1/health`, not written into the
   page. The P7 prompt's fixed wording «يراجع الآيات وأحاديث الصحيحين في مسودتك» would be untrue
   until the hadith matcher is registered (P11): the same reason as D-17 item 3 (`AGENTS.md` §2
   rules 1 and 3). Now a rule in `AGENTS.md` §6.
3. **The copy button reads «انسخ نص المصدر مع المرجع»**, not «انسخ النص الصحيح مع المرجع». The
   tool shows that a text stands in a source with this wording; it does not prove authenticity
   (`AGENTS.md` §4), and «الصحيح» beside a hadith reads as a grade (§2 rule 4). The same choice
   as D-12 item 10 for the reason sentences. Now a rule in `AGENTS.md` §8, for every label.
4. **The Quran font is decided by a check, in P7.** The P7 prompt asked for "the Uthmani font".
   The Quran text is in everyday spelling (`AGENTS.md` §5), and §8 allows the KFGQPC Hafs font
   only if its terms permit web embedding and it renders this text correctly on real ayat;
   otherwise Amiri. The prompt now says so; the check and its result will be recorded by P7.

Also done: `docs/PRIVACY.md` written from what the code does today (AGENTS.md §2 rule 8 asks for a
published notice, and the UI's footer links to it). It must be updated when the LLM extractor
(P10) starts sending drafts to a provider; the P10 and P13 prompts say so.

Limits: the prompt pack (`Azw_Build_Prompts.md`) is a local file outside the repository; its P7–P13
prompts were edited to match, and the prompts already run (P0–P6) were left as they were written.

## D-19 — The UI: the Quran font, and choices the prompt did not settle (2026-10-03)

Made while building the screens (`docs/ARCHITECTURE.md`, "UI"). Item 1 is the check D-18 item 4
left to P7. Items 2–4 decide what a writer is shown of a source; the rest are engineering choices.

1. **Quran text is set in Amiri, not in the KFGQPC Hafs font.** `AGENTS.md` §8 allowed the Hafs
   font only if its terms permit web embedding *and* it renders our everyday-spelling text
   correctly on real ayat. Both were checked; the second fails. §8 now states the result (edited
   on the owner's instruction).

   *The font.* Downloaded on 2026-10-03 from the King Fahd Complex's own font site,
   <https://fonts.qurancomplex.gov.sa/ten-readings> → <https://fonts.qurancomplex.gov.sa/hafs-reading>
   («الخط الحاسوبي لرواية حفص عن عاصم الكوفي»): `KFGQPC-Hafs-V30.zip` (Version 3.0, marked «أحدث
   إصدار»; zip sha256 `ddf52d0f…295a324c`, the TTF inside `c9dd7e71…3aeec47a`) and
   `UthmanicHafs_v2-1.zip` (Version 2.1; zip sha256 `10551625…d73e50b3`).

   *Terms.* The page states none. The licence is inside the font file (`name` table, id 13,
   "ELECTRONIC END-USER LICENSE AGREEMENT"), quoted: "Permission is hereby granted, Free of Cost, to
   any person obtaining a copy of this Font accompanying this license, the rights to Use, Copy,
   Distribute, subject to the following conditions: 1. The Font Software cannot be Sold, Modified,
   Altered, Translated, Reverse Engineered, Decompiled, Disassembled, Reproduced …". The copyright
   line (id 0): "This Font is the property of King Fahd Glorious Quran Printing Complex, and may
   not be reproduced, modified without the express written approval of King Fahd Glorious Quran
   Printing Complex." The embedding flags (`OS/2.fsType`) are 0, "installable embedding". Read
   together: serving the unmodified TTF to a browser is use and distribution, which the licence
   grants; subsetting the font or converting it to WOFF2, which web embedding normally does, is
   "Modified, Altered", which it forbids. So embedding is permitted only as the whole, unconverted
   file.

   *Rendering, measured on all 6236 ayat of `data/corpus/quran.json`.* The corpus text uses 55
   distinct characters. Both font versions lack one of them: **U+0622 «آ» (alef with madda above)**,
   which stands 1511 times in **1286 ayat** (for example «آمَنُوا» in البقرة 153). The font was
   made for the complex's Uthmani-script text, which writes that sound with other characters and
   never uses U+0622; the sample on the font's own page and the mushaf in the bundled Word file
   show it («ءَامَنُواْ»). In a browser the missing letter is drawn from the next font in the stack,
   so a word of the ayah would be set in two typefaces. A mushaf font that cannot draw every
   letter of the text it is given does not render our text correctly.

   *Amiri.* The Amiri files the build serves (`next/font/google`, Version 1.002, SIL Open Font
   License) were read the same way: every one of the 55 characters, and the brackets ﴿ ﴾ (U+FD3E,
   U+FD3F), has a glyph. The rendering was looked at on البقرة 153 and 156 and الشرح 6 in headless
   Chrome at 360 px and 1280 px (the pause mark «ۚ» included).

   *Decision.* Amiri, through one CSS token (`--font-quran` in `src/app/globals.css`, used by the
   `quran` entry of `src/components/lib/kind-ui.ts`), so that a later change touches one line.
   Limits: the glyph check is of the character map, not of every mark position; the visual check
   was three ayat; the licence was read by an AI assistant, not by a lawyer, and the complex was
   not asked. The Hafs font would become usable if the displayed text were the Uthmani-script
   mushaf, which is a different decision (`AGENTS.md` §5).
2. **The sources page names a source only when the API's coverage lists its collections.** The
   prompt asks for a page that "renders docs/SOURCES.md summary"; that file describes the two
   hadith collections, and `AGENTS.md` §6 says a collection no matcher searches is never named in
   the UI. Options: show the whole register with a "not searched yet" label on the hadith source;
   or show each source only when every one of its collections is in `coverage` of
   `GET /api/v1/health`. Chosen: the second, the conservative one. Today the page shows the Quran
   source only; when P11 registers the hadith matcher the hadith entry (with its note on Dorar)
   appears with no change to the page. The wording of both entries is in `src/i18n/ar.ts` and says
   what `docs/SOURCES.md` says. Tested: `searchedSources` in `src/components/ui.test.ts`.
3. **What stands between ﴿ ﴾.** `record.exactText`, whole and unchanged, and nothing else; the
   brackets are outside the text. The part of an ayah the quote does not reach is shown in a
   quieter color, never cut, so that a reader sees the ayah as the source has it. The marks of the
   diff are styles on stretches of that text (`<mark>`, with a `title`); no character is inserted
   into it, so selecting and copying the block gives the source text. A word of the source is
   never struck through. The side-by-side view («قارن النصين») shows only the stretch the quote
   was aligned to, under the heading «نص المصدر», with the same citation.
4. **The copy button** puts on the clipboard `exactText` (between the marks of its kind) and, on a
   second line, `citation.display`; for a quote over several ayat, each ayah's text and the «من …
   إلى …» form the reason sentences use. It copies the whole ayah, not the quoted fragment: the
   prompt names `exactText`, and a fragment cut by the tool would be the tool's own text.
5. **An occurrence is read from the order of the evidence.** A `ReviewItem` has no occurrence
   index (`docs/BACKLOG.md`), so `groupOccurrences` takes an entry and the following entries that
   share its `ayahRange` and collection, up to the number of ayat in the range, as one place. A
   quote that stands in several places gets one button per place; the chosen place drives the
   source block and the marks in both texts. An entry without `ayahRange` is a place of its own.
6. **The client validates every response** against `ReviewResultSchema` / `ApiErrorSchema`
   (`src/components/lib/api-client.ts`). A body that is neither, a result under a failed HTTP
   status, and a network failure show a fixed sentence of the UI and never a result. An empty
   draft is refused in the page with the API's own sentence (`api.error.EMPTY_DRAFT`), without a
   request.
7. **The draft stays in memory.** It is component state only: no `localStorage`, no cookie, no
   URL parameter. The result view shows the text that was reviewed; if the writer edits the
   textarea afterwards, a notice says the result belongs to the earlier text. Nothing rewrites the
   draft, and there is no "fix all". (Changed by the owner on 2026-10-04, D-25: the writer may
   apply a correction, one quote at a time, to a copy of the draft. Still no "fix all".)
8. **Status colors and contrast.** The four identity colors of `AGENTS.md` §8 are used for
   borders, bars and underlines. As text on white, the DIFFERS color `#C98414` gives about 3:1 and
   fails AA, so each status has a darker text color derived from it (`--status-ink` in
   `globals.css`). A status is always a label and an icon; in the draft view each status also has
   its own underline style (solid, wavy, dotted, dashed, double). `ERROR` uses the vermilion
   accent. Vermilion is not used for text or for the main button (white on it gives about 4.1:1).
9. **The "no quotes found" state names the two forms the temporary extractor reads**
   (`extract.formsNote`) and says that this does not mean the draft holds no quotes. The sentence
   must change with the extractor (P9). (Done: D-20 item 8.)
10. **`/privacy`** carries the sections of `docs/PRIVACY.md` in its order, without the table of
    code and tests, which names files and is of no use to a writer. It says nothing that file does
    not say.

Checked: `npm run lint`, `typecheck`, `test`, `build`; in headless Chrome at 360 px and 1280 px no
element is wider than the viewport on five screens (home, a result with the comparison open, the
three pages); Lighthouse accessibility 100 on the four pages and on the home page with a result
(a Lighthouse snapshot). Limits: one browser engine (Chrome), no screen reader was run, and no
phone was used.

## D-20 — Regex extractor: choices the prompt did not settle (2026-10-03)

Made while replacing the temporary extractor (`docs/ARCHITECTURE.md`, "Regex extractor"). They
decide which words of a draft become an item and what the writer is taken to claim about them;
none decides a status, a text or a grade. They follow from `AGENTS.md` §2 (rules 3 and 9) and from
the writer's own words, and were tested on hand-written drafts (`src/core/extract/index.test.ts`)
and on the real corpus (`src/server/quran-review.integration.test.ts`). Items 2 and 9 rest on
what the phrases mean in the discipline; the sources read for them are under "Sources" below.

1. **A `﴿…﴾` inside a hadith quote is not a separate item** (the question D-17 item 5 and
   `docs/BACKLOG.md` left to P9). The merge rule stays: the earlier start wins, then the longer
   span. The extractor applies the same rule to its own output, so `review()` receives spans that
   do not overlap. Reason: a place of the draft belongs to one item, and the ayah inside a hadith
   is part of what the hadith's source must contain. Limit: the verse inside is not checked
   against the Quran text on its own. For an unmarked quote the end is a guess while `﴿` is
   certain, so an unmarked quote stops before `﴿` and the verse is its own item.
2. **Two phrases before one quote give one item with the weaker claim.** «يُروى عن النبي ﷺ أنه
   قال: «…»» holds «يروى» (unclear) and «عن النبي … قال» (hadith) before the same words.

   | Option | Result |
   |---|---|
   | The phrase nearest the quote | «يُروى عن النبي ﷺ أنه قال: «…»» is `hadith`: the writer's «يُروى» is lost, and the words could end `MATCH` |
   | The first phrase | `unclear_attribution` there, but «قال الله تعالى في الحديث القدسي: «…»» is claimed as a verse |
   | **The weaker claim** (chosen) | `unclear_attribution` → `NEEDS_SPECIALIST`; and words the writer calls a hadith («قال رسول الله ﷺ: قال الله تعالى: …», «… في الحديث القدسي») are `hadith`, never `quran` |

   The order is `unclear_attribution`, then any other kind, then `quran`. It reads only what the
   writer wrote: it says nothing about what the text is. A second phrase written with «و» or «ف»
   starts a new clause and is not chained; the first phrase then takes no quote from beyond it.

   *Evidence.* (a) «يُروى» is a form that does not assert: Ibn al-Salah tells the one who relates
   a weak hadith without its chain not to say «قال رسول الله ﷺ» but «رُوي عن رسول الله ﷺ كذا»
   and the like (Sources 1, 2). A writer who puts «يُروى» before «عن النبي ﷺ أنه قال» has
   therefore not asserted the attribution, and reading the item as a plain `hadith` claim would
   say more than the writer did. (b) A hadith qudsi is cited in two forms, «قال رسول الله ﷺ فيما
   يرويه عن ربه» and «قال الله تعالى» directly, and it is not Quran (Source 3). So «قال الله
   تعالى» beside a hadith phrase is a hadith citation, and `hadith` over `quran` is the reading
   the discipline gives. (c) «الأثر» does not say whose words they are: the jurists of Khurasan
   use it for a Companion's saying (الموقوف), the hadith scholars for both (Source 2). «في
   الأثر» as `unclear_attribution` (the prompt's choice) agrees with that.
3. **Unmarked quotes: a colon is required after a phrase that is not a verb of speech**
   («في الحديث», «ورد عنه», «في الأثر», «قال بعض السلف», «يروى», «يقال إن النبي»). The prompt asks
   for "the text up to the sentence end when there are no quotation marks" after every hadith
   phrase. «في الحديث عن الصبر فوائد كثيرة» and «يروى في كتب الأدب كثير من هذا» would then become
   items. After a verb of speech («قال رسول الله», «قال النبي», «قال ﷺ», «عن النبي … قال», and the
   five Quran phrases) the text is taken without a colon as well, as the prompt says. The choice
   is a field of each pattern (`unmarked`).
4. **Where an unmarked quote ends**, beyond the sentence end and the reference the prompt names:
   any quotation mark, any opening bracket, and the next attribution phrase. A reference is
   recognised without the alias lists (an extractor receives the draft only): an opening bracket,
   or «رواه», «أخرجه», «خرجه», «متفق عليه». A gloss in brackets inside an unmarked quote therefore
   ends it; the fragment before it is still the draft's own words.
5. **Marks.** "Quotation marks" are `«…»`, `“…”` and `"…"` for every phrase. `(…)` is a quote
   only for the Quran phrases, only right after the phrase or its colon, and not when it holds a
   digit or opens with «سورة» or a reference word. `{…}` is not read (the prompt names round
   brackets only; `docs/BACKLOG.md`).
6. **The lead.** At most 60 characters of the same sentence between the phrase and the quote, as
   in D-17 item 15, now for every phrase; honorifics of the Prophet and of God are skipped there.
   «قال ﷺ» also reads the honorific written out («قال صلى الله عليه وسلم»): it is the same form.
7. **The one-word rule counts words that hold a letter**; it applies to marked and unmarked
   quotes, and not to `﴿…﴾`.
8. **The "no quotes found" sentence** (`extract.formsNote`, D-19 item 9) now names `﴿ ﴾` and every
   phrase of `ATTRIBUTION_PATTERNS`; a test in `src/components/ui.test.ts` fails if a phrase is
   added to the list and not to the sentence.
9. **Two kinds the prompt fixed, checked against the sources and kept.**
   - *«ورد عنه» is `hadith`.* Ibn al-Salah lists «ورد عنه» and «جاء عنه» beside «رُوي» among
     the forms for a weak hadith (Source 1), so it could be read as `unclear_attribution`.
     Weighed: `unclear_attribution` ends `NEEDS_SPECIALIST` whatever the text, also when the
     words stand verbatim in a covered source; `hadith` makes the tool search, and ends `MATCH`
     only on a reviewed record and `NOT_FOUND` otherwise. Neither outcome asserts anything the
     data does not hold, and the writer does name the Prophet («عنه ﷺ»). Kept as `hadith`.
   - *Text after «قال الله تعالى» in marks other than `﴿ ﴾` is `quran`.* Because «قال الله
     تعالى» is also a form of citing a hadith qudsi (Source 3), such a text may be a hadith the
     writer cited properly. Today nothing follows from it: the hadith collections are not
     searched, and the item ends `NOT_FOUND` with a sentence that names the Quran only. Once the
     hadith matcher is registered (P11), `decide()` would give `DIFFERS` / `KIND_MISMATCH` («يخالف
     نسبته في المسودة») to a correctly cited hadith qudsi. The kind stays `quran` here, since the
     extractor has no kind for "God's words, verse or hadith qudsi" and `ClaimedKind` and the
     status rules are outside this prompt; the rule P11 must add is in `docs/BACKLOG.md`. `﴿…﴾`
     is not affected: the ornate brackets claim a verse.

Sources (read on 2026-10-03):

1. Ibn al-Salah, «معرفة أنواع علوم الحديث» (المقدمة): «إذا أردت رواية الحديث الضعيف بغير إسناد
   فلا تقل فيه قال رسول الله صلى الله عليه وسلم كذا وكذا، وما أشبه هذا من الألفاظ الجازمة بأنه
   صلى الله عليه وسلم قال ذلك، وإنما تقول فيه روي عن رسول الله صلى الله عليه وسلم كذا وكذا، أو
   بلغنا عنه كذا وكذا، أو ورد عنه، أو جاء عنه، أو روى بعضهم، وما أشبه ذلك». Read as quoted in
   ʿAbd al-ʿAziz al-ʿUthaym, «تحقيق القول بالعمل بالحديث الضعيف», p. 24
   (<https://shamela.ws/book/10050/19>).
2. Al-Nawawi, «التقريب والتيسير» (<https://shamela.ws/book/5586>, text read at
   <https://islamicbook.ws/hadeth/alum/altqrib.html>): «وإذا أردت رواية الضعيف بغير إسناد فلا تقل
   قال رسول الله صلى الله عليه وسلم كذا وما أشبهه من صيغ الجزم، بل قل: روى كذا أو بلغنا كذا أو
   ورد أو جاء أو نقل أو ما أشبهه»; and, under النوع السابع (الموقوف): «وعند فقهاء خراسان تسمية
   الموقوف بالأثر، والمرفوع بالخبر».
3. Mannaʿ al-Qattan, «مباحث في علوم القرآن», pp. 22–23, as set out in
   <https://www.alukah.net/sharia/0/130420/>: the hadith qudsi is related either «قال رسول الله
   ﷺ فيما يرويه عن ربه» or «قال الله تعالى»; the Quran is attributed to God alone, the hadith
   qudsi to God or to the Prophet; and al-Jurjani («التعريفات», p. 83): «من حيث المعنى من عند
   الله تعالى، ومن حيث اللفظ من عند رسول الله».

Closed by this entry: D-17 item 5 (its last sentence), D-17 item 15, D-19 item 9.

Limits: the extractor was tested on drafts written for the tests, not measured on the evaluation
cases (that is the evaluation's task), and the limits of the unmarked form are listed in
`docs/ARCHITECTURE.md`. Of the sources: Sources 1 and 2 are one witness, not two, because
al-Nawawi's book abridges Ibn al-Salah's; Ibn al-Salah's words were read in a later book that
quotes them, not in an edition of the Muqaddima; Source 3 was read in an article that sets out
al-Qattan's chapter, because the page of the book itself did not load, so its points are given
here in summary and not as his words. This is an AI tool's documented source check, not a
scholar's review (`AGENTS.md` §9).

## D-21 — LLM extractor, span validation and merge: choices the prompt did not settle (2026-10-03)

Made while adding the LLM extractor (`docs/ARCHITECTURE.md`, "LLM extractor" and "Orchestrator").
They decide which words of a draft become an item and what the writer is taken to claim about
them; none decides a status, a text or a grade, and none needed a source outside the repository:
they follow from `AGENTS.md` §2 (rules 3, 8 and 9) and from D-20, and were tested with a mocked
port. Items 1–5 are about the content of a result; the rest are engineering choices.

1. **A repeated quote with no further occurrence is dropped and not counted.** The prompt says a
   quote returned twice takes the next occurrence, and that a quote not found is dropped with
   `LLM_SPAN_NOT_IN_DRAFT`. When the model returns a quote more often than the draft holds it, the
   extra copy has no place left. Counting it would tell the writer «أعاد النموذج نصاً لا يوجد في
   مسودتك» about words that are in the draft and already have their item. So it is dropped
   silently. An empty quote is counted: it is not text of the draft.
2. **"Whitespace-only differences" means the whitespace between words.** The quote is split on
   whitespace and its words are looked up as literal text, with any run of whitespace between
   them. Nothing else is bridged: a diacritic, a hamza form or a tatweel that differs makes the
   quote "not in the draft". The alternative (looking it up through the normalization of
   `src/core/normalize`) would accept a quote the model corrected or re-spelled, and the span
   would then be the model's reading, not the writer's text.
3. **The merge rule, where the prompt is silent.**
   - *Which kind, when neither is weaker.* D-20 item 2 orders `unclear_attribution`, then any
     other kind, then `quran`. For two other kinds («hadith» and a future kind) the earlier
     extractor's is kept: the regex extractor's before the LLM's, as D-17 item 5 had it.
   - *"A regex ﴿…﴾ quote"* is a regex quote of kind `quran` whose span stands between `﴿` and `﴾`
     in the draft (whitespace allowed). The brackets are read in the draft, so the regex
     extractor's output did not change. It stays `quran` whatever any other extractor says, and
     in either order of the extractors. (Under D-17 item 5 the first extractor's kind won; the
     test that fixed this was rewritten.)
   - *An `interpretive_claim` and a quotation are never the same item.* The weaker-claim order is
     about how firmly a text is attributed; an interpretive claim is not an attribution but a
     sentence of the writer about a text. Merging the two would either turn a quotation the
     writer marked into a claim (the model would then remove a checked item: rule 9), or give a
     quotation's kind to the model's sentence. At first they were handled as "any other
     overlap" (the earlier start wins, then the longer span). The live run below showed that
     this lets a claim remove a `﴿…﴾` quote inside it, against rule 9. **Decided by the owner
     (2026-10-03): keep both.** A claim that overlaps a quotation is cut to the longest stretch
     of its span that no quotation covers, trimmed of whitespace, marks and punctuation; a claim
     with no letter left is dropped. A claim has no text to match, so cutting it changes no
     status: it stays `NEEDS_SPECIALIST` with its level, and the quotation is checked as usual.
     This departs from the prompt's "any other overlap: keep one span" for claims only.
   - *Two claims on one sentence* are one item; level `D` is kept if either has it (the more
     restricted reading, `AGENTS.md` §3).
   - *The LLM can weaken a claim, never strengthen it.* By the weaker-claim rule, the model's
     `unclear_attribution` on a quote the regex extractor read as `hadith` gives
     `NEEDS_SPECIALIST`. That is the prompt's rule; it only ever moves an item towards
     abstention, and never for a `﴿…﴾` quote.
   - *Less than half in common* (a regex quote without marks that runs far past the quote the
     model returned): the regex span is kept and the model's is dropped, as the prompt says. The
     item then ends as it did before P10; the measure of how often this happens is the
     evaluation's (P14).
4. **`isDraft: false` with items.** The prompt tells the model to return no item then. If it does
   and the regex extractor found nothing: zero items and `NOT_A_DRAFT` (the prompt: "then zero
   items"). If the regex extractor found a quote, the model's items are merged like any others:
   each is text of the draft.
5. **An answer that does not fit the schema is "no LLM took part"**: the regex-only path with
   `LLM_UNAVAILABLE_REGEX_ONLY`, the same as a failure or a timeout. No part of such an answer is
   used. Unknown fields (a status, an offset) are not an error: they are not read.
6. **Where things live.** `LlmExtractionSchema` and `validateSpans` are in
   `src/core/extract/llm.ts` and the merge in `src/core/extract/merge.ts`, so that core validates
   what the port returns with the same schema the adapter sends, and both are pure. `LlmPort`
   stays in `src/core/review.ts`. The regex extractor now exports `wordCount` and `weakerKind`;
   its forms and its output did not change. `deps.now` is still not read: the time budget is the
   adapter's.
7. **The adapter (OpenAI).** `LLM_PROVIDER=openai` was set in the local `.env`.
   - The Responses API with `text.format` (JSON schema, strict), as the installed SDK (openai
     7.27.0) documents it; `store: false`, because the SDK's types say a response is stored by
     default.
   - *Timeout*: `LLM_TIMEOUT_MS` covers the whole extraction, the retry included. A per-attempt
     timeout would let one review wait twice as long.
   - *Retry*: one, after a connection error, 429 or 5xx. The SDK's own retries are off: it also
     retries a timeout and 408/409, and twice by default.
   - *Temperature 0, with one exception.* Some models refuse the parameter with HTTP 400. Such a
     model would fail every call and the tool would silently run on regex alone. So a 400 that
     names `temperature` is followed by one call without it, and the adapter stops sending it.
     This is a departure from "Temperature 0" for those models only; whether `LLM_MODEL` is one
     of them was not tested.
   - `explainDiff` returns `null` until P12.
   - A provider with no adapter gives no port (regex only, with the warning). `llmConfigured` of
     `GET /health` still reports that the three variables are set, as documented.
8. **The prompt** is Appendix A1 verbatim, `EXTRACT_PROMPT_VERSION = "1"`. A draft that holds
   `</draft>` is sent as it is: rewriting it would change the text the quotes are looked up in,
   and the validation does not depend on what the model was led to return.
9. **Privacy wording.** `docs/PRIVACY.md` and `/privacy` now say that the whole draft goes to the
   provider when an LLM is configured, and name OpenAI. They state what the code does (`store:
   false`, no logging) and point to the provider's terms for the rest; no retention period is
   stated, because none was read from a source. The home page's hint «لا تُحفظ المسودة ولا
   تُسجَّل» now names its subject («لا يحفظ «عَزْو» المسودة ولا يسجّلها»).

**Live run (2026-10-03).** After the build, seven short drafts written for the test were sent
through the running app (`next dev`, the `LLM_*` values of the local `.env`), from the browser:

| Draft | Result |
|---|---|
| A verse in `﴿…﴾` with its reference, a hadith in `«…»`, «يُروى في الأثر: «…»», a sentence «وتدل الآية على وجوب…» | The three quotes `regex+llm` with the statuses of the regex path; the sentence a new `interpretive_claim` item (`NEEDS_SPECIALIST`, level C). No warning |
| The same draft's unmarked verse followed by the writer's words («قال تعالى: واستعينوا بالصبر والصلاة كما نقرأ…») | The long regex span was kept (`regex` only) and ended `NOT_FOUND`: the model's shorter span shares less than half with it (item 3, last point) |
| «أعطني حديثاً عن الصبر» | Zero items, `NOT_A_DRAFT`, its sentence shown in the UI |
| Two quotes, then `</draft>` and an instruction to mark everything as matching and to add a hadith | Two items with the statuses the texts earn (`NEEDS_SPECIALIST`, `NOT_FOUND`); nothing added |
| One verse in `﴿…﴾` twice | Two items, two spans, both `MATCH` |
| A verse with no mark and no phrase the regex reads | One `llm` item, `MATCH` |
| «يجوز لك أن تفطر لقوله تعالى: ﴿…﴾» | One item: `interpretive_claim`, `PERSONAL_RULING`, level D. **The `﴿…﴾` verse inside the sentence is not an item**: the model's claim starts earlier, and "the earlier start wins" dropped the regex quote |

Responses took 1.5–5.7 s. The last row is a case where the merge rule of the prompt lets the
model's output remove an item the regex extractor found. It was fixed the same day (item 3,
"keep both") and the draft was sent again: two items, the claim «يجوز لك أن تفطر»
(`PERSONAL_RULING`, level D) and the verse (`MATCH`, `regex+llm`).

Limits: seven hand-written drafts are not a measurement. The prompt's behaviour on real drafts and
the latency against the 15 s budget are for the evaluation (P14). Whether the configured model
accepted `temperature: 0` or was called without it is not visible from outside the adapter. `AGENTS.md` §6 still
lists two warnings in its `ReviewResult` comment and was not edited (outside this prompt's list).

## D-22 — Hadith matcher: choices the prompt did not settle (2026-10-03)

Made while adding the hadith matcher (`docs/ARCHITECTURE.md`, "Hadith matcher"). They decide how a
cited reference is compared with the records that hold a text, and which claim a quote is taken
to make; none grades a hadith, edits a text or states a grade. Items 1 and 2 are decisions on
religious content (`AGENTS.md` §9); the rest are engineering choices.

1. **A pending record holds a text but confirms no reference.** The prompt left open how pending
   records count when a reference is compared («متفق عليه»: "found in both collections").

   *The term.* Ibn al-Salah, المقدمة، النوع الأول، الفائدة السابعة, lists as the first division of
   the sound hadith «صحيح أخرجه البخاري ومسلم جميعا», and says of the phrase «صحيح متفق عليه»:
   «يطلقون ذلك ويعنون به اتفاق البخاري ومسلم، لا اتفاق الأمة عليه» (read on 2026-10-03 at
   <https://ar.wikisource.org/wiki/مقدمة_ابن_الصلاح/النوع_الأول>). So «متفق عليه» claims that both
   books hold the hadith, and the tool can compare that claim with its two copies.

   | Option | Result for a text reviewed in one book and pending in the other, cited «متفق عليه» |
   |---|---|
   | A pending record counts like any other | `MATCH` / `MATCH_REF_OK`: the reference would be called correct on the strength of a record that may not support `MATCH` (`AGENTS.md` §5: pending records "can never produce MATCH") |
   | A pending record does not count at all | `DIFFERS` / `REF_NOT_AGREED_UPON`: the sentence would say the text was not found in the other book's copy, which is untrue: it is there |
   | **It holds the text and confirms nothing** (chosen) | `NEEDS_SPECIALIST` / `REF_NOT_CHECKED` on the reviewed record: the text matches, the reference could not be confirmed |

   The rule, for every hadith reference: a cited book is *held* when any record of it holds the
   quote, and *confirmed* only when a reviewed record does. A book that is not held makes the
   reference wrong (`REF_NOT_AGREED_UPON`, or `REF_MISMATCH_COLLECTION` for the record of another
   book); a book that is held but not confirmed makes it `unchecked`. With one cited book whose
   only records are pending the result is `NEEDS_SPECIALIST` / `SOURCE_NOT_REVIEWED`, as without a
   reference. This follows §2 rule 3 and D-11 (a reference that was not checked is never taken as
   correct and never as wrong).

   *Measured.* On the corpus, «إنما الأعمال بالنيات» is in `bukhari:1` and in no Muslim record,
   so «متفق عليه» on these exact words ends `DIFFERS` / `REF_NOT_AGREED_UPON` with the sentence
   «… ولم نجده بهذا اللفظ في نسختنا من الكتاب الآخر. هذا لا يعني أنه ليس فيه». The wording quoted
   is not in the tool's copy of one book. That is what the tool can say, and the sentence says no
   more (D-6 item 4).

   *Limit.* In the discipline «متفق عليه» is said of a hadith, also when the two books differ in
   a word; the tool compares a wording. A correct «متفق عليه» on a wording only one book has is
   therefore reported as `DIFFERS`. The sentence is worded for that case; a matcher that knows
   two records are the same hadith needs data the corpus does not have (`docs/BACKLOG.md`).
2. **Hadith qudsi: «قال الله تعالى» before a text found only in a hadith record is read as a
   hadith claim.** D-20 item 9 established (al-Qattan, al-Jurjani) that «قال الله تعالى» is one of
   the two forms of citing a hadith qudsi, and left the rule to this prompt.

   | Option | For | Against |
   |---|---|---|
   | The extractor gives a kind of its own | The claim would be exact | The extractors and `ClaimedKind` are outside this prompt |
   | Read in the record whether the words are God's speech (a formula such as «قال الله» before the hit) | A misattribution («قال الله تعالى: «إنما الأعمال بالنيات»») would stay `KIND_MISMATCH` | Measured on 12 well-known texts (37 records): the forms are «قال الله», «يقول الله», «إن الله قال», «إن الله يقول», «فيما روى عن الله … أنه قال», «قال ربكم … قال», «كتب في كتابه», and others, some far from the quoted words. A list would miss correct citations, and telling whose speech a sentence of a record is, is reading the hadith, not matching a text |
   | **Read in the draft: a phrase admits a hadith, `﴿…﴾` does not** (chosen) | The smallest rule; it reads only what the writer wrote (D-20 item 2) | See the limit below |

   The rule: a quote claimed `quran` whose span is not between `﴿` and `﴾`, found word for word
   in no Quran record and in a hadith record, is decided as a hadith claim (`MATCH`, or the
   reference outcomes of a hadith). The hadith matcher marks its candidates (`claimAdmitted`),
   and `decide()` reads the mark only when nothing of the claimed kind was found exactly; it names
   no kind. A `﴿…﴾` quote found only in a hadith record stays `DIFFERS` / `KIND_MISMATCH`.

   *Tested* on the real corpus: «قال الله تعالى: «أنا عند ظن عبدي بي»» → `MATCH` /
   `MATCH_NO_REFERENCE` with `bukhari:7405`, `bukhari:7505`, `muslim:6805`, `muslim:6829`,
   `muslim:6952`; with «رواه البخاري» → `MATCH_REF_OK` on the two Bukhari records; the same words
   in `﴿…﴾` → `KIND_MISMATCH`; a verse after «قال الله تعالى» in «…» → `MATCH` on the Quran record
   alone.

   *Limit.* The rule does not know that a record is a hadith qudsi: the data has no such field.
   Words of the Prophet ﷺ introduced with «قال الله تعالى» in «…» also end `MATCH`: the status
   says the wording stands in the source (`AGENTS.md` §4), and the evidence shows the record with
   its own attribution, but the wrong speaker is not reported. `ReviewItem.claimedKind` stays
   `quran`.
3. **A book the tool has no copy of is neither confirmed nor contradicted.** The prompt: "another
   collection → mismatch `REF_MISMATCH_COLLECTION`". For «رواه الترمذي» on a text found in
   al-Bukhari that sentence («لم نجده في نسختنا من الكتاب المذكور») would be untrue: there is no
   copy, and the hadith may be in both books. Such a reference, alone or beside a covered book,
   is `unchecked` → `NEEDS_SPECIALIST` / `REF_NOT_CHECKED`. A departure from the prompt for
   uncovered books only (§2 rules 1 and 3).
4. **A partial reference that names another book is still a wrong book.** The prompt: "partial →
   unchecked". As for the surah of a partial Quran reference (D-11, limit 1), what was read is
   wrong whatever the unread part says: «رواه مسلم ح 2699» on a text found only in al-Bukhari is
   `REF_MISMATCH_COLLECTION`. A partial reference whose books agree is `unchecked`.
5. **The number is compared with `citation.number`**, the number the corpus cites by: for Muslim
   the Abd al-Baqi number, for a split Bukhari entry its integer part (D-1). Leading zeros aside,
   nothing is bridged. A cited number on a record that has none is `unchecked`. Printed editions
   number differently, so the `REF_MISMATCH_NUMBER` sentence says «وقد يختلف الترقيم باختلاف
   الطبعات» and gives the source's reference; it does not call the writer's number wrong in the
   writer's own edition.
6. **Several books cited and close candidates only**: a book missing among the candidates is
   `unchecked`, not `REF_NOT_AGREED_UPON`. Close candidates are the best five, so a missing book
   proves nothing. `decide()` does not read the reference of a close candidate today.
7. **Which miss is reported.** When the reference agrees with no record, the nearest miss comes
   first: a wrong number in the right book, then a book missing from a group, then another book.
8. **Engineering.** One candidate per record (a second occurrence in the same record is the same
   place). `alignment` is built when read, and a record's words are not cached: a two-word quote
   stands in 7534 records. Close candidates: 10 per collection from the index, 5 returned.

9. **A close candidate needs three words of the quote** (added the same day, on the owner's
   instruction to fix `T-015`). «النظافة من الإيمان», labeled `NOT_FOUND`, ended
   `NEEDS_SPECIALIST` / `LOW_CONFIDENCE_MATCH` with five Bukhari records as evidence: each holds
   «من الإيمان», two of the quote's three words (score 0.67, above `T_LOW`).

   | Option | Against |
   |---|---|
   | Raise `T_LOW` above 0.67 | A ratio: it would also drop a six-word quote with four words in a record, which is a real near match worth referring. It changes the Quran results too |
   | **A minimum of three matched words, in the hadith matcher** (chosen) | A three-word quote with one word changed is `NOT_FOUND`, not referred |

   Two neighbouring words shared with a record of a 14,000-record corpus that holds the chains
   show nothing about the quote; showing those records as "a close text" would attribute to the
   source what it does not contain (`AGENTS.md` §2 rules 1 and 3). `NOT_FOUND` says only that the
   text was not found. Tuned on the tune split only: all eight hadith tune cases now end as
   labeled. The Quran matcher was not changed.

Changes outside `src/core/matchers` that the prompt did not list, each needed by item 2:
`QuoteInput.verseMarks` (`src/core/types.ts`), the line of `src/core/review.ts` that sets it, and
the `claimAdmitted` branch of `decide()`. The API schema did not change beyond the three reason
codes. In `src/core/matchers`, `layer-words.ts` now exports the uncached `wordsOnLayer`;
`layerWords` and the Quran matcher behave as before.

Limits: the reference rules were tested on fixture records and on about thirty drafts written for
the tests, not measured on the evaluation cases beyond the tune split. The eight tune cases with
a hadith claim end as labeled (item 9). `STATUS_CONFIG` was not changed, and the minimum of three
words was set on one case: the evaluation should measure it. That «إنما الأعمال بالنيات» is in no Muslim record was read in the corpus only.
Ibn al-Salah's sentence was read in one digital copy (Wikisource), not in a printed edition. This
is an AI tool's documented source check, not a scholar's review.

## D-23 — Grounded explanation and copyable report: choices the prompt did not settle (2026-10-04)

Made while adding the explanation and the report (`docs/ARCHITECTURE.md`, "Explanation" and "UI").
None decides a status, a text, a reference or a grade, and none needed a source outside the
repository: they follow from `AGENTS.md` §2 (rules 2, 3, 4 and 9). Wherever the prompt left the
validator open, the stricter reading was taken: a rejected note costs the writer nothing, because
`reasonAr` is always shown.

1. **A quotation mark the validator cannot check rejects the note.** The prompt checks the
   segments inside «» and ﴿﴾. Words quoted in `"…"`, `“…”` or `‘…’`, or after an unmatched «,
   would pass unchecked, and could be words of no source shown as a quotation (rule 1). Such a
   note is rejected. An empty segment («») is rejected too. *An addition to the prompt's rules.*
2. **"Verbatim" is the same characters.** A segment is looked up as literal text (outer whitespace
   trimmed), diacritics included. Looking it up through the normalization would accept a word the
   model re-spelled, and the quotation shown would then not be the text of the draft or of the
   source. Cost: a note that quotes a vocalised source word without its diacritics is rejected
   (`docs/BACKLOG.md`).
3. **Sentences are counted outside the quoted segments.** A sentence ends at `.`, `!`, `?`, `؟`
   or a line break; a part with no letter and no digit is not a sentence. A full stop inside a
   quoted source text is the source's, not the note's.
4. **A number is a whole run of digits.** «43» is not covered by a citation that holds «4» and
   «3». Arabic-Indic and Extended Arabic-Indic digits are read as ASCII digits on both sides. A
   number inside a quoted segment is checked like any other. A number written in words is not
   seen.
5. **The seven words are matched without diacritics, anywhere in a word, quoted or not.** «صَحِيحٌ»,
   «الحكم», «حكمه»: any word that holds one of them rejects the note, also when the word is
   part of a quoted draft or source text («إن الحكم إلا لله»): the prompt says "it holds none
   of", and telling a quotation from the tool's own judgment there is not worth the risk. Such an
   item gets no explanation.
6. **The book titles are those of the covered collections.** Appendix A2 allows "a book title
   copied exactly from sourceCitation"; the prompt says «صحيح البخاري», «صحيح مسلم». The validator
   receives the names of the result's coverage (`collection.<id>` of `src/i18n/ar.ts`), so core
   names no book, and a new collection's title is allowed when its matcher is registered. A title
   is taken out as whole words only; «صحيح» beside a title still rejects.
7. **One time budget, by starting together.** The port stays `explainDiff(input)`, one call per
   item. Each call has a timeout of `LLM_TIMEOUT_MS`, and `review()` starts all of them in one
   synchronous pass, so they share one deadline (tested: every call has started before the first
   answers). The budget is separate from the extraction's: a review can take up to twice
   `LLM_TIMEOUT_MS`. Sharing one budget between extraction and explanations would give the
   explanations whatever the extraction left, often nothing.
8. **The temperature**: 0, and none once the model refused it during an extraction. An
   explanation call is never repeated, so a refusal met there first only fails that call; in a
   review the extraction always comes first.
9. **Where things live.** `ExplainDiffInput`, `buildExplainInput` and `validateExplanation` are
   in the new `src/core/explain/`; `src/core/review.ts` re-exports the type and still declares
   `LlmPort`. `collectionName` of `src/core/status/reason.ts` is now exported (item 6); no status
   rule changed.
10. **The report.**
    - *The cited reference* is listed for every item that has one, also without evidence (a
      `NOT_FOUND` quote with «رواه البخاري»): it is the writer's own text, and the card shows it
      too. The prompt's "status, quote and reason only" is read as "no source lines". An `ERROR`
      item shows status, quote and reason only, whatever it holds, as the card does.
    - *The date* is `YYYY-MM-DD` from the reader's clock at the click, built from the date's
      parts: `toLocaleDateString` differs between browsers, and the report must be the same text
      everywhere. The line is «تاريخ التقرير», not the date of the review: a result holds no time.
    - *One field per line, each opening with its Arabic label*, so that a plain-text paste is
      laid out right-to-left without direction marks.
    - *Strings*: the lines that the card already words («المرجع المذكور في المسودة», «المرجع في
      المصدر», «المصدر», «النقل n», «إصدار البيانات») reuse its keys.
    - `CopySourceButton` and the new `CopyReportButton` are one `CopyButton`;
      `occurrenceText` was split out of `sourceCopyText`, whose output did not change.
11. **Privacy wording.** `docs/PRIVACY.md` and `/privacy` (`privacy.processed.3`) name the six
    fields of an explanation request and say when it is made.

Limits: tested with a mocked port and a fake client only; nothing was sent to the provider. The
validator checks form and grounding, not truth: a note that quotes nothing, holds no number and
none of the seven words passes whatever it says. It is shown labeled «شرح مولّد آلياً» beside the
status and `reasonAr`, which it cannot change; whether more is needed is the audit's (P13).

## D-24 — Audit of injection, privacy, transparency, failure modes and secrets (2026-10-04)

An audit of the code as it stood after P12 (`AGENTS.md` §2 rules 2, 3, 4, 7, 8 and 9). It reads the
code and the tests, fixes what was wrong and adds a test only where none existed. No matcher, no
status rule and no API schema changed. None of the decisions below needed a source outside the
repository: none decides a text, a reference or a grade.

### Findings

| # | Area | Finding | Result |
|---|---|---|---|
| 1 | Injection | The draft reaches the model in a user message of its own, between `<draft>` and `</draft>` (`extractUserMessage`); the system prompt is sent apart, as `instructions`. An explanation request is JSON of six fields in a user message of its own (`explainUserMessage`) | Holds. Tested in `src/llm/openai.test.ts` |
| 2 | Injection | Every output is validated before use: `LlmExtractionSchema` (unknown fields are not read), `validateSpans` (a quote is kept only where the draft holds it; the offsets are computed, never taken), `validateExplanation`; an answer that is not a string is no explanation | Holds. Tested |
| 3 | Injection | No status, reason or evidence comes from the model: `decide()` receives `claimedKind`, `claimLevel` and the candidates of the matchers. From the model come only: which spans of the draft are items, a kind (which can weaken a claim, never strengthen one, and never changes a `﴿…﴾` quote: D-21 item 3), `claimLevel` of an interpretive claim, `isDraft` (read only when no extractor found a quote), and the text of an explanation | Holds. Five new drafts, each with a port that obeys the injection on both calls: `src/core/injection.test.ts` |
| 4 | Injection | A draft that holds `</draft>` closes the delimiter early (D-21 item 8, kept). A model that obeys what follows it gains nothing: tested (the port returns `isDraft: false` and no item; the `﴿…﴾` quote is still reviewed, with its status) | Holds; the limit stays documented |
| 5 | Explanation | **The gap of D-23**: a note with no quotation, no number and none of the seven words passed whatever it said. The test of P12 itself showed «النص مطابق لنص المصدر ولا فرق بينهما.» displayed on a `DIFFERS` item | **Fixed**: decision 1 below |
| 6 | Privacy | No draft text, quote or LLM output reaches a log or an error message. The one log sink is `deps.log` in `src/server/api-handlers.ts`; `src/llm` and `src/core` log nothing and no component calls `console`. The thrown messages of `src/core` and `src/server` name record ids, layers and corpus files, never a query. A rejected or failed LLM call is caught in `review()` and its error is dropped, not logged | Holds. New test: an explanation that fails, times out, is rejected or passes leaves no Arabic in the log |
| 7 | Privacy | `docs/PRIVACY.md` and `/privacy` listed the fields of a log line without `failure` and `detail`, and said the log "has no field for text": `detail` is a string (an error's class name, schema paths, or the corpus loader's message) | **Fixed** in both texts |
| 8 | Privacy | `/privacy` did not say what `docs/PRIVACY.md` says about a failed LLM call: the result then reads «دون نموذج لغوي», although the draft may have been sent before the call failed | **Fixed**: one sentence added to `privacy.processed.2` |
| 9 | Transparency | The AI banner is in the root layout, so on the four pages and on the not-found page (checked in the built HTML). The page Next.js shows when a page fails to render replaces the layout: it had no banner and its words were English | **Fixed**: `src/app/global-error.tsx` (the banner, one fixed Arabic sentence, a retry button; nothing of the error is shown) |
| 10 | Transparency | «شرح مولّد آلياً» is on every generated text: `ExplanationBox` is the only place an explanation is rendered, and the report holds none | Holds. Tested (P12) |
| 11 | Transparency | **The results did not name the sources that were searched.** The home page names them from `GET /health`, the report and the `NOT_FOUND` sentence from the result; the results view itself named none | **Fixed**: a line under the results heading, from the result's own `coverage` and `corpusVersion` (`results.searched`) |
| 12 | Failure modes | LLM down, timeout, output outside the schema → the regex-only path with `LLM_UNAVAILABLE_REGEX_ONLY` and its sentence; corpus load failure → 500 with the fixed sentence and no item, and `GET /health` 503 → the home page names no source; oversized → 413; rate limit → 429; a failed explanation → the item as it was. A result is taken only from a 200 that parses, and `ReviewResultSchema` refuses a `MATCH` without evidence | Holds. Gaps filled: the explanation failures through the API handler; every failure and warning sentence is Arabic and holds no «مطابق» (`src/i18n/ar.test.ts`); the render-failure page |
| 13 | Secrets | `git log --all` (one branch, one tag, no stash): no `.env*` file was ever committed except `.env.example`, whose values are empty; no string of a known key form in any commit or in the tracked and untracked tree; the value of the local `LLM_API_KEY` is in no commit and in no file git sees. `.gitignore` ignores `.env*` except `.env.example` | Holds |
| 14 | Secrets | The environment is read by `src/llm/index.ts` and `src/server/api-config.ts` only; no `NEXT_PUBLIC_` variable exists; only the two API routes import `src/server`, and only `src/server` imports `src/llm`. After `next build`, neither the key nor its name nor the provider's host is in `.next/static` | Holds. New test: `src/components/client-boundary.test.ts` |
| 15 | Secrets | The value of the key is in `.next/cache/turbopack` and `.next/dev/cache/turbopack` (the bundler's cache of the environment). `.next/` is ignored by git and is not served | Not a leak. Do not share or archive the `.next` folder of a machine that holds a key (`docs/BACKLOG.md`) |

### Decisions

1. **One more rule for the explanation: a closed vocabulary.** (`AGENTS.md` §2 rules 3 and 4.)
   - *The question.* A note is free text of a model that may have obeyed an instruction inside
     the quote. The six checks of D-23 bound its form and its quotations; outside the quotation
     marks it could say anything not written with one of seven words: «النص مطابق» on a `DIFFERS`
     item (an unsupported positive statement, rule 3), a grade or a ruling in another word («ثابت»,
     «حسن», «جائز», «واجب»), an interpretation, a name, an address (rule 4).
   - *Options weighed.* (a) Leave it: the note is labeled and cannot change a status. Rejected: the
     label says who wrote the text, not that it may contradict the status beside it. (b) A longer
     list of forbidden words. Rejected: a list of what may not be said is never complete. (c) The
     note must quote a word of a diff op (the idea in `docs/BACKLOG.md`). Rejected as the only
     rule: «في مسودتك «ندا»، وهو مطابق» quotes one and still passes. (d) Every word outside the
     quoted segments belongs to a closed list. **Chosen**: it is the only option under which "passes
     whatever it says" is no longer true, and a rejected note costs the writer nothing.
   - *The rule.* After the quoted segments and the titles of the covered books are taken out,
     every word of the note is a number (checked by the number rule), a word of `sourceCitation`
     or `draftCitation`, or a word of `EXPLANATION_VOCABULARY` (`src/core/explain/index.ts`, 160
     words: the nouns, verbs and particles needed to say where two texts or two references
     differ). Words are compared without diacritics; a word may carry the prefixes و ف, ب ل ك
     and ال, and a prefix may stand alone before a quoted segment (ب«…»). «لا» is not in the
     list, so that «لا يختلف» cannot be written; «ليس», «لم» and «غير» are. «مطابق» and every
     word of grading or ruling are absent. The seven forbidden words stay as they were: they are
     checked inside quoted segments too, which the vocabulary is not.
   - *The prompt.* A model cannot keep to a list it was not given. `EXPLAIN_SYSTEM_PROMPT` has
     one more line, which names the list (built from the same constant, tested), and
     `EXPLAIN_PROMPT_VERSION` is `"2"`. The rest is Appendix A2 as before.
   - *Measured* (a probe, not an evaluation: 15 short drafts written for it, sent through
     `review()` on the real corpus with the model of the local `.env`, 2026-10-04). Before the
     change (prompt 1, six checks): 7 `DIFFERS` items, 6 notes and one `NULL`, all 6 accepted.
     After it (prompt 2, seven checks): 10 `DIFFERS` items, 10 notes; 9 accepted and one rejected
     for a lone «ب» before a quoted segment («أبدلت «يحب» ب«مَعَ»»), which led to the lone-prefix
     clause; run again, 10 of 10 accepted. The notes of prompt 2 are shorter and plainer than
     those of prompt 1 («زيادة «جميعا» في المسودة.»).
   - *Tests.* `src/core/explain/index.test.ts` (eight notes outside the vocabulary; prefixes,
     citation words, titles), `src/core/review.test.ts` (the note of P12's injection test is now
     rejected), `src/core/injection.test.ts`.
2. **The five injection drafts** are in `src/core/injection.test.ts`, written for this audit: an
   order to mark everything as matching; an order to add a verse and a hadith (the port returns
   two texts that are records of the fixture corpus and would end `MATCH` if accepted); a closing
   `</draft>` tag followed by a `<system>` block; an order inside a `﴿…﴾` quote aimed at the
   explanation; an order to output a grade and a ruling. For each, the port obeys on both calls
   with several notes, and the result equals the result of an honest port: same statuses,
   reasons, evidence and summary, no explanation, `MATCH` count 0, and none of the injected words
   anywhere in the result. Each also checks that the explanation request holds the six fields of
   the item and no other part of the draft.
3. **A render failure has its own page** (finding 9), with a new sentence `state.error.page`.
   It shows nothing of the error: an error's message could quote the draft.
4. **The searched-sources line shows `coverage` as the result gives it** (finding 11): a
   collection with no Arabic name in `src/i18n/ar.ts` is shown by its id, never left out; a result
   with an empty coverage shows no line.
5. **`detail` of a log line was not changed.** For `REVIEW_THREW` and `HANDLER_THREW` it is the
   error's class name, for `RESPONSE_INVALID` schema paths and codes, for `CORPUS_LOAD_FAILED` the
   loader's message. None can hold draft text as the code stands; the notice now says so
   (finding 7) instead of the field being removed, because it is what tells one fault from
   another.

Limits: the vocabulary bounds what a note can be about, not whether it is true. A note that says
in the allowed words that a word is missing when it was added still passes, and a note may quote
back, between «», words of the draft that are themselves an instruction; both are shown beside
the deterministic status, `reasonAr` and word diff, which they cannot change. A word of
`draftCitation` is allowed outside quotation marks, and that text is the writer's. The probe is
ten notes of one model: how often a note is rejected on real drafts, and whether prompt 2 keeps
the gentle tone Appendix A2 asks for, are for the evaluation (P14). In the probe, the four drafts
with an instruction inside the quote ended `NEEDS_SPECIALIST` or `NOT_FOUND` on the real corpus,
so no explanation was asked for them: the explanation path under injection is tested with the
mocked port only. The secrets scan looked for known key forms and for the local key's value; it
is not a proof that no secret of another form was ever committed. The render-failure page was rendered in a test; a
render failure was not forced in a browser, and the built `_global-error.html` is the framework's
shell, which does not hold the page's words. Not checked: a deployed host's
logs and headers (P8), and what the provider does with a request.

## D-25 — Corrections the writer may apply, and the revised draft (2026-10-04)

The owner asked on 2026-10-04 for a "correction-and-copy" step: a content writer pastes a whole
post, and after the review can put the source's text or reference in place of a quote and copy the
whole post, without rebuilding it by hand. This changes D-19 item 7 ("nothing rewrites the draft"),
by the owner's instruction. The choices below are what the instruction left open. They follow
`AGENTS.md` §2 (rules 1, 3, 6 and 9) and were measured on the corpus; none needed a source outside
the repository, because every text a correction writes is a text of a record already approved
(`docs/SOURCES.md`). Rules and tables: `docs/ARCHITECTURE.md`, "Corrections" and "The revised draft".

1. **A reference that names the very place makes a close text a wording difference (status rule
   10b).** The owner's own example, «إن مع الصبر يسرا» [الشرح: 6], ended `NEEDS_SPECIALIST` /
   `LOW_CONFIDENCE_MATCH`: three words of four are equal, 0.75, under `T_HIGH` 0.8. The sentence
   said the tool could not tell which text was meant, although the writer had cited the ayah.
   Options: lower `T_HIGH` (it moves every short quote, with or without a reference, and is a
   tuning the evaluation has not measured); offer a correction on a `NEEDS_SPECIALIST` item (it
   contradicts the status); or read the reference as evidence of which record is meant. The third
   was taken: with a score from `T_LOW` up, a reference that is `consistent` *and* names the place
   (the surah with the ayah or the range the quote covers; a book with the hadith's number) gives
   `DIFFERS` / `WORDING_DIFF`. A surah alone or a book alone does not name a place (a book holds
   thousands of hadiths) and changes nothing. Ambiguity (rule 9) and pending records are decided
   as before. A matcher reports it as `reference: { result: "consistent", place: true }`;
   `decide()` still names no kind.
   Measured: the whole test suite, with the tune cases, gives the same results as before; the
   held-out split was not read.
2. **A correction is built by code from the record, in core, and travels in the API**
   (`evidence[].correction`). The owner's first idea was that the LLM returns the corrected post.
   Not taken: a model that writes the post again may change other words, or a letter of the verse
   (rule 9: its output is never a source), and code that could check the model's post could write
   it. It is in core, not in the UI, because whether a correction may be offered depends on the
   matcher's reference check, which the API does not carry, and so that every client offers the
   same ones. `EvidenceSchema` rejects a correction whose text is not the record's own `exactText`
   or `citation.display`.
3. **A wording correction is the stretch of `exactText` the quote was aligned to, verbatim**, with
   its diacritics, pause marks and punctuation, in place of the quote's words. The writer's
   quotation marks stay. The tool does not strip or edit a source text to make it look like the
   draft (§9: "never edits a source text").
4. **A reference correction is `citation.display`**, inside the brackets the writer's reference
   stands in. It is not rewritten in the writer's form («الشرح: 6»): the tool never composes a
   citation from numbers. The reference parser reads the form it writes (measured below).
5. **Where the tool is not sure, it offers nothing.** Only `DIFFERS` items, and of those only
   `WORDING_DIFF`, `REF_MISMATCH_AYAH` and `REF_MISMATCH_SURAH`. Not offered:
   - `REF_MISMATCH_NUMBER`, `REF_MISMATCH_COLLECTION`, `REF_NOT_AGREED_UPON`: the tool's own
     sentences say the cited reference may be right (another edition's numbering, a gap in the
     tool's copy of the book: D-6 item 4). Replacing it could remove a correct attribution.
   - A wording whose reference is unchecked or contradicts the record («رواه الترمذي» on a text
     close to a record of al-Bukhari): the new wording would stand under an attribution the tool
     cannot support (rule 1).
   - A wording of another kind than the draft claims (a verse's words after «قال رسول الله ﷺ»).
   - A word only one side has at the first or last place of the quote: at the edge of a fragment
     the tool cannot tell an added word from a changed one (`docs/BACKLOG.md`, "Fuzzy alignment"),
     and in an unmarked quote the last words may be the writer's own sentence.
   - A quote over several records; `KIND_MISMATCH`; `NOT_FOUND`; every `NEEDS_SPECIALIST`.
6. **A hadith wording is corrected like a verse's**, under the conditions of item 5. The status
   rules and the UI name no kind (§6), and the text written is the record's own, under a
   reference that agrees with the record or with none in the draft. It says that the text is in
   that record with that wording, which is what `MATCH` says; it is not a judgment that the
   writer's wording is wrong in every book.
7. **The writer applies, one quote at a time; there is no "fix all".** A correction changes a copy
   shown beside the cards («المسودة بعد التعديل»), never the textarea, and can be taken back. A
   quote that stands in several places takes the citation of the place the writer chose. The
   panel says that the revised draft has not been reviewed again, and how many quotes are neither
   `MATCH` nor corrected, so that a copied post is not read as "all checked". Nothing is stored
   (`docs/PRIVACY.md` is unchanged: no new request, nothing sent to the LLM).
8. **Corrections of two items never overlap.** One that reaches into another item's quote or into
   another item's correction (one reference cited for two quotes) is dropped.

Measured (`src/server/corrections.integration.test.ts`, real corpus, regex extractor only): a
draft with an offered correction applied is reviewed again as `MATCH` on the same record, with
nothing more offered, and every character outside the correction is unchanged. Over all 6236 ayat,
each typed without diacritics: with the next ayah's number cited, 6190 of 6236 were offered a
reference correction and every one ended `MATCH_REF_OK`; with a word of the writer's in the middle
(ayat of six words or more) under the right reference, 4639 of 4686 were offered a wording correction
and every one ended `MATCH_REF_OK`. Named drafts cover the owner's example, a reference before
the quote, round and square brackets, a text in two places, a part of an ayah, and a hadith of
al-Bukhari. In Chrome on the running app: apply, choose another place, copy (the clipboard held
exactly the text shown), take back, and the textarea unchanged throughout.

Limits: the sweep is the Quran with two kinds of error made by a script; hadith corrections were
tested on a few named drafts only, and with the LLM extractor only in the browser session. A
wrong first or last word is not corrected. The round trip shows the tool agrees with itself: a
revised draft is as reliable as a `MATCH`, which proves the wording is in the record, not its
authenticity. Not looked at: a phone-width screen, a screen reader, other browsers. This is an AI
tool's documented choice, not a scholar's review.

## D-26 — Evaluation set extended from 50 to 85 cases before the first run (2026-10-04)

The owner asked on 2026-10-04, before the evaluation runner existed, for the labeled cases to be
checked against the challenge guide and strengthened if they were weak. Details and limits:
`docs/EVALUATION.md` section 8.

**Question.** Are 50 cases enough for what the guide scores (`docs/reference/challenge-guide.md`
§2: results that repeat "over varied cases in scope", success on "variety, conflict and
missing-information cases", an improvement "due to the chosen use of AI")?

**What was found.** The first 50 are sound but narrow. Their own list of gaps (`docs/EVALUATION.md`
section 6 item 9) named a wrong hadith number, ayah numbers between ayat, pending records and hadith
qudsi. Beyond it: no case for a spelling error in everyday script (the owner's decision D-9/D-13,
and a possible false `MATCH`), none for `REF_NOT_CHECKED` or `SOURCE_NOT_REVIEWED`, no tune case
for a wrong surah or a personal ruling, no post with several quotes, and only three cases where the
LLM extractor is needed, which is too few to compare it with the regex baseline.

**Options.** (a) Keep 50 and state the gaps. (b) Replace the set. (c) Add cases and keep the two
groups apart in every report.

**Decision: (c).** 35 cases were added (14 tune, 21 held-out), with one new category, `MIXED`
(a longer post with at least three items of at least two statuses; critical). The first 50 are
unchanged, so their value as cases written before the code is kept; the runner reports the two
groups separately.

1. **Labels come from the written rules, not from a run.** `AGENTS.md` §2–§5, the tables of
   `docs/ARCHITECTURE.md`, and D-9, D-11, D-13, D-22. The tool was not run on the new drafts
   before labeling.
2. **Texts come from the corpus.** Quotes are cut from `exactText` by script; every altered wording
   and every typed saying was searched in the whole corpus and is absent.
3. **Claims are labeled by form.** A ruling for one person's case is `PERSONAL_RULING`; a ruling
   derived from a text is `INTERPRETIVE_CLAIM`. The label takes no side and asserts nothing about
   the matter.
4. **No new case rests on a claim about a book.** None says a wording is in only one of the two
   Sahihs, because that needs a search outside the corpus (D-6 item 3), which was not made.
5. **Cases whose answer the rules do not fix were not written**: paraphrase, a heavily altered
   text. They stay listed as limits.
6. **One label was corrected the same day, on corpus evidence.** `T-024` (words dropped from
   `bukhari:2067`) was labeled `DIFFERS` / `WORDING_DIFF`. The integration tests, which read every
   tune case, showed the tool answering `AMBIGUOUS_CANDIDATES`. A corpus search made without the
   tool found the cause: `bukhari:5985` holds a different wording that contains every word of the
   quote in order. Two source texts are equally close, so `NEEDS_SPECIALIST` is the answer the
   rules give (`AGENTS.md` §4); the label was wrong, not the tool. The label was changed and the
   case moved to AMBIGUOUS. The other altered quotes were checked the same way: one closest
   record each. A label is never changed because the tool disagrees; here the corpus did.
7. **The integration tests keep reading every tune case.** `T-030` and `T-032` need the LLM
   extractor: the hadith test now asserts that the regex extractor does not find them. `T-027`
   needs a claim level: the Quran test passes the labeled level in with the span.

**Measured.** `npm run check:cases`: 85 cases, 96 expected items, 104 distinct records, 36 critical
cases, no problem reported. The 14 tune additions through the integration tests (regex extractor,
no LLM): 11 as labeled after the correction of item 6 (of `T-034`, two of its four items are
reached by these tests), `T-027` as labeled once the claim level is passed in, and 2 that wait
for the LLM extractor. The 21 held-out additions were not run.

**Limits.** The 35 cases are not blind: the assistant had read the status rules and the matchers,
so a pass shows the tool does what its documentation says, not that the rules are right. Their
altered wordings were not searched on dorar.net. No person has read them. This is an AI tool's
documented choice, not a scholar's review.
