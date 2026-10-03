# Backlog

Ideas and work that are outside the scope of the current prompt (AGENTS.md section 9). Nothing here
is built until it is moved into a prompt's scope.

## Moved out of scope during reviews

- API (P6): `ReviewItem.evidence[].record` is a full `SourceRecord`, so the response would carry
  `searchText` and `searchVariants`. They are retrieval keys, not source text. Decide in P6 whether
  the API strips them, so that no client can display them as scripture (AGENTS.md §2 rules 1–2).
- Corpus: read the 81 ayat where mushaf 2 and mushaf 1 differ in letters other than ا و ي ء
  (`data/corpus/build-report.json`, `quran.uthmaniVariant.otherLettersDiffer`). Not hand-checked.

## Ideas for after the challenge

- Normalization: more honorific phrases found in the hadith corpus and left in `searchText` —
  «عز وجل» (310), «عليه السلام» (150), «تبارك وتعالى» (57), «عليهما السلام» (17), «رضي الله عنهن» (3).
- Normalization: Persian/Urdu keyboard letters (ی U+06CC, ک U+06A9), Extended Arabic-Indic digits
  (U+06F0–U+06F9), Arabic presentation forms (U+FB50–U+FEFC, e.g. ﻻ, ﷲ), marks outside the listed
  ranges (U+0610–U+061A, U+08D3–U+08FF).

## Extension points not yet implemented
