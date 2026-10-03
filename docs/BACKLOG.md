# Backlog

Ideas and work that are outside the scope of the current prompt (AGENTS.md section 9). Nothing here
is built until it is moved into a prompt's scope.

## Moved out of scope during reviews

- API (P6): `ReviewItem.evidence[].record` is a full `SourceRecord`, so the response would carry
  `searchText` and `searchVariants`. They are retrieval keys, not source text. Decide in P6 whether
  the API strips them, so that no client can display them as scripture (AGENTS.md §2 rules 1–2).
- Corpus: read the 81 ayat where mushaf 2 and mushaf 1 differ in letters other than ا و ي ء
  (`data/corpus/build-report.json`, `quran.uthmaniVariant.otherLettersDiffer`). Not hand-checked.

- References (P3): citation forms the parser does not resolve. Surah by number («[2:153]» is
  returned as `unknown`); a list of ayat («(البقرة: 153، 155)» keeps the surah only); two ayah
  groups («آية 3 وآية 4» keeps the first); a bare «البقرة: 153» outside brackets; the surah without
  «سورة» after an ayah («(الآية 153 من البقرة)» is `unknown`); a hadith number after a group
  («متفق عليه (1907)» drops the number) or after «ح» («رواه مسلم ح 2699» drops the number);
  «رواه البخاري تعليقاً» is read as a plain «رواه البخاري».
- References (P3), for the status rules in P5: a reference that is `unknown`, or that was read only
  in part (the forms above), must never count as a reference that was checked and found correct.
  Otherwise a wrong reference in one of these forms would pass unreported.
- References (P3), found in the review of 2026-10-03 and left for the fix loop (P15, tune split
  only). Each can lead to a wrong DIFFERS, none to a wrong MATCH:
  - A reference after the quote is attached at any distance within the sentence («قال ﷺ: «…» وهذا
    يشبه ما ورد في سورة البقرة» attaches the surah to the hadith). Only the reference before the
    quote has a word limit.
  - A bare collection name in round brackets is a citation («كل (مسلم) مطالب»), while a bare surah
    name counts only in square brackets.
  - «في سورة البقرة: 3 قصص» is read as ayah 3.
  - «متفق عليه عند أهل العلم» is read as a citation of al-Bukhari and Muslim.
  - The passive «رُوِيَ» is read as «روى» («رُوِيَ مسلم»).
  - «رواه البخاري في حديث طويل», «في رواية أخرى» and «في الجامع الصحيح» are `unknown`, like a
    citation of another book of the author.
- References (P3): `ReviewItem.citedReference.parsed` is still `unknown` in `src/core/types.ts`.
  Decide in P6 whether the API schema uses `ParsedReferenceSchema` from `src/core/references`.

## Ideas for after the challenge

- Normalization: more honorific phrases found in the hadith corpus and left in `searchText` —
  «عز وجل» (310), «عليه السلام» (150), «تبارك وتعالى» (57), «عليهما السلام» (17), «رضي الله عنهن» (3).
- Normalization: Persian/Urdu keyboard letters (ی U+06CC, ک U+06A9), Extended Arabic-Indic digits
  (U+06F0–U+06F9), Arabic presentation forms (U+FB50–U+FEFC, e.g. ﻻ, ﷲ), marks outside the listed
  ranges (U+0610–U+061A, U+08D3–U+08FF).

## Extension points not yet implemented
