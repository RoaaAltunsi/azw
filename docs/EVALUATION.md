# Evaluation set

The labeled cases Azw is measured against: 85 cases in two groups.

- **The first 50** (`T-001`–`T-020`, `H-001`–`H-030`) were written on 2026-10-02, before any matching
  code existed (there was no `src/` directory), so the matching logic cannot have been tuned to them.
- **35 more** (`T-021`–`T-034`, `H-031`–`H-051`) were added on 2026-10-04, after the pipeline was
  built, to cover what the first 50 left out. They are not blind in the same way: section 8 says
  how they were made and how to read results on them. Results are reported for the two groups
  separately.

The files:

- `eval/cases/tune.jsonl` — 34 cases. Thresholds and rules may be tuned on these only.
- `eval/cases/heldout.jsonl` — 51 cases. Never used for tuning; reported as the result.
- `scripts/check-cases.ts` — checks the labels against `data/corpus` (`npx tsx scripts/check-cases.ts`
  or `npm run check:cases`). The rules are in `scripts/lib/cases.ts`, tested in `scripts/lib/cases.test.ts`.

Corpus version at labeling time: `p0-a6d2d36b84e8` for the first 50, `p2-e2bfaf5a3ad2` for the 35
added (`data/corpus/manifest.json`).

**Held-out exposure (2026-10-03).** While the reference parser was being built (P3), the AI
assistant printed the text around the quotes in both `tune.jsonl` and `heldout.jsonl` to see which
citation forms writers use. No test uses a held-out text and no rule was written for a held-out
case, but the held-out split is no longer fully unseen for the reference parser
(`src/core/references`). Results on reference parsing and attachment should be read with that in
mind. The held-out drafts have not been read for any other part of the pipeline.

## 1. Status of the human review

**Not reviewed by a person.** The cases were drafted by Claude (AI assistant) from corpus records.
The same assistant then checked them against outside sources (section 7) and, on 2026-10-03, closed
the points of section 6 under the owner's delegation (`docs/DECISIONS.md` D-6, D-16). That is not a
specialist review: an AI tool is not a qualified scholar, and it checked its own work. No person has
read the cases. Results measured on them must be reported with that sentence. The two human rows
below are not open decisions; they are checks a person can still add.

| Step | Scope | Reviewer | Date | Result |
|---|---|---|---|---|
| AI source check | All 50 cases, against Tanzil, dorar.net and published fatwa pages | Claude (AI assistant), at the owner's request | 2026-10-02 | Done. No label changed; 7 notes extended. Findings in section 7 |
| Points in section 6 | 9 points | Claude (AI assistant), under the owner's delegation | 2026-10-03 | Closed. No label changed. Decisions in `docs/DECISIONS.md` D-6 and below each point |
| Cases added | 35 cases (section 8) | Claude (AI assistant), at the owner's request | 2026-10-04 | Written from corpus records and checked against the corpus by script. No outside source was searched for them |
| Read all 85 cases | `tune.jsonl`, `heldout.jsonl` | — | — | Not done by a person |
| Specialist review of the critical cases | 36 cases: WORDING_ERROR, WRONG_REFERENCE, ADVERSARIAL, MIXED | — | — | Not done (no specialist was available) |

Record here who reviewed, on what date, against which printed or online reference, and every label
that was changed.

## 2. Case format

One JSON object per line:

```json
{
  "id": "H-016",
  "split": "heldout",
  "category": "WRONG_REFERENCE",
  "critical": true,
  "draft": "…",
  "expected": [
    { "quote": "<exact substring of draft>", "kind": "quran", "status": "DIFFERS",
      "recordIds": ["quran:2:186"], "reasonCode": "REF_MISMATCH_AYAH" }
  ],
  "notes": "…"
}
```

| Field | Meaning |
|---|---|
| `id` | `T-001`…`T-034` (tune), `H-001`…`H-051` (held-out) |
| `critical` | `true` for WORDING_ERROR, WRONG_REFERENCE, ADVERSARIAL and MIXED |
| `draft` | The writer's input: 1–4 sentences in the style of a da'wah post |
| `expected[].quote` | The quoted span. An exact substring of `draft` that occurs once |
| `expected[].kind` | What the draft presents the quote as (`ReviewItem.claimedKind`): `quran`, `hadith`, `unclear_attribution`, `interpretive_claim`. A verse introduced with «قال رسول الله ﷺ» has kind `hadith` |
| `expected[].status` | `MATCH`, `DIFFERS`, `NOT_FOUND` or `NEEDS_SPECIALIST` |
| `expected[].recordIds` | See below. Empty for `NOT_FOUND` and for claims. For `SOURCE_NOT_REVIEWED` and `REF_NOT_CHECKED`: the records that hold the text |
| `expected[].reasonCode` | See section 4 |
| `expected[].contentLevel` | Optional. Set only on interpretive and ruling claims (`C` or `D`) |
| `expectScopeMessage` | Optional. `true` = the input is a request, not a draft: zero items plus the scope message |
| `notes` | What the case tests. For altered text: the source record, the original wording and the exact alteration |

Two fields were added to the format given in the task: `expectScopeMessage` (a request has no items
to carry the expectation) and `contentLevel` (to tell a level C claim from a level D ruling).

**Meaning of `recordIds`.**

- Quran: exactly the ayat the quote covers, consecutive and in order.
- Hadith: every corpus record that contains the wording, found by a diacritic-insensitive search at
  labeling time. The first id is the record the text was copied from. Repeated narrations are one
  result, so a run is right when its evidence includes at least one listed record.
- For `DIFFERS`, the records hold the *correct* text or reference the writer should be pointed to.

## 3. Categories

| Category | Cases (tune + held-out) | Critical | Expected |
|---|---|---|---|
| EXACT | 16 (7 + 9) | no | `MATCH` |
| ORTHOGRAPHIC | 8 (4 + 4) | no | `MATCH`; `DIFFERS` here is a failure |
| WORDING_ERROR | 12 (4 + 8) | yes | `DIFFERS` |
| WRONG_REFERENCE | 12 (5 + 7) | yes | `DIFFERS` |
| NOT_IN_SOURCES | 11 (4 + 7) | no | `NOT_FOUND`, never worded as false or fabricated |
| AMBIGUOUS | 14 (6 + 8) | no | `NEEDS_SPECIALIST` |
| ADVERSARIAL | 8 (3 + 5) | yes | No `MATCH` for anything unsupported; a request gives zero items and the scope message |
| MIXED | 4 (1 + 3) | yes | A longer post with at least three items of at least two statuses; each item as labeled |

Of these, the first 50 are 10, 6, 8, 8, 8, 5, 5 and 0 (20 tune + 30 held-out). Their 20/30 split of
6, 8, 8 and 8 does not divide evenly (2.4, 3.2, 3.2, 3.2 for tune); the spare tune case went to
ORTHOGRAPHIC, the largest remainder. The 35 added are described in section 8.

The cases adapted from the package's test examples:

- «سؤال يتضمن آية منقولة بخطأ» → `H-010` (a question containing الذاريات 56 with two words swapped).
- «أعطني حديثاً يثبت هذا الكلام» → `T-019` (a request; zero items and the scope message).
- «أنا في دولة كذا، هل يجوز لي فعل كذا في زواجي؟» → `H-048` (a personal question; zero items and the
  scope message) and `H-040` (a writer who answers such a question: `PERSONAL_RULING`).

## 4. Reason codes

Codes named in the build plan: `MATCH_NO_REFERENCE`, `WORDING_DIFF`, `REF_MISMATCH_AYAH`,
`REF_MISMATCH_SURAH`, `REF_MISMATCH_COLLECTION`, `REF_MISMATCH_NUMBER`, `REF_NOT_AGREED_UPON`,
`KIND_MISMATCH`, `NO_RECORD_IN_COVERED_SOURCES`.

Codes settled when `src/core/status` was written (P5); the list lives in
`src/core/status/reason-codes.ts`. The four names that were provisional here were kept.

| Code | Status | Used for |
|---|---|---|
| `MATCH_REF_OK` | `MATCH` | Text matches and the cited reference is consistent |
| `UNCLEAR_ATTRIBUTION` | `NEEDS_SPECIALIST` | «في الأثر», «قال بعض السلف» |
| `INTERPRETIVE_CLAIM` | `NEEDS_SPECIALIST` | A meaning or ruling derived from a text (level C) |
| `PERSONAL_RULING` | `NEEDS_SPECIALIST` | A ruling for a personal case (level D) |
| `REF_NOT_CHECKED` | `NEEDS_SPECIALIST` | Text matches, but the cited reference was not read in full (`docs/DECISIONS.md` D-11) |
| `LOW_CONFIDENCE_MATCH` | `NEEDS_SPECIALIST` | Best candidate between `T_LOW` and `T_HIGH` |
| `AMBIGUOUS_CANDIDATES` | `NEEDS_SPECIALIST` | Two or more close candidates with different texts |
| `SOURCE_NOT_REVIEWED` | `NEEDS_SPECIALIST` | The text was found only in records that are still pending |

Of the last four, `REF_NOT_CHECKED` and `SOURCE_NOT_REVIEWED` are used by cases added on 2026-10-04;
`AMBIGUOUS_CANDIDATES` is used by `T-024`; no case uses `LOW_CONFIDENCE_MATCH` (section 8, limits).
`scripts/lib/cases.ts` takes its list from `src/core/status`,
which since P11 holds the hadith matcher's `REF_MISMATCH_COLLECTION`, `REF_MISMATCH_NUMBER` and
`REF_NOT_AGREED_UPON`.

`REF_MISMATCH_NUMBER` is used by `T-021`, `H-031`, `H-032` and `H-051`.

## 5. How the texts were produced

- Every quote that comes from a source was cut out of the record's `exactText` by a throwaway
  script, not typed from memory. EXACT quotes are character-for-character copies; the checker
  verifies this.
- Diacritic-free quotes are the same cut with the marks removed (tashkeel, dagger alif, pause marks)
  and, for hadith, the source's commas. Letters are unchanged unless the notes say so.
- Altered quotes (WORDING_ERROR, and the misquoted verse in `T-020`) were made from the cut by one
  scripted edit. The notes give the source record, the original wording and the edit. Each altered
  wording was searched for in the whole corpus and occurs nowhere.
- Every unaltered Quran quote that maps to a single ayah occurs in that ayah only (searched). The
  two multi-ayah quotes (`T-004`, `H-003`) were not searched across ayah boundaries.
- NOT_IN_SOURCES sayings and the sayings in AMBIGUOUS and ADVERSARIAL cases were typed by the
  labeler. They are user-side input. Each was searched for in the corpus (whole and in parts) with
  diacritics removed and أ/إ/آ, ة/ه, ى/ي folded; none was found.
- The Uthmani-script text in `T-007` was fetched from `api.alquran.cloud` (edition `quran-uthmani`,
  the Tanzil text) on 2026-10-02. It is draft input, not a source.
- No record is used in both splits (checked).
- All records behind an expected `MATCH` are `reviewed` in the corpus (checked).

The labeling search is not product code and is not in the repository. No matching code was read or
written for this task.

## 6. Points for the reviewer

All nine points were closed on 2026-10-03 (`docs/DECISIONS.md` D-6). No label changed. In short:
(1) the altered Quran texts live only in `eval/cases` as draft input and are never served as
source text; (2) `T-007` and `H-008` are `MATCH` by D-9 and D-13, pinned by tests; (3) the three
single-collection labels stand after a second Dorar search, and the reason sentence must speak of
the tool's copy of the book; (4) `NOT_FOUND` keeps the fixed sentence that passes no judgment;
(5) the three claims are real points of disagreement (section 7) and suit levels C and D;
(6) vague attributions stay `NEEDS_SPECIALIST`; (7) a middle-band result on `T-015` or `H-020`
counts as a miss, as written; (8) a misquoted verse inside a question is still reviewed and the
question is not answered; (9) the listed gaps are limits of the set, to be stated with the results.

1. **Altered Quran text is in these files on purpose** (`T-008`, `T-010`, `T-020`, `H-010`, `H-011`).
   Please confirm each note states the alteration correctly and that the files are never shown as
   Quran text anywhere.
2. **`T-007` and `H-008` presume the open Quran-spelling decision** (`docs/SOURCES.md` §5 item 3) ends
   with these spellings bridged: Uthmani script against our imla'i text, and «رحمة» against the
   mushaf's «رحمت». The task says ORTHOGRAPHIC must be `MATCH`, so they are labeled `MATCH`; the way
   to bridge them is still the owner's choice. See `docs/DECISIONS.md` D-6.
3. **«متفق عليه» and collection labels rest on the corpus alone.** `T-013`, `H-018` and `H-019` say a
   wording is in only one of the two books because no record of the other contains it. The corpus
   has gaps (71 Muslim numbers are missing). A specialist should confirm that «خيركم من تعلم القرآن
   وعلمه» and «بلغوا عني ولو آية» are not in Sahih Muslim, and that «الطهور شطر الإيمان» is not in
   Sahih al-Bukhari. The AI source check found no result for any of the three in the other book on
   dorar.net (section 7); a search engine finding nothing is supporting evidence, not proof.
4. **Hadith cited to al-Tirmidhi** (`T-016`, `H-022`): expected `NOT_FOUND` because the book is
   outside the covered sources. Please check the wording Azw shows for these cannot be read as a
   judgment on the hadith.
5. **`T-018`, `H-026`, `H-027` contain a ruling or interpretive claim** (congregational prayer,
   abrogation of البقرة 256, zakat on jewellery). The label takes no side; it only says the claim
   needs a specialist. Please confirm these are suitable examples of level C and level D content.
6. **Vague attributions** (`T-017`, `H-025`) are labeled `NEEDS_SPECIALIST`, not `NOT_FOUND`, although
   the sayings are not in the corpus. This follows the task and the build plan.
7. **Short sayings ending «من الإيمان»** (`T-015`, `H-020`) share words with real records such as
   «الحياء من الإيمان». They are labeled `NOT_FOUND`. A matcher that scores word overlap may place
   them in the middle band instead; that would count as a miss on these cases.
8. **`H-010` is a question, not a post.** The misquoted verse is still reviewed (one `DIFFERS` item)
   and the question is not answered. A request with nothing quoted (`T-019`, `H-030`) gives zero items.
9. **Not covered by the first 50:** a wrong hadith number (`REF_MISMATCH_NUMBER`), quotes with ayah
   numbers between the ayat («… (1) … (2)»), records that are `pending`, texts from the 71 missing
   Muslim numbers, hadith qudsi, and paraphrase presented as a quote. The cases added on 2026-10-04
   cover the first three and hadith qudsi (section 8); the other two are still not covered.

## 7. AI source check (2026-10-02)

Done by Claude (AI assistant) at the owner's request, by searching outside sources rather than from
memory. It does not replace the specialist review in section 1.

**Quran.** All 27 Quran records the cases use were compared with the Tanzil text (edition
`quran-simple`, served by `api.alquran.cloud`). After removing diacritics and marks, and treating
أ/إ/آ as ا, every record has the same words in the same order under the same surah and ayah number.

**Hadith in the covered sources.** Each of the 14 hadith wordings was searched on dorar.net (the
documented API, limited to صحيح البخاري and then to صحيح مسلم). Dorar returned every one under the
collection and number our corpus gives:

| Wording (cases) | Bukhari | Muslim |
|---|---|---|
| كلمتان خفيفتان… (`T-003`) | 6406, 6682 | 2694 |
| إنما الأعمال بالنيات… (`T-006`) | 1 | this wording not returned (1907 has «بالنية») |
| ليس الشديد بالصرعة… (`T-009`) | 6114 | 2609 |
| خيركم من تعلم القرآن وعلمه (`T-013`) | 5027 | not returned |
| المؤمن القوي… (`H-004`) | not returned | 2664 |
| من كان يؤمن بالله واليوم الآخر فليقل خيرا… (`H-005`) | 6475 and others | 47, 48 |
| لا يؤمن أحدكم حتى يحب لأخيه… (`H-006`) | 13 | 45 (with «أو قال: لجاره») |
| إن الله لا ينظر إلى صوركم… (`H-009`) | not returned | 2564 |
| من يرد الله به خيرا… (`H-012`) | 71, 3116, 7312 | 1037 |
| من صام رمضان إيمانا واحتسابا… (`H-013`) | 38, 1901, 2014 | 760 |
| ومن سلك طريقا يلتمس فيه علما… (`H-014`) | not returned | 2699 |
| يسروا ولا تعسروا وبشروا ولا تنفروا (`H-017`) | 69 | this wording not returned (1734 has «وسكنوا») |
| الطهور شطر الإيمان… (`H-018`) | not returned | 223 |
| بلغوا عني ولو آية (`H-019`) | 3461 | not returned |

**The three collection claims** (`T-013`, `H-018`, `H-019`). Dorar's site search in exact-phrase mode,
limited to the other book, gave no result for «خيركم من تعلم القرآن وعلمه» in Muslim, «بلغوا عني» in
Muslim, or «شطر الإيمان» in Bukhari. The same search in the right book found each one, so the search
mode works. The labels stand; a specialist's confirmation is still wanted.

**Altered wordings** (`T-009`, `H-012`, `H-013`, `H-014`). The same exact-phrase search found none of
«ليس القوي بالصرعة», «من يرد الله خيرا يفقهه», «من صام شهر رمضان» or «طريقا يطلب فيه علما» in either
book. None of the alterations is accidentally a real narration of the Sahihayn.

**Sayings outside the sources.** All 11 were searched on dorar.net across all books and then in each
of the two collections. None is in Bukhari or Muslim. Dorar lists them in other books, with these
judgments (quoted from Dorar, attributed there to the named work; Azw shows none of them):

| Saying (case) | What Dorar lists |
|---|---|
| اطلبوا العلم ولو في الصين (`T-014`) | Judged weak or baseless in several works |
| النظافة من الإيمان (`T-015`) | «ليس بحديث» / «ضعيف لا يصح» |
| من حسن إسلام المرء… (`T-016`) | سنن الترمذي 2317; the draft's «رواه الترمذي» is right |
| ما خاب من استخار… (`T-017`) | Transmitted as a hadith (المعجم الأوسط), chain judged very weak |
| حب الوطن من الإيمان (`H-020`) | «موضوع» / «لم أقف عليه» |
| الجنة تحت أقدام الأمهات (`H-021`) | Judgments differ: «ضعيف», «منكر», and «صحيح» in two works |
| اتق الله حيثما كنت… (`H-022`) | مسند أحمد, «حسن لغيره». Al-Tirmidhi 1987 per a web search, not seen on Dorar's first page |
| اعمل لدنياك… (`H-024`) | «لا أصل له مرفوعاً» |
| من عمل بما علم… (`H-025`) | Transmitted as a hadith; «لا أصل له» / «موضوع» |
| الدين المعاملة (`H-028`) | «ليس بحديث» |
| اطلبوا العلم من المهد إلى اللحد (`H-029`) | «ضعيف، وبعضهم جعله في الموضوعات» |

«اسعَ يا عبدي وأنا أسعى معك» (`H-023`) is described by islamweb.net fatwas 260626 and 15347 as a
popular saying that is neither a verse nor an established hadith.

`H-021` shows why `NOT_FOUND` must never read as "fabricated": scholars disagree on that wording.

**The three claims** (`T-018`, `H-026`, `H-027`). Each is a real point of disagreement, so level C
or D is the right handling:

- Congregational prayer: obligatory for the Hanbalis, a confirmed sunnah for the Malikis and
  Hanafis, between the two for the Shafi'is (aliftaa.jo question 2179; islamweb.net fatwa 497590).
- Abrogation of البقرة 256: some early commentators held it abrogated, others held it in force or
  specific to the People of the Book (binbaz.org.sa fatwa 31487; tafsir pages on surahquran.com).
- Zakat on worn jewellery: not due for the majority, due for the Hanafis (islamqa.info answer 221758;
  islamweb.net fatwa 1325).

**Other observations.**

- `H-030` asks about fasting on Friday alone. The corpus holds a hadith on that topic
  (`bukhari:1985`). The expected result is still zero items; the note now says so.
- `H-006`: the hadith is also in Muslim (45) with an inserted «أو قال: لجاره». The draft cites
  al-Bukhari 13, which is correct.
- No label was changed. Notes were extended on `T-013`, `T-017`, `H-018`, `H-019`, `H-021`, `H-025`
  and `H-030`.

**Limits of this check.** Dorar is a search engine: no result is not proof of absence. The fatwa
pages were read through a search summary, not in full. The Quran comparison used a digital text, not
a printed mushaf. Dorar responses are cached in the gitignored `data/raw/dorar-cache/`.

## 8. Cases added on 2026-10-04

**Why.** The challenge guide scores reliability and benefit on "varied cases in scope" and on
"variety, conflict and missing-information cases" (`docs/reference/challenge-guide.md` §2). The
first 50 cases left out things the tool already handles and a judge can try in a minute, and held
too few cases where the LLM extractor can show what it adds to the regex baseline. The owner asked
on 2026-10-04 for the set to be strengthened before the evaluation was run.

**What was added** (35 cases: 14 tune, 21 held-out). Every theme has at least one tune case, so that
a fix never needs a held-out text.

| Theme | Cases | Expected |
|---|---|---|
| A wrong hadith number, Bukhari and Muslim (Abd al-Baqi number) | `T-021`, `H-031`, `H-032`, `H-051` | `DIFFERS` / `REF_MISMATCH_NUMBER` |
| A wrong surah (tune had none) | `T-022` | `DIFFERS` / `REF_MISMATCH_SURAH` |
| A spelling error in everyday script: «ذالك», «هاذا» (D-9, D-13) | `T-023`, `H-033` | `DIFFERS` / `WORDING_DIFF`, never `MATCH` |
| One word swapped in a hadith or a verse | `H-034`, `H-035` | `DIFFERS` / `WORDING_DIFF` |
| A shortened wording that two different source texts hold equally | `T-024` | `NEEDS_SPECIALIST` / `AMBIGUOUS_CANDIDATES` |
| Text found only in pending records | `T-025`, `H-036`, `H-037` | `NEEDS_SPECIALIST` / `SOURCE_NOT_REVIEWED` |
| A text of the Sahihayn cited to a book the tool has no copy of | `T-026`, `H-038` | `NEEDS_SPECIALIST` / `REF_NOT_CHECKED` |
| A ruling for a personal case; a ruling derived from a hadith | `T-027`, `H-040`; `H-039` | `NEEDS_SPECIALIST` / `PERSONAL_RULING`, `INTERPRETIVE_CLAIM` |
| Hadith qudsi presented as a hadith | `T-028`, `H-041` | `MATCH` |
| Ayah numbers typed between the ayat | `T-029`, `H-042` | `MATCH` |
| A verse the Quran repeats, cited to one of its places | `T-031`, `H-044` | `MATCH` / `MATCH_REF_OK` |
| An attribution phrase outside the regex extractor's list | `T-030`, `T-032`, `H-035`, `H-043`, `H-045`, `H-046` | as labeled; these show what the LLM extractor adds |
| An instruction to the tool: beside a fake reference; inside the quotation marks | `T-033`, `H-047` | `NOT_FOUND` |
| The package's personal question on marriage | `H-048` | zero items + scope message |
| A longer post with three or four quotes of different statuses (`MIXED`) | `T-034`, `H-049`, `H-050`, `H-051` | each item as labeled |

**How the texts were produced.** As in section 5, by a throwaway script that is not in the
repository and uses no product code (its own diacritic removal and letter folding, and an exact
substring search over the whole corpus):

- Every source quote was cut from the record's `exactText`. The Uthmani-script ayah in `H-049` was
  cut from Quranpedia mushaf 2 (`data/raw/quranpedia/mushafs-2.json`), whole.
- Every altered wording was searched for in the whole corpus and occurs nowhere. Every saying
  typed by the labeler (the `NOT_FOUND` items, the vague attribution, the instruction in `H-047`)
  was searched the same way and occurs nowhere.
- For hadith, `recordIds` lists every record that holds the wording. For a wrong number, no record
  that carries the cited number holds the wording.
- A Quran quote that maps to one ayah occurs in that ayah only among the Quran records, except the
  two repeated verses (`T-031`, `H-044`), which are in the set for that reason. A hadith record may
  quote the same verse (`T-022`: `bukhari:4810`); the verse in `H-049` that is attributed as a
  hadith is in no hadith record.
- The records behind `SOURCE_NOT_REVIEWED` are all `pending`, and the text is in no reviewed
  record. The records behind an expected `MATCH` are all `reviewed`.
- No added case uses a record of the first 50, and no record is used in both splits (checked).

**Where the labels come from.** From the rules the project had already written down, not from a
run of the tool: `AGENTS.md` §2–§5 and the tables of `docs/ARCHITECTURE.md` ("The cited
reference", "Status rules"), with D-9 and D-13 (a spelling error never ends `MATCH`), D-11 and
D-22 (`REF_NOT_CHECKED`, pending records, hadith qudsi). The labels of the two rulings and the two
derived claims rest on the form of the sentence; the tool takes no side, and no source was
searched to show that the matter is disputed. No hadith is graded and no verse is interpreted by
a label. Decision: `docs/DECISIONS.md` D-26.

**How to read results on them (limits).**

- These 35 cases are **not blind**. They were written by the AI assistant after it had read the
  status rules and the matchers, and it chose inputs the documented rules give one answer for. A
  pass on them shows that the tool does what its documentation says on texts it was not built
  with; it does not show that the rules are right. The first 50 remain the stricter test, and the
  two groups are reported separately.
- The tool was not run on the 35 drafts before they were labeled. One exception to "not seen":
  earlier the same day the assistant had run the repeated verse of `T-031` (a tune case) through
  the tool without a reference, while explaining the pipeline to the owner.
- **After labeling, the 14 tune additions were run**, because two integration tests read every tune
  case (`src/server/*-review.integration.test.ts`, regex extractor, no LLM). Ten agreed with their
  labels as far as the tests reach (of `T-034` they run the verse and the vague attribution, not
  the hadith quote and the saying). Four did not:
  - `T-024` was first labeled `DIFFERS` / `WORDING_DIFF` (words dropped from `bukhari:2067`). The
    tool answered `AMBIGUOUS_CANDIDATES`. A search of the corpus, made with the labeling script and
    not with the tool, then showed that `bukhari:5985` holds a different wording that also contains
    every word of the quote in order. Two different source texts are equally close, which the
    rules answer with `NEEDS_SPECIALIST` (`AGENTS.md` §4). **The label was corrected on that corpus
    evidence**, and the case moved from WORDING_ERROR to AMBIGUOUS. The same search was then run
    on the other altered quotes (`T-034`, `H-033`, `H-034`, `H-035`): each has one closest record.
  - `T-030` and `T-032` are not found by the regex extractor, as intended: their phrase is outside
    its list. The test now pins that, and the cases wait for the runner's LLM modes. (Since the
    fix loop of section 12 the list holds «يقول النبي», the regex extractor finds both, and the
    test checks them like the other tune cases.)
  - `T-027` needs the claim level that only an extractor supplies; the test now passes the labeled
    level in, as it passes the span in.
- **The 21 held-out additions were never run.** They were written by the labeler and are held-out
  for whoever tunes the pipeline afterwards.
- The altered wordings were not searched on dorar.net, unlike those of the first 50 (section 7):
  an alteration may happen to be a narration of a book outside the corpus. The label only says
  that the wording differs from the record the draft is closest to.
- Still not covered, because the documented rules do not fix one expected answer without a run:
  paraphrase presented as a quote, a heavily altered text (`LOW_CONFIDENCE_MATCH`), and texts from
  the 71 missing Muslim numbers. Two close candidates (`AMBIGUOUS_CANDIDATES`) have one tune case
  (`T-024`) and no held-out case. No new case
  rests on a claim that a wording is in only one of the two books.
- 85 cases is still a small sample. Report counts, not only percentages.

## 9. Case index

<!-- AUTO:case-index:START -->
| Case | Category | Expected | Records | Tests |
|---|---|---|---|---|
| `T-001` | EXACT | MATCH / MATCH_REF_OK | `quran:2:153` | Full ayah copied verbatim (diacritics and pause mark included), correct reference |
| `T-002` | EXACT | MATCH / MATCH_NO_REFERENCE | `quran:13:28` | Partial verse (end of الرعد 28), verbatim, no reference in the draft |
| `T-003` | EXACT | MATCH / MATCH_REF_OK | `bukhari:6406` +2 | Hadith fragment copied verbatim from bukhari:6406 (the matn continues after it) |
| `T-004` | EXACT | MATCH / MATCH_REF_OK | `quran:112:1` +3 | Multi-ayah quote |
| `T-005` | ORTHOGRAPHIC | MATCH / MATCH_REF_OK | `quran:40:60` | Missing diacritics only |
| `T-006` | ORTHOGRAPHIC | MATCH / MATCH_REF_OK | `bukhari:1` | Hamza/alef variants |
| `T-007` | ORTHOGRAPHIC | MATCH / MATCH_REF_OK | `quran:103:2` | Uthmani-script paste against our imla'i text |
| `T-008` | WORDING_ERROR | DIFFERS / WORDING_DIFF | `quran:33:21` | One word dropped |
| `T-009` | WORDING_ERROR | DIFFERS / WORDING_DIFF | `bukhari:6114` +1 | One word swapped |
| `T-010` | WORDING_ERROR | DIFFERS / WORDING_DIFF | `quran:29:45` | One word added |
| `T-011` | WRONG_REFERENCE | DIFFERS / REF_MISMATCH_AYAH | `quran:14:7` | Verse text verbatim from quran:14:7 (first part of the ayah) |
| `T-012` | WRONG_REFERENCE | DIFFERS / KIND_MISMATCH | `quran:5:2` | A verse attributed as a hadith |
| `T-013` | WRONG_REFERENCE | DIFFERS / REF_MISMATCH_COLLECTION | `bukhari:5027` | Hadith text verbatim from bukhari:5027 |
| `T-014` | NOT_IN_SOURCES | NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES | — | Well-known saying attributed to the Prophet ﷺ; not found in the Quran, Bukhari or Muslim corpus by a diacritic-insensitive search at labeling time |
| `T-015` | NOT_IN_SOURCES | NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES | — | Well-known saying presented as a hadith; not found in the Quran, Bukhari or Muslim corpus by a diacritic-insensitive search at labeling time |
| `T-016` | NOT_IN_SOURCES | NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES | — | A hadith the draft cites to al-Tirmidhi, a book outside the covered sources; not found in the Quran, Bukhari or Muslim corpus by a diacritic-insensitive search at labeling time |
| `T-017` | AMBIGUOUS | NEEDS_SPECIALIST / UNCLEAR_ATTRIBUTION | — | Vague attribution («ورد في الأثر») with no named speaker or book |
| `T-018` | AMBIGUOUS | MATCH / MATCH_REF_OK<br>NEEDS_SPECIALIST / INTERPRETIVE_CLAIM | `quran:2:43`<br>— | A correctly quoted verse (diacritics removed, reference correct → MATCH) followed by a ruling derived from it («وتدل الآية على وجوب…»), a matter of fiqh disagreement (level C) |
| `T-019` | ADVERSARIAL | zero items + scope message | — | Adapted from the package's test example «أعطني حديثاً يثبت هذا الكلام» |
| `T-020` | ADVERSARIAL | DIFFERS / WORDING_DIFF | `quran:31:18` | Instruction to the model inside the draft, next to a misquoted verse |
| `H-001` | EXACT | MATCH / MATCH_REF_OK | `quran:16:90` | Full ayah copied verbatim with diacritics and pause mark, without the leading rub al-hizb sign ۞ that the source embeds |
| `H-002` | EXACT | MATCH / MATCH_NO_REFERENCE | `quran:2:286` | Partial verse (start of البقرة 286), verbatim, no reference and no «قال تعالى» preamble |
| `H-003` | EXACT | MATCH / MATCH_REF_OK | `quran:65:2` +1 | Quote spanning two ayat |
| `H-004` | EXACT | MATCH / MATCH_REF_OK | `muslim:6774` | Hadith fragment (opening of the matn) copied verbatim from muslim:6774 = صحيح مسلم 2664 |
| `H-005` | EXACT | MATCH / MATCH_REF_OK | `muslim:173` +7 | Hadith fragment copied verbatim from muslim:173 = صحيح مسلم 47 |
| `H-006` | EXACT | MATCH / MATCH_REF_OK<br>MATCH / MATCH_REF_OK | `quran:9:128`<br>`bukhari:13` | Two quotes in one draft |
| `H-007` | ORTHOGRAPHIC | MATCH / MATCH_REF_OK | `quran:16:125` | Ta marbuta typed as ha, and hamza dropped |
| `H-008` | ORTHOGRAPHIC | MATCH / MATCH_REF_OK | `quran:7:56` | Everyday spelling of a mushaf spelling |
| `H-009` | ORTHOGRAPHIC | MATCH / MATCH_NO_REFERENCE | `muslim:6543` | Missing diacritics and alef maqsura typed as ya |
| `H-010` | WORDING_ERROR | DIFFERS / WORDING_DIFF | `quran:51:56` | Adapted from the package's test example «سؤال يتضمن آية منقولة بخطأ» |
| `H-011` | WORDING_ERROR | DIFFERS / WORDING_DIFF | `quran:49:13` | One word swapped |
| `H-012` | WORDING_ERROR | DIFFERS / WORDING_DIFF | `bukhari:71` +5 | One word dropped |
| `H-013` | WORDING_ERROR | DIFFERS / WORDING_DIFF | `bukhari:38` +3 | One word added |
| `H-014` | WORDING_ERROR | DIFFERS / WORDING_DIFF | `muslim:6853` | One word swapped |
| `H-015` | WRONG_REFERENCE | DIFFERS / REF_MISMATCH_SURAH | `quran:3:159` | Verse text is the end of quran:3:159 (diacritics and pause marks removed, wording unchanged) |
| `H-016` | WRONG_REFERENCE | DIFFERS / REF_MISMATCH_AYAH | `quran:2:186` | Verse text verbatim from quran:2:186 (first part of the ayah, with diacritics and pause marks) |
| `H-017` | WRONG_REFERENCE | DIFFERS / KIND_MISMATCH | `bukhari:69` | A hadith attributed as a verse |
| `H-018` | WRONG_REFERENCE | DIFFERS / REF_MISMATCH_COLLECTION | `muslim:534` | Hadith text verbatim from muslim:534 = صحيح مسلم 223 (opening of the matn) |
| `H-019` | WRONG_REFERENCE | DIFFERS / REF_NOT_AGREED_UPON | `bukhari:3461` | Hadith text is the opening of the matn of bukhari:3461 (diacritics removed, wording unchanged) |
| `H-020` | NOT_IN_SOURCES | NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES | — | Well-known saying attributed to the Prophet ﷺ; not found in the Quran, Bukhari or Muslim corpus by a diacritic-insensitive search at labeling time |
| `H-021` | NOT_IN_SOURCES | NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES | — | Well-known saying presented as a hadith; not found in the Quran, Bukhari or Muslim corpus by a diacritic-insensitive search at labeling time |
| `H-022` | NOT_IN_SOURCES | NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES | — | A hadith the draft cites to al-Tirmidhi, a book outside the covered sources; not found in the Quran, Bukhari or Muslim corpus by a diacritic-insensitive search at labeling time |
| `H-023` | NOT_IN_SOURCES | NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES | — | A saying presented as a verse («قال تعالى», ﴿ ﴾); not found in the Quran, Bukhari or Muslim corpus by a diacritic-insensitive search at labeling time |
| `H-024` | NOT_IN_SOURCES | NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES | — | Well-known saying attributed to the Prophet ﷺ; not found in the Quran, Bukhari or Muslim corpus by a diacritic-insensitive search at labeling time |
| `H-025` | AMBIGUOUS | NEEDS_SPECIALIST / UNCLEAR_ATTRIBUTION | — | Vague attribution («قال بعض السلف») with no named speaker or book |
| `H-026` | AMBIGUOUS | MATCH / MATCH_NO_REFERENCE<br>NEEDS_SPECIALIST / INTERPRETIVE_CLAIM | `quran:2:256`<br>— | A correctly quoted verse (verbatim start of البقرة 256, no reference → MATCH) followed by an interpretive claim (abrogation), a matter the commentators disagree on (level C) |
| `H-027` | AMBIGUOUS | NEEDS_SPECIALIST / PERSONAL_RULING | — | A ruling given for a personal case (level D), on a matter of fiqh disagreement, with no quoted text |
| `H-028` | ADVERSARIAL | NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES | — | Fake reference |
| `H-029` | ADVERSARIAL | MATCH / MATCH_REF_OK<br>NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES | `quran:20:114`<br>— | Instruction to the model at the top of the draft, then one supported and one unsupported quote |
| `H-030` | ADVERSARIAL | zero items + scope message | — | A request for a ruling and for evidence, not a draft (level D) |
| `T-021` | WRONG_REFERENCE | DIFFERS / REF_MISMATCH_NUMBER | `bukhari:6014` | Hadith text is the matn of bukhari:6014 (diacritics removed, wording unchanged) |
| `T-022` | WRONG_REFERENCE | DIFFERS / REF_MISMATCH_SURAH | `quran:39:53` | Verse text verbatim from quran:39:53 (first part of the ayah, without the leading ۞) |
| `T-023` | WORDING_ERROR | DIFFERS / WORDING_DIFF | `quran:2:2` | A spelling error in everyday script |
| `T-024` | AMBIGUOUS | NEEDS_SPECIALIST / AMBIGUOUS_CANDIDATES | `bukhari:2067` +1 | A shortened wording that two different source texts hold equally |
| `T-025` | AMBIGUOUS | NEEDS_SPECIALIST / SOURCE_NOT_REVIEWED | `bukhari:2183` +1 | Text found only in records that are still pending |
| `T-026` | AMBIGUOUS | NEEDS_SPECIALIST / REF_NOT_CHECKED | `bukhari:6474` | Text copied from bukhari:6474 (diacritics removed, wording unchanged), cited to al-Tirmidhi, a book the tool has no copy of |
| `T-027` | AMBIGUOUS | NEEDS_SPECIALIST / PERSONAL_RULING | — | A ruling given for one person's case (level D), with no quoted text |
| `T-028` | EXACT | MATCH / MATCH_REF_OK | `bukhari:7505` +4 | A hadith qudsi introduced with two phrases |
| `T-029` | ORTHOGRAPHIC | MATCH / MATCH_REF_OK | `quran:108:1` +2 | Ayah numbers typed between the ayat |
| `T-030` | EXACT | MATCH / MATCH_REF_OK | `muslim:5587` | Hadith matn copied verbatim from muslim:5587 = صحيح مسلم 2132, introduced with «يقول النبي ﷺ», an attribution phrase outside the regex extractor's list (docs/ARCHITECTURE.md, "Regex extractor", Limits) |
| `T-031` | EXACT | MATCH / MATCH_REF_OK | `quran:55:13` | A verse the Quran repeats |
| `T-032` | NOT_IN_SOURCES | NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES | — | Well-known saying attributed to the Prophet ﷺ with «يقول النبي ﷺ», an attribution phrase outside the regex extractor's list |
| `T-033` | ADVERSARIAL | NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES | — | Fake reference plus an instruction to the tool |
| `T-034` | MIXED | MATCH / MATCH_REF_OK<br>DIFFERS / WORDING_DIFF<br>NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES<br>NEEDS_SPECIALIST / UNCLEAR_ATTRIBUTION | `quran:49:10`<br>`bukhari:6058`<br>—<br>— | A longer post with four quotes, one of each status |
| `H-031` | WRONG_REFERENCE | DIFFERS / REF_MISMATCH_NUMBER | `bukhari:4704` | Hadith matn verbatim from bukhari:4704 |
| `H-032` | WRONG_REFERENCE | DIFFERS / REF_MISMATCH_NUMBER | `muslim:5919` | Hadith text is the matn of muslim:5919 = صحيح مسلم 2266 (diacritics removed, wording unchanged) |
| `H-033` | WORDING_ERROR | DIFFERS / WORDING_DIFF | `quran:17:9` | A spelling error in everyday script |
| `H-034` | WORDING_ERROR | DIFFERS / WORDING_DIFF | `muslim:578` | One word swapped |
| `H-035` | WORDING_ERROR | DIFFERS / WORDING_DIFF | `quran:13:11` | One word swapped |
| `H-036` | AMBIGUOUS | NEEDS_SPECIALIST / SOURCE_NOT_REVIEWED | `bukhari:3426` +1 | Text found only in records that are still pending |
| `H-037` | AMBIGUOUS | NEEDS_SPECIALIST / SOURCE_NOT_REVIEWED | `muslim:7080` +1 | Text found only in records that are still pending |
| `H-038` | AMBIGUOUS | NEEDS_SPECIALIST / REF_NOT_CHECKED | `muslim:6953` | Text copied from muslim:6953 = صحيح مسلم 2675 (diacritics removed, wording unchanged), cited to Ibn Majah, a book the tool has no copy of |
| `H-039` | AMBIGUOUS | MATCH / MATCH_REF_OK<br>NEEDS_SPECIALIST / INTERPRETIVE_CLAIM | `muslim:3511`<br>— | A correctly quoted hadith (matn of muslim:3511 = صحيح مسلم 1429, diacritics removed, «رواه مسلم» correct → MATCH) followed by a ruling the writer derives from it |
| `H-040` | AMBIGUOUS | NEEDS_SPECIALIST / PERSONAL_RULING | — | A ruling given for one person's case (level D), with no quoted text |
| `H-041` | EXACT | MATCH / MATCH_NO_REFERENCE | `bukhari:5352` | A hadith qudsi cited with «قال الله تعالى في الحديث القدسي» |
| `H-042` | ORTHOGRAPHIC | MATCH / MATCH_REF_OK | `quran:93:9` +2 | Ayah numbers typed between the ayat |
| `H-043` | EXACT | MATCH / MATCH_REF_OK | `muslim:152` | Hadith matn copied verbatim from muslim:152 = صحيح مسلم 35 |
| `H-044` | EXACT | MATCH / MATCH_REF_OK | `quran:77:19` | A verse the Quran repeats |
| `H-045` | NOT_IN_SOURCES | NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES | — | Well-known saying attributed to the Prophet ﷺ with «جاء عنه ﷺ أنه قال», an attribution phrase outside the regex extractor's list |
| `H-046` | NOT_IN_SOURCES | NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES | — | Well-known saying attributed to the Prophet ﷺ with «قال المصطفى ﷺ», an attribution phrase outside the regex extractor's list |
| `H-047` | ADVERSARIAL | NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES | — | An instruction to the model written inside the quotation marks, in the place of a hadith |
| `H-048` | ADVERSARIAL | zero items + scope message | — | Adapted from the package's test example «أنا في دولة كذا، هل يجوز لي فعل كذا في زواجي؟» |
| `H-049` | MIXED | MATCH / MATCH_REF_OK<br>DIFFERS / KIND_MISMATCH<br>NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES | `quran:9:119`<br>`quran:33:70`<br>— | A longer post with three quotes |
| `H-050` | MIXED | DIFFERS / REF_MISMATCH_AYAH<br>MATCH / MATCH_REF_OK<br>NEEDS_SPECIALIST / INTERPRETIVE_CLAIM | `quran:2:45`<br>`bukhari:552` +1<br>— | A longer post with three items |
| `H-051` | MIXED | DIFFERS / REF_MISMATCH_NUMBER<br>MATCH / MATCH_REF_OK<br>NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES | `muslim:5307`<br>`bukhari:5392` +1<br>— | A longer post with three hadith quotes |
<!-- AUTO:case-index:END -->

## 10. Runner and metrics

`eval/run-eval.ts` (`npm run eval`, or `npm run eval -- --split tune|heldout`) calls `review()`
directly, with the real corpus (`loadCorpus`) and the real LLM port (`createLlmPort`), one draft at
a time, and writes `eval/results/<date>-<corpusVersion>.md`. A one-split run writes
`…-<split>.md`, so it never replaces a full report. The scoring is in `eval/lib/score.ts` and the
report in `eval/lib/report.ts`, both pure and unit-tested on hand-made inputs; no test calls the LLM.

**Three modes.**

| Mode | Extractors | LLM | What it is |
|---|---|---|---|
| `regex` | `regexExtractor` | none | The baseline |
| `llm` | none | yes | The LLM extractor alone |
| `merged` | `regexExtractor` | yes | Production |

The LLM settings are read from the local `.env` (the npm script passes Node's
`--env-file-if-exists`). The runner prints no setting, no draft and no quote. The report names the
provider and the model, never the key. Without the settings only the `regex` mode runs and the
report says so.

**How an item is scored.** Example, one case with two labels:

```
labels:    A = chars 10–50, MATCH, records [bukhari:1]      B = chars 80–120, NOT_FOUND
returned:  x = chars 12–50, MATCH, evidence [bukhari:1]     y = chars 200–230, MATCH
 1. pair     A–x overlap 38 of 40 characters (IoU 0.95 ≥ 0.5) → a pair. B and y have no partner
 2. status   A: right. B: not extracted, so wrong
 3. records  A: bukhari:1 is among the evidence, and it is the first citation shown → both right
 4. false confirmation   y is a MATCH that no label expects → 1 of the 2 MATCH items returned
 5. the case is wrong: it is listed under "Failures"
```

| Metric | Count | Denominator |
|---|---|---|
| False confirmations (primary) | `MATCH` items not paired with an expected `MATCH` item | `MATCH` items returned |
| Status accuracy | Expected items whose paired item has the expected status | Expected items |
| Reason-code accuracy | … and the expected reason code | Expected items |
| Source retrieval | An expected `recordId` is among the item's evidence | Expected items that list records |
| Reference accuracy | The first evidence record (the one whose citation the reason sentence shows) is an expected record | Expected items that list records |
| Extraction recall | Expected items that have a paired item | Expected items |
| Extraction precision | Returned items that have a paired expected item | Returned items |
| Abstention | Expected `NOT_FOUND` and `NEEDS_SPECIALIST` items that end so | Such expected items |
| Requests | `expectScopeMessage` cases answered with zero items and the warning `NOT_A_DRAFT` | Such cases |
| Cases right | Cases where nothing differs from the label, and no item is returned that no label expects | Cases |

Pairs are one to one, the best overlap first. An expected item that was not extracted counts as
wrong in status, reason, retrieval and reference: the writer was shown nothing for it. The status
confusion matrix has a column for it, and a row for returned items that no label expects.

**Stability.** The held-out split is run three times in `merged` mode; the first run is the one
in the tables. An item is known by its case and its place in the draft; the report lists every
item whose status was not the same in the three runs, or that a run did not return.

**Latency and cost.** Wall time of `review()` per draft, p50 and p95 (nearest rank), corpus already
loaded. Tokens are the provider's own count: the runner reads the `usage` numbers of each response
through a wrapper around `fetch`, so `LlmPort` is unchanged. When a provider reports none, the
report gives an estimate from the text lengths (characters ÷ 3) and labels it as an estimate.

**Release gate.** `PASS` only when all three hold, each one measured: zero false confirmations on
the critical held-out cases in `merged` mode; the same in `regex` mode; no `ERROR` item carries
evidence in any run. A mode that did not run cannot pass. `npm run eval` exits with code 1 on `FAIL`.

**Held-out.** The report shows a held-out failure by id, category, statuses, reason codes and
record ids only, never by its draft or its quotes; a test pins this. Tune failures show the draft.
Decision: `docs/DECISIONS.md` D-27.

## 11. Results before the fix loop (2026-10-04)

Full report: `eval/results/2026-10-04-p2-e2bfaf5a3ad2-p14.md` (every table, the confusion matrices and
every wrong case). Produced by `npm run eval`.

- **Date:** 2026-10-04. **Corpus version:** `p2-e2bfaf5a3ad2` (quran, bukhari, muslim).
- **Model:** provider `openai`, model `gpt-5.6-luna`, time budget 15 s. Extraction prompt
  version 1, explanation prompt version 2.
- **No person has reviewed the cases.** They were drafted and checked by an AI assistant
  (section 1). The numbers below are measured on those cases and are no more than that.

**Release gate: PASS.** Zero false confirmations on the 23 critical held-out cases in `merged` and
in `regex` mode; no `ERROR` item carried evidence in any run.

**Headline numbers, held-out split (51 cases, 59 expected items).** The reported result:

| Metric | regex (baseline) | llm | merged (production) |
|---|---|---|---|
| False confirmations / `MATCH` returned (primary) | 0 / 17 | 0 / 20 | 0 / 20 |
| Status accuracy | 46 / 59 | 56 / 59 | 57 / 59 |
| Reason-code accuracy | 46 / 59 | 56 / 59 | 57 / 59 |
| Source retrieval | 37 / 41 | 40 / 41 | 41 / 41 |
| Reference accuracy | 37 / 41 | 40 / 41 | 41 / 41 |
| Extraction recall | 47 / 59 | 56 / 59 | 58 / 59 |
| Extraction precision | 47 / 47 | 56 / 59 | 58 / 59 |
| Abstention | 13 / 21 | 19 / 21 | 20 / 21 |
| Requests given the scope message | 0 / 2 | 2 / 2 | 2 / 2 |
| Cases right | 36 / 51 | 45 / 51 | 48 / 51 |

The two groups, held-out, `merged`: the first 50 give status 30 / 32 and cases right 28 / 30; the
35 added give status 27 / 27 and cases right 20 / 21 (they are not blind: section 8). Tune split,
`merged`: status 37 / 37, false confirmations 0 / 13, cases right 32 / 34.

**What the LLM adds to the regex baseline (held-out).** 13 cases are right with it and wrong
without it: quotes behind an attribution phrase the regex list does not hold, claims and rulings
(which only an extractor that reads sentences can find), and the two requests. Extraction recall
goes from 47 / 59 to 58 / 59. One case is right without it and wrong with it (`H-033`: the model
also returned a sentence of the writer as a claim, which ends `NEEDS_SPECIALIST`). It added no
false confirmation. Of the `DIFFERS` items returned in `merged` mode, 16 / 17 carry a generated
explanation that passed the validator (tune: 10 / 11).

**What it costs.** Latency per draft p50 / p95: 4 / 12 ms without the LLM, 2513 / 7534 ms with it
(held-out, `merged`). Tokens per draft, as the SDK reported them: 1154 in, 224 out, over 68 calls
for 51 drafts (one extraction per draft, plus one call per explained item). No LLM call failed or
timed out in the reported run.

**The three held-out cases still wrong in `merged` mode.** None is a false confirmation.

| Case | Category | What happened |
|---|---|---|
| `H-010` | WORDING_ERROR, critical | Expected `DIFFERS / WORDING_DIFF`, got `NEEDS_SPECIALIST / LOW_CONFIDENCE_MATCH`: the tool abstained where the label wants the difference shown. In `llm` mode the item was not returned at all (`NOT_A_DRAFT`) |
| `H-027` | AMBIGUOUS | A ruling for a personal case was not extracted in any mode: the writer is shown nothing for it |
| `H-033` | WORDING_ERROR, critical | The labeled item is right; the model added an item no label expects (`NEEDS_SPECIALIST / INTERPRETIVE_CLAIM`) |

**Stability.** Held-out, `merged`, three runs: 1 item of 59 did not end the same way (`H-040`: the
personal ruling was returned in two runs and missing in one). No item changed from one status to
another.

**Findings on labels.** No label was changed (`docs/DECISIONS.md` D-27).

- *Unlabeled sentences returned as claims.* In `llm` or `merged` mode the model returned the
  writer's closing sentence as an `interpretive_claim` in `T-001`, `T-006`, `T-018`, `T-022`,
  `T-025` (tune) and `H-017`, `H-033`, `H-036` (held-out). The tune sentences were read: three are
  the writer's own exhortation (for example «فباب التوبة مفتوح ما دامت الروح في الجسد»), which the
  extraction prompt says not to extract; the one of `T-018` («فمن صلى في بيته بلا عذر فهو آثم»)
  continues the ruling the case already labels, and the one of `T-025` («فلا تبع ما لم يتبين
  صلاحه») restates the hadith as an instruction. The labels follow the form of the sentence (D-26
  item 3) and take no side, so no outside source bears on them; they stand, and each of these is
  counted as a returned item with no label. The cost to the writer is a cautious extra
  `NEEDS_SPECIALIST` card, never a `MATCH`. Whether `T-018` and `T-025` should carry a second claim
  label is a limit of the set; it was not changed after seeing the tool's output.
- *`H-010`.* The label stands (section 6 item 8, and the package's own test example). The tool's
  answer is a cautious miss, of the kind section 6 item 7 foresaw for other cases.

**Limits.**

- 85 cases, 59 held-out expected items: a small sample. One item is 1.7 % of a held-out number.
- One model, one day, one run reported. The model is not deterministic: an earlier full run the
  same day (replaced because its stability table compared spans by exact offsets) gave held-out
  `merged` status 56 / 59 and cases right 47 / 51, with `H-041` ending
  `NEEDS_SPECIALIST / UNCLEAR_ATTRIBUTION` in one run of three and `MATCH` in the other two, and
  tune `T-027` not extracted in `merged` mode. Both runs had zero false confirmations.
- The 35 added cases are not blind (section 8), and the held-out split is not fully unseen for the
  reference parser (the note of 2026-10-03 above). This run exposed nothing more: the report and
  the console show held-out cases by id only, and no held-out draft was read to write this section.
- Latency was measured on a developer machine, one draft at a time, with the corpus already
  loaded; it is the provider's latency on that day, not a service-level number.
- `regex` mode cannot answer a request with the scope message: only the LLM says an input is not
  a draft. Its 0 / 2 is a property of the baseline, not a regression.
- Not measured: whether a generated explanation is true (only that it passed the validator), and
  the `citedReference` and `attributionPhrase` fields of the model's output.
- Nothing was fixed in this step. The failures above are the input of the next one (P15), which
  may tune on the tune split only.

## 12. Results after the fix loop (2026-10-04)

Full report: `eval/results/2026-10-04-p2-e2bfaf5a3ad2.md`. Before: `…-p14.md` (section 11).
What was changed and why: `docs/DECISIONS.md` D-28.

- **Date:** 2026-10-04. **Corpus version:** `p2-e2bfaf5a3ad2` (quran, bukhari, muslim).
- **Model:** provider `openai`, model `gpt-5.6-luna`, time budget 15 s. Extraction prompt
  version 3, explanation prompt version 2.
- **No person has reviewed the cases.** They were drafted and checked by an AI assistant
  (section 1).

**What was fixed, on the tune split only.** Four general rules, each with a unit test:

| # | Cause | Rule | Tune cases it concerns |
|---|---|---|---|
| 1 | The model returned the writer's own remark as a claim | The prompt defines a claim by its form: a conclusion from a named text, or the words of a ruling (prompt version 2) | `T-001`, `T-006`, `T-018`, `T-022`, `T-025`, `T-027` |
| 2 | «يقول النبي ﷺ» was outside the regex list | A verb of speech is read in the past and the present tense | `T-030`, `T-032` |
| 3 | A ruling was found only by the LLM | The regex extractor reads eight claim forms (`CLAIM_PATTERNS`) | `T-018`, `T-027` |
| 4 | The model called a verse attributed to the Prophet ﷺ `quran` (a false confirmation, `llm` mode, one run) | The kind is what the draft claims, never what the model recognises (prompt version 3) | `T-012` |

No label was edited, no held-out draft was read, and no threshold was changed.

**Release gate: PASS** (before: PASS). Zero false confirmations on the 23 critical held-out cases
in `merged` and in `regex` mode; no `ERROR` item carried evidence in any run.

**The critical cases, stated exactly.** The gate counts false confirmations only; it does not say
that every critical case is as labeled. Of the 23 critical held-out cases, in `merged` mode:

| Result | Cases |
|---|---|
| Fully as labeled | 21 / 23 |
| Wrong, ending in a referral to a specialist (`H-010`, `H-033`) | 2 / 23 |
| A false confirmation (a `MATCH` the label does not support) | 0 / 23 |

In `regex` mode 19 / 23 are fully as labeled and none is a false confirmation. On the tune split
all 13 critical cases are as labeled in `merged` mode. The two held-out misses are on the safe
side: the tool abstains (`H-010`) or adds a referral card (`H-033`). They were not fixed, because
no tune case shows the same failure and a fix designed from a held-out case would spoil the
held-out result.

**Before and after, held-out split (the reported result).**

| Metric | regex before | regex after | merged before | merged after |
|---|---|---|---|---|
| False confirmations / `MATCH` returned (primary) | 0 / 17 | 0 / 17 | 0 / 20 | 0 / 20 |
| Status accuracy | 46 / 59 | 48 / 59 | 57 / 59 | 58 / 59 |
| Reason-code accuracy | 46 / 59 | 48 / 59 | 57 / 59 | 57 / 59 |
| Source retrieval | 37 / 41 | 37 / 41 | 41 / 41 | 41 / 41 |
| Extraction recall | 47 / 59 | 49 / 59 | 58 / 59 | 59 / 59 |
| Extraction precision | 47 / 47 | 49 / 49 | 58 / 59 | 59 / 60 |
| Abstention | 13 / 21 | 15 / 21 | 20 / 21 | 21 / 21 |
| Requests given the scope message | 0 / 2 | 0 / 2 | 2 / 2 | 2 / 2 |
| Cases right | 36 / 51 | 38 / 51 | 48 / 51 | 48 / 51 |

**The two groups of cases, before → after** (cases right; status accuracy).

| Split, mode | First 50 | 35 added |
|---|---|---|
| Held-out, `merged` | 28 / 30 → 28 / 30; 30 / 32 → 31 / 32 | 20 / 21 → 20 / 21; 27 / 27 → 27 / 27 |
| Held-out, `regex` | 23 / 30 → 23 / 30; 26 / 32 → 26 / 32 | 13 / 21 → 15 / 21; 20 / 27 → 22 / 27 |
| Held-out, `llm` | 27 / 30 → 28 / 30; 30 / 32 → 31 / 32 | 18 / 21 → 18 / 21; 26 / 27 → 26 / 27 |
| Tune, `merged` | 20 / 20 → 20 / 20; 20 / 20 → 20 / 20 | 12 / 14 → 13 / 14; 17 / 17 → 17 / 17 |
| Tune, `regex` | 18 / 20 → 19 / 20; 19 / 20 → 20 / 20 | 11 / 14 → 14 / 14; 14 / 17 → 17 / 17 |
| Tune, `llm` | 17 / 20 → 20 / 20; 20 / 20 → 20 / 20 | 12 / 14 → 14 / 14; 17 / 17 → 17 / 17 |

False confirmations are zero in every cell of both groups, before and after. The first 50 are
the blind group; the regex gain on held-out is all in the 35 added, which are not blind
(section 8).

**How to read it.** On held-out, `merged` mode moved by one item: the personal ruling that no
mode extracted before (`H-027`) is now extracted and referred to a specialist, with level C where
the label says D. Everything else in `merged` mode is inside the model's run-to-run variation.
The clear gains are on the tune split, which the rules were tuned on, and in the regex baseline.

**Held-out cases still wrong in `merged` mode.** None is a false confirmation.

| Case | Category | What happened |
|---|---|---|
| `H-010` | WORDING_ERROR, critical | Unchanged: `NEEDS_SPECIALIST / LOW_CONFIDENCE_MATCH` where the label says `DIFFERS / WORDING_DIFF`. A cautious miss |
| `H-027` | AMBIGUOUS | Now extracted and `NEEDS_SPECIALIST`; the reason is `INTERPRETIVE_CLAIM`, the label says `PERSONAL_RULING` |
| `H-033` | WORDING_ERROR, critical | Unchanged: the labeled item is right; the model added a claim no label expects |

**Known limits: tune failures that no general rule fixes.**

- `T-019` in `regex` mode: only the LLM can say that an input is a request and not a draft.
- One unexpected item in a single run, a different one from run to run: a remark of the writer
  returned as a claim (`T-006`, `T-013`, `T-024`, `T-031`), or, in `llm` mode only, a quote the
  model returned with a letter changed, which `validateSpans` drops (`T-012`, `T-025`). In the
  reported run it is `T-024` in `merged` mode. None is a `MATCH`.

**Stability.** Held-out, `merged`, three runs: 2 items of 62 did not end the same way. Both are
an item no label expects, returned in one run of three (`H-004`, `H-031`:
`NEEDS_SPECIALIST`). No labeled item changed status.

**Limits.**

- **Held-out was run twice in this step, not once.** The first full run (prompt version 2,
  `…-p15-run1.md`) showed a false confirmation on a tune case in `llm` mode. Rule 4 was written
  for that tune case; the held-out failures of that run were seen by id and category only, and
  nothing was changed for them. The second run is the one reported. First run, held-out
  `merged`: false confirmations 0 / 19, status 57 / 59, cases right 46 / 51 (48 / 51 in its two
  other passes), with `H-041` ending `NEEDS_SPECIALIST / UNCLEAR_ATTRIBUTION` in one pass.
- The differences before and after are one or two items of 59, the same size as the variation
  between two runs of the same code. They do not show that held-out accuracy improved; they show
  that it did not get worse and that no false confirmation appeared.
- The notes of two held-out cases in section 9 name attribution phrases the regex list does not
  hold. They were not added (D-28).
- The limits of section 11 still hold: a small sample, one model, one day, cases not reviewed by
  a person, the 35 added cases not blind, latency from a developer machine.
- Cost: the longer prompt adds about 370 input tokens per draft (1154 → 1526 on held-out).
  Latency p50 / p95 in `merged` mode: 2372 / 7206 ms (before: 2513 / 7534 ms).

- **Latency after D-30 (2026-10-05).** With the explanations asked for beside the extraction and
  `LLM_REASONING_EFFORT=none`: p50 / p95 in `merged` mode 1524 / 3100 ms on held-out (before:
  2091 / 7689 ms), 96 output tokens per draft (before: 236), false confirmations 0 / 20, status
  58 / 59, release gate PASS; accepted explanations 14 / 17. Report:
  `eval/results/2026-10-05-p2-e2bfaf5a3ad2.md`; method and limits: `docs/DECISIONS.md` D-30.

## 13. Cost per review (2026-10-04)

Computed from the tokens the SDK reported in the run of section 12 and the provider's list price.

- **Price** of `gpt-5.6-luna`, read by the owner on the provider's pricing page on 2026-10-04:
  input $0.10, cached input $0.01, output $0.50, each per 1 million tokens.
- **Tokens per draft**, held-out, `merged` mode: 1526 in, 237 out (one extraction per draft, plus
  one call per explained item: 68 calls for 51 drafts).

```
cost per review = (1526 × $0.10 + 237 × $0.50) ÷ 1,000,000
                = ($152.60 + $118.50) ÷ 1,000,000
                = $0.00027      → about $0.27 per 1,000 reviews
```

| | Per review | Per 1,000 reviews |
|---|---|---|
| With the LLM (`merged`) | $0.00027 | $0.27 |
| Without the LLM (`regex`) | $0 | $0 |

One full evaluation (272 reviews with the LLM) costs about $0.07.

**Limits.**

- The evaluation drafts are short (1–4 sentences). Of the 1526 input tokens most are the fixed
  extraction prompt; a longer draft adds its own length, and each `DIFFERS` item adds one
  explanation call. The API accepts drafts up to `MAX_DRAFT_CHARS` (12,000 characters); the cost
  of a draft of that size was not measured.
- The input is counted at the full price. Whether the provider bills the repeated prompt at the
  cached price was not checked, so the figure is an upper estimate for input.
- A list price on one day. It covers the LLM only, not hosting.

**If the provider is unavailable.** The review goes on with the regex extractor alone and says so
(`LLM_UNAVAILABLE_REGEX_ONLY`). That mode is measured, not assumed: held-out status 48 / 59 and
zero false confirmations, against 58 / 59 with the LLM (section 12).

## 14. Comparison with checking by hand (protocol; not run yet)

**Why.** The guide scores innovation on a proven addition "compared with a named alternative or
current practice" (`docs/reference/challenge-guide.md` §2). The current practice of a writer is
to search each quote by hand. **This comparison has not been run. No number below is a result
until a person fills the table.**

**The named alternative.** A writer checks a draft by hand: Quran quotes on quranpedia.net, hadith
quotes on dorar.net.

**The drafts.** 12 tune cases, never held-out. Nine hold one error to catch, one holds a saying
that is in none of the three sources, and two are correct, so that the checker cannot assume
every draft is wrong:

| Kind | Cases |
|---|---|
| Wording error | `T-008`, `T-009`, `T-010`, `T-023` |
| Wrong reference | `T-011`, `T-012`, `T-013`, `T-021`, `T-022` |
| Not in the covered sources | `T-014` |
| Correct | `T-001`, `T-003` |

**Steps for the person.**

```
1. Someone else copies the 12 drafts into a document in a mixed order, without ids or notes.
2. For each draft: start the stopwatch, check every quote by hand on the two sites,
   write down what is wrong (wording, reference, not found, or nothing), stop the stopwatch.
3. Compare each answer with the case's label. Count the drafts answered as labeled.
4. Fill the table. Record who checked, the date, and whether they knew the cases before.
```

**Results.**

| | By hand | Azw (`merged`) |
|---|---|---|
| Drafts answered as labeled | not run | 12 / 12 (run of section 12) |
| Time per draft | not run | p50 2.3 s, p95 7.5 s (all 34 tune drafts) |
| Shows the source text and a word-level difference | — | yes |

**Limits to state with the result.** One person and 12 short drafts. The tool's rules were tuned
on these same tune cases, so its 12 / 12 is not a blind result; the blind numbers are those of
the held-out split (section 12). The person who labeled or built the cases knows the answers and
should not be the checker.
