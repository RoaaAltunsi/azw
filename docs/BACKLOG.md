# Backlog

Ideas and work that are outside the scope of the current prompt (AGENTS.md section 9). Nothing here
is built until it is moved into a prompt's scope.

## Moved out of scope during reviews

- API (P6): `ReviewItem.evidence[].record` was a full `SourceRecord`. Done in P6: the API record
  has no `searchText`, `searchVariants` or `matnText` (`docs/DECISIONS.md` D-17 item 2).
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
- References (P3): `ReviewItem.citedReference.parsed` was `unknown`. Done in P6: it is
  `ParsedReferenceSchema` (`docs/DECISIONS.md` D-17 item 1).

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
- Corpus index (P4), deployment (P14): `loadCorpus` reads `data/corpus` and `data/aliases` from
  `process.cwd()`. Done in P6: `outputFileTracingIncludes` in `next.config.ts`. Still to check on
  the host (P14): that the files are there, and the first request's 0.8 s of load.
  `data/corpus/build-report.json` ships too (the pattern is `*.json`); it is not read at runtime.
- Corpus index (P4), memory: about 160 MB retained. The index keeps every `SourceRecord` whole, and
  the "everyday" layer repeats the text and bigrams of "default" for unlisted ayat. Reduce only if
  the host's memory limit requires it.
- Core boundary: the lint rule forbids `fetch`, Next.js, React and the app layers in `src/core`,
  but not `node:fs` or other Node built-ins.

- Matcher and status rules (P5), for the orchestrator (P6):
  - A one-word quote such as «الله» is an exact hit in 2155 ayat (about 80 ms). Done in P6: the
    orchestrator returns at most 5 occurrences per item. The matcher still builds every candidate
    (340 ms for that one quote on the first request of a running server), and a draft may hold 40
    items, so the extractor (P9) should not produce one-word quotes. Done in P9: a one-word quote
    is dropped, except inside `﴿…﴾` (`docs/DECISIONS.md` D-20 item 7).
  - `ReviewItem` has no field for `layer` / `spelling`. A UI that wants to say "matched in another
    spelling" needs one (an API contract change).
  - `claimLevel: "D"` for a ruling on a personal case is set by the LLM extractor (done in P10);
    without an LLM no interpretive claim is detected at all.
- Quran matcher (P5): Tanzil and quran.com Uthmani pastes were not re-measured after D-13 (the
  mushaf 2 text was: 6236 of 6236 ayat end `MATCH`).
- Hadith matcher (P11), from `docs/DECISIONS.md` D-6 item 4: the reason sentences for
  `REF_MISMATCH_COLLECTION` and `REF_NOT_AGREED_UPON` must say the text was not found in the
  tool's copy of the other book, never that the book does not contain it (the corpus has gaps).
  Done in P11 (`docs/DECISIONS.md` D-22).
- Hadith matcher (P11), for later prompts:
  - A close hadith candidate needs three words of the quote (`MIN_MATCHED_WORDS`, D-22 item 9;
    it fixed `T-015`). Set on one tune case: measure it in the evaluation. The Quran matcher has
    no such minimum; a three-word sentence that shares two words with an ayah still ends
    `LOW_CONFIDENCE_MATCH`.
  - A close Quran candidate and a close hadith candidate with different wordings are
    `AMBIGUOUS_CANDIDATES` whatever the claimed kind (`decide()` compares the kind for exact hits
    only). A misquoted verse that a hadith record quotes in another wording could so end
    `NEEDS_SPECIALIST` and not `DIFFERS`. Not seen in the tune cases; measure in the evaluation.
  - «متفق عليه» is compared as a wording: a hadith that both books hold in slightly different
    words ends `REF_NOT_AGREED_UPON` for the wording one of them has (D-22 item 1). Telling that
    two records are the same hadith needs data the corpus does not have (the Dorar pointer,
    P11b, may help).
  - Hadith qudsi (D-22 item 2): words of the Prophet ﷺ introduced with «قال الله تعالى» in «…»
    end `MATCH`; the wrong speaker is not reported. A kind of its own from the extractors
    ("God's words, verse or hadith qudsi") plus a field in the data would close it.
  - A cited book outside the corpus («رواه الترمذي») on a text found in the Sahihayn ends
    `REF_NOT_CHECKED` with the general sentence. A sentence of its own («الكتاب المذكور ليس من
    المصادر المغطاة») would be clearer (a new reason code: an API change).
  - The UI shows `claimedKind` «آية قرآنية» on a hadith qudsi item that ends `MATCH` on a hadith
    record: the label is the draft's claim. Not looked at in P11 (no UI change in scope).
  - The reason sentences cannot name the cited book (`reasonAr` fills `{ref}`, `{kind}` and
    `{coverage}` only), so they say «الكتاب المذكور في المسودة».
  - No matn layer: a quote is found in the chain as well as in the text, and a one-word change in
    a narrator's name is a wording difference like any other.
- Hadith records (D-5): 250 Bukhari and 30 Muslim records are pending because their text does not
  open with a formula of direct transmission. One can be released with an entry in
  `data/review/reviewed.json` that quotes a source naming it as connected under its number. A
  script that reads Dorar's grade line for each of them would do this in bulk.
- Status rules (P5): an `unclear_attribution` whose words are in a source could show that record
  as evidence without changing the status.
- Fuzzy alignment (P5): a wrong word at the very start or end of a quote is outside the local
  stretch and shows as `insert`, not as `replace` of the neighbouring source word. Left so on
  purpose: at the edge of a fragment the tool cannot tell an added word from a changed one.
- References, hadith (P11): `REF_MISMATCH_COLLECTION`, `REF_MISMATCH_NUMBER` and
  `REF_NOT_AGREED_UPON` join `src/core/status/reason-codes.ts` with the hadith matcher;
  `scripts/lib/cases.ts` adds them to the core list until then. Done in P11.

- Orchestrator and API (P6), for later prompts:
  - `AGENTS.md` §6 showed the contract as it was before P6. Done on 2026-10-03, on the owner's
    instruction: the API record, the typed `parsed`, the searched coverage and the pipeline order
    are now as in `docs/DECISIONS.md` D-17 (see D-18).
  - A `ReviewItem` does not say which evidence entries belong to one occurrence. A client can tell
    from `ayahRange` and the order, but a field (an occurrence index) would be clearer. An API
    contract change, like `layer` / `spelling` above.
  - A quote whose claimed kind has no registered matcher (none today: both kinds have one) ends `NOT_FOUND`
    with a sentence that names only what was searched. A result-level warning
    («KIND_NOT_SEARCHED») would let the UI say so once for the whole draft.
  - An item that ends `ERROR` leaves no trace beyond the `ERROR` count in the request log. A hook
    in `ReviewDeps` that reports the class of the exception would help operations, as long as it
    never carries a message.
  - Rate limit: a shared store for production; per-instance memory is the demo's limit (D-17 item 10).
  - Merge: a verse quoted inside a hadith quote is dropped as an overlapping span. Decided in P9:
    the rule stays (`docs/DECISIONS.md` D-20 item 1).
  - `LlmPort` is declared in `src/core/review.ts`; the timeout is the adapter's (D-21 item 7), and
    `deps.now` is still not read.
- Explanation and report (P12), for later prompts (`docs/DECISIONS.md` D-23):
  - Not run against the provider: how often the model's note passes the validator, how often it
    answers `NULL`, and the added latency are unmeasured (P14). A review can take up to twice
    `LLM_TIMEOUT_MS` (`docs/DECISIONS.md` D-30: explanations now start beside the extraction).
  - The validator cannot tell a true note from a false one. Done in P13 as far as a validator
    can: a closed vocabulary (`docs/DECISIONS.md` D-24). What is left: a false statement in the
    allowed words, and a note that quotes back an instruction of the draft. Requiring a quoted
    word of a diff op, or checking which side a quoted word is said to be on, would narrow it
    further; measure first (P14).
  - A note that quotes a source word without its diacritics is rejected (verbatim), and the real
    Quran text is fully vocalised: expect rejections there. Comparing quoted segments through the
    normalization would accept them; measure before changing.
  - A rejected or failed explanation leaves no trace, not even a count in the request log.
  - Only the first occurrence is explained and reported; the card can show another.
  - The report's date is `YYYY-MM-DD` on the Gregorian calendar; no Hijri date.
  - The report has no "share" target (Web Share API) and no file download: clipboard only.
  - `AGENTS.md` §6 does not list `src/core/explain/` in its tree.

- Audit (P13), for later prompts (`docs/DECISIONS.md` D-24):
  - The vocabulary and prompt 2 of the explanation were probed on ten notes of one model. How
    often a real note is rejected, which words the list lacks, and whether the notes stay gentle
    are for the evaluation (P14). A word is added to `EXPLANATION_VOCABULARY` only if it cannot
    carry a grade, a ruling, an interpretation or a claim of a match; the prompt takes the list
    from the same constant, and its version changes with it.
  - A draft that holds `</draft>` still closes the delimiter early (D-21 item 8). Escaping it in
    the message to the model only (the lookup stays on the draft) would cost the quotes that
    hold the tag; not done.
  - `.next/cache` holds the value of `LLM_API_KEY` on a machine that built with one. It is
    ignored by git and not served; never share or archive that folder. On the host (P8), check
    that no build cache is published and that the response headers are as tested.
  - A log line's `detail` is free text by type. It holds a class name, schema paths or the
    corpus loader's message today; a typed union would make that a compile-time fact.
  - `src/app/global-error.tsx` was rendered in a test only, never forced in a browser.
  - Not checked in P13: a deployed host's logs (P8), the provider's handling of a request.

- UI (P7), for later prompts:
  - API gap: a `ReviewItem` has no occurrence index, so the UI reads the places of a quote from
    the order of the evidence and `ayahRange` (`groupOccurrences`, `docs/DECISIONS.md` D-19
    item 5). The field asked for above would replace that rule.
  - API gap: `MAX_DRAFT_CHARS` is not in `GET /api/v1/health`, so the UI cannot show a character
    count against the limit; it shows the API's `DRAFT_TOO_LONG` sentence after the request.
  - API gap: the forms the extractor reads are not in the API. The "no quotes found" sentence
    (`extract.formsNote` in `src/i18n/ar.ts`) was rewritten in P9 and is tied to
    `ATTRIBUTION_PATTERNS` by a test (D-20 item 8). The API still does not list the forms.
  - `/privacy` must change with `docs/PRIVACY.md` (done in P10 for the LLM provider; again when
    a provider is added).
  - PWA files (manifest, icons, service worker) were not part of P7.
  - The home page names no source until `GET /api/v1/health` answers (about 0.8 s on a cold
    server). A server component cannot call the handler without importing `src/server`.
  - Not run in P7: a screen reader, Firefox and Safari, a real phone.
  - A copy of the matched fragment only was left out: the prompt allows `exactText` +
    `citation.display` (D-19 item 4).
- Regex extractor (P9), for later prompts:
  - Forms not read: `{…}` around a verse, single quotes, and phrases outside the list («يقول
    النبي», «قال الله عز وجل» without «تعالى», «رُوي», «جاء عن النبي», «كما في الصحيحين»). Each is
    one entry of `ATTRIBUTION_PATTERNS`; add them from the tune split only (P15).
  - An unmarked quote runs to the sentence end, with the writer's own words after it if there are
    any, and a full stop inside it ends it. The LLM's span replaces it when the two share half or
    more (D-21 item 3); with less in common the regex span is kept.
  - An unbracketed reference «سورة البقرة: 153» after an unmarked verse is not a stop: «سورة» is
    also a word of hadith texts. The extractor could take the reference parser's spans if
    `Extractor` received the aliases (a signature change).
  - A verse inside a marked hadith quote is not checked on its own (D-20 item 1).
  - Hadith matcher (P11), from D-20 item 9: «قال الله تعالى» is also a form of citing a hadith
    qudsi. A text claimed `quran` through an attribution phrase (not through `﴿…﴾`) that is found
    only in a hadith record must not end `DIFFERS` / `KIND_MISMATCH`. Either the extractor gives
    such a quote a kind of its own, or `decide()` treats it as a hadith claim; test with
    «قال الله تعالى: «أنا عند ظن عبدي بي»». Done in P11: `decide()` reads it as a hadith claim
    (`docs/DECISIONS.md` D-22 item 2).
- Corrections and the revised draft (`docs/DECISIONS.md` D-25), for later prompts:
  - A wrong word at the very start or end of a quote is reported and not corrected (the diff
    shows it as `insert`: "Fuzzy alignment" above). A whole ayah whose last word is wrong is the
    common case; the matcher would have to say that the source record ends there.
  - No correction for a quote over several ayat, for a wording whose reference is also wrong (two
    changes in one item), for `MATCH_NO_REFERENCE` (adding the missing reference), or for the
    hadith reference mismatches.
  - A reference correction writes `citation.display` («سورة الشرح، الآية 6»), not the writer's own
    form («الشرح: 6»): the tool never composes a citation from numbers.
  - A wording correction puts the source's text with its diacritics and pause marks in a draft
    typed without them. A writer who wants it bare has to strip it; the tool does not edit a
    source text.
  - The revised draft is not reviewed again by the tool: the writer pastes it back. A «راجع
    المسودة المعدّلة» button would close the loop.
  - A quote in several places shows at most 5 of them, so a place beyond those cannot be chosen.
  - On a card whose applied place is not the one shown, nothing on the card says another place is
    applied; the draft view shows it.
  - Not looked at in a browser: a phone-width screen (the window could not be resized in the
    test session), a screen reader, Firefox and Safari.

- Evaluation, after the fix loop (P15: `docs/EVALUATION.md` section 12, `docs/DECISIONS.md` D-28).
  Tune on the tune split only:
  - The model still returns, in some runs, a sentence of the writer as an `interpretive_claim`
    that no label expects (one item in four tune runs of ten after prompt version 2; held-out
    `H-004`, `H-033`), and a hadith qudsi once came back as `unclear_attribution` (`H-041`). The
    extraction is not the same from run to run, although the temperature is 0.
  - A ruling for a personal case came back as level C, not D (`H-027`).
  - The regex extractor reads claims in eight fixed forms only, and cannot say that an input is a
    request (`T-019`): both are the LLM extractor's.
  - Attribution phrases still outside the regex list: «قال المصطفى», «جاء عنه», «رُوي», «قال الله
    عز وجل» without «تعالى». They were not added in P15 because the tune split has no case for
    them (two are named in the notes of held-out cases).
  - `H-010`: a misquoted verse inside a question ends `LOW_CONFIDENCE_MATCH`, not `DIFFERS`; in
    `llm` mode the model says `NOT_A_DRAFT` and the verse is not reviewed at all.
  - In merged mode the same quote is cut one character wider or narrower from run to run (the
    merge of a regex span and an LLM span).
  - The runner does not read `citedReference` and `attributionPhrase` of the model's output, and
    does not judge whether an explanation is true.
  - Latency with the LLM is 2.5 s p50 and 7.5 s p95 per draft; the regex result could be shown
    first.

## Ideas for after the challenge

- Normalization: more honorific phrases found in the hadith corpus and left in `searchText` —
  «عز وجل» (310), «عليه السلام» (150), «تبارك وتعالى» (57), «عليهما السلام» (17), «رضي الله عنهن» (3).
- LLM extractor (P10), for later prompts:
  - Not run against the provider: the model in `LLM_MODEL`, the prompt on real drafts and the
    latency are unmeasured (P14). `EXTRACT_PROMPT_VERSION` changes with any change of the prompt.
  - `AGENTS.md` §6 lists two warning codes in the `ReviewResult` comment; there are four now.
  - A failed LLM call leaves only the warning code in the request log. The class of the error (a
    fixed word, never a message) would tell a timeout from a refused key.
  - `llmConfigured` of `GET /health` is true for a provider no adapter exists for.
  - A regex quote without marks that shares less than half with the LLM's span keeps the long
    regex span (D-21 item 3). Measure on the tune split before changing the rule (P15).
  - `citedReference` and `attributionPhrase` of the model's output are dropped after validation;
    the evaluation (P14) has to call the port itself to read them.
- Normalization: Persian/Urdu keyboard letters (ی U+06CC, ک U+06A9), Extended Arabic-Indic digits
  (U+06F0–U+06F9), Arabic presentation forms (U+FB50–U+FEFC, e.g. ﻻ, ﷲ), marks outside the listed
  ranges (U+0610–U+061A, U+08D3–U+08FF).

## Extension points not yet implemented

- **Real progress for a review.** The percentage shown while a review runs is an estimate from
  elapsed time (D-29). A streamed response (one event per pipeline step) would make it real.
