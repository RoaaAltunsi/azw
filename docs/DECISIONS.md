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
