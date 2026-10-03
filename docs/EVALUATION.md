# Evaluation set

The labeled cases Azw is measured against. They were written on 2026-10-02, before any matching
code existed (there was no `src/` directory), so the matching logic cannot have been tuned to them.

- `eval/cases/tune.jsonl` — 20 cases. Thresholds and rules may be tuned on these only.
- `eval/cases/heldout.jsonl` — 30 cases. Never used for tuning; reported as the result.
- `scripts/check-cases.ts` — checks the labels against `data/corpus` (`npx tsx scripts/check-cases.ts`
  or `npm run check:cases`). The rules are in `scripts/lib/cases.ts`, tested in `scripts/lib/cases.test.ts`.

Corpus version at labeling time: `p0-a6d2d36b84e8` (`data/corpus/manifest.json`).

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
| Read all 50 cases | `tune.jsonl`, `heldout.jsonl` | — | — | Not done by a person |
| Specialist review of the critical cases | 21 cases: WORDING_ERROR, WRONG_REFERENCE, ADVERSARIAL | — | — | Not done (no specialist was available) |

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
| `id` | `T-001`…`T-020` (tune), `H-001`…`H-030` (held-out) |
| `critical` | `true` for WORDING_ERROR, WRONG_REFERENCE and ADVERSARIAL |
| `draft` | The writer's input: 1–4 sentences in the style of a da'wah post |
| `expected[].quote` | The quoted span. An exact substring of `draft` that occurs once |
| `expected[].kind` | What the draft presents the quote as (`ReviewItem.claimedKind`): `quran`, `hadith`, `unclear_attribution`, `interpretive_claim`. A verse introduced with «قال رسول الله ﷺ» has kind `hadith` |
| `expected[].status` | `MATCH`, `DIFFERS`, `NOT_FOUND` or `NEEDS_SPECIALIST` |
| `expected[].recordIds` | See below. Empty for `NOT_FOUND` and for claims |
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
| EXACT | 10 (4 + 6) | no | `MATCH` |
| ORTHOGRAPHIC | 6 (3 + 3) | no | `MATCH`; `DIFFERS` here is a failure |
| WORDING_ERROR | 8 (3 + 5) | yes | `DIFFERS` |
| WRONG_REFERENCE | 8 (3 + 5) | yes | `DIFFERS` |
| NOT_IN_SOURCES | 8 (3 + 5) | no | `NOT_FOUND`, never worded as false or fabricated |
| AMBIGUOUS | 5 (2 + 3) | no | `NEEDS_SPECIALIST` |
| ADVERSARIAL | 5 (2 + 3) | yes | No `MATCH` for anything unsupported; a request gives zero items and the scope message |

The 20/30 split of 6, 8, 8 and 8 does not divide evenly (2.4, 3.2, 3.2, 3.2 for tune). The spare
tune case went to ORTHOGRAPHIC, the largest remainder.

The two cases adapted from the package's test examples:

- «سؤال يتضمن آية منقولة بخطأ» → `H-010` (a question containing الذاريات 56 with two words swapped).
- «أعطني حديثاً يثبت هذا الكلام» → `T-019` (a request; zero items and the scope message).

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

No case uses the last four yet. `scripts/lib/cases.ts` takes its list from `src/core/status`,
which since P11 holds the hadith matcher's `REF_MISMATCH_COLLECTION`, `REF_MISMATCH_NUMBER` and
`REF_NOT_AGREED_UPON`.

`REF_MISMATCH_NUMBER` is accepted by the checker but no case uses it yet.

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
9. **Not covered by this set:** a wrong hadith number (`REF_MISMATCH_NUMBER`), quotes with ayah
   numbers between the ayat («… (1) … (2)»), records that are `pending`, texts from the 71 missing
   Muslim numbers, hadith qudsi, and paraphrase presented as a quote.

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

## 8. Case index

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
<!-- AUTO:case-index:END -->
