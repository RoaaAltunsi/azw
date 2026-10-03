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
  returned as `unknown`); a list of ayat («(البقرة: 153، 155)» keeps the surah only, `partial`); two ayah
  groups («آية 3 وآية 4» keeps the first); a bare «البقرة: 153» outside brackets; the surah without
  «سورة» after an ayah («(الآية 153 من البقرة)» is `unknown`); a hadith number after a group
  («متفق عليه (1907)» drops the number, `partial`) or after «ح» («رواه مسلم ح 2699» drops the
  number); «سورة البقرة (153)» outside a bracket keeps the surah only;
  «رواه البخاري تعليقاً» is read as a plain «رواه البخاري».
- References (P3), for the status rules in P5: a reference that is `unknown` or `partial: true`
  must never count as a reference that was checked and found correct. Otherwise a wrong reference
  in one of these forms would pass unreported. The forms above that are read in part without the
  parser consuming the rest («آية 3 وآية 4», «ح 2699», «سورة البقرة (153)», «تعليقاً») carried no
  flag. Done in P5: they are `partial` now (`docs/ARCHITECTURE.md`, "A number the reference did
  not take in").
- References (P3), review of 2026-10-03 (second pass): other books whose title contains a
  collection phrase are still read as the collection: «صحيح سنن الترمذي», «ضعيف سنن أبي داود»
  (al-Albani), «زوائد …». Only «شرح», «بشرح» and «مختصر» before the phrase are caught. «صحيح» and
  «ضعيف» cannot be added blindly: «حديث صحيح متفق عليه» is a real citation.
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

- Corpus index (P4): a quote that mixes a mushaf spelling and an everyday spelling of two listed
  words («رحمت» as in the mushaf, «نعمة» in everyday spelling, in one ayah or over neighbouring
  ayat) is not an exact hit on any single layer. It reaches the matcher as a close candidate only.
  Not solved, by instruction.
- Corpus index (P4), for the matchers (P5, P11):
  - A hit on "everyday" means a spelling bridge only if "default" has no hit for the same quote
    (`docs/DECISIONS.md` D-10 item 2).
  - `candidates()` returns nothing for a one-word quote, and scores each ayah of a multi-ayah quote
    separately. A helper that searches every layer of every collection for one draft span could
    live in the index if P5 ends up repeating that loop.
  - Hit offsets are in layer text. For "default" they map to `exactText` through
    `normalizeWithMap` on the record with the layer's options. The "uthmani" and "everyday" texts
    are not a normalization of `exactText`, so there the matcher must align on words.
- Corpus index (P4), deployment (P6/P14): `loadCorpus` reads `data/corpus` and `data/aliases` from
  `process.cwd()`. The Next.js build must be told to ship those files with the API route
  (`outputFileTracingIncludes`), and the first request pays about 0.8 s of load.
- Corpus index (P4), memory: about 160 MB retained. The index keeps every `SourceRecord` whole, and
  the "everyday" layer repeats the text and bigrams of "default" for unlisted ayat. Reduce only if
  the host's memory limit requires it.
- Core boundary: the lint rule forbids `fetch`, Next.js, React and the app layers in `src/core`,
  but not `node:fs` or other Node built-ins.

- Matcher and status rules (P5), for the orchestrator (P6):
  - A one-word quote such as «الله» is an exact hit in 2155 ayat, all returned (about 80 ms). The
    extractor (P9) should not produce one-word quotes, or the orchestrator caps what is shown.
  - `ReviewItem` has no field for `layer` / `spelling`. A UI that wants to say "matched in another
    spelling" needs one (an API contract change).
  - `claimLevel: "D"` must be set by the extractor (P10) for a ruling on a personal case.
- Quran matcher (P5), needs the owner: 32 ayat of mushaf 2 pasted as they are end `DIFFERS`
  («فَبِأَيِّ ءَالَآءِ رَبِّكُمَا تُكَذِّبَانِ» ×31, 53:55): no Uthmani-only sign and no superscript alef.
- Quran matcher (P5), needs the owner: a search variant that keeps the superscript alef as its own
  character would turn the "spelt-out alef" inference into a plain comparison. It needs a corpus
  rebuild (new `corpusVersion`) and a re-measurement against Tanzil and quran.com pastes
  (`docs/DECISIONS.md` D-13).
- Quran matcher (P5): Tanzil and quran.com Uthmani pastes were not re-measured after D-13.
- Status rules (P5): an `unclear_attribution` whose words are in a source could show that record
  as evidence without changing the status.
- Fuzzy alignment (P5): a wrong word at the very start or end of a quote is outside the local
  stretch and shows as `insert`, not as `replace` of the neighbouring source word. Left so on
  purpose: at the edge of a fragment the tool cannot tell an added word from a changed one.
- References, hadith (P11): `REF_MISMATCH_COLLECTION`, `REF_MISMATCH_NUMBER` and
  `REF_NOT_AGREED_UPON` join `src/core/status/reason-codes.ts` with the hadith matcher;
  `scripts/lib/cases.ts` adds them to the core list until then.

## Ideas for after the challenge

- Normalization: more honorific phrases found in the hadith corpus and left in `searchText` —
  «عز وجل» (310), «عليه السلام» (150), «تبارك وتعالى» (57), «عليهما السلام» (17), «رضي الله عنهن» (3).
- Normalization: Persian/Urdu keyboard letters (ی U+06CC, ک U+06A9), Extended Arabic-Indic digits
  (U+06F0–U+06F9), Arabic presentation forms (U+FB50–U+FEFC, e.g. ﻻ, ﷲ), marks outside the listed
  ranges (U+0610–U+061A, U+08D3–U+08FF).

## Extension points not yet implemented
