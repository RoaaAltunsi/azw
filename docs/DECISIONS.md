# Decision log

Closed decisions about religious content, source handling, extraction, matching, and presentation.
They implement `AGENTS.md` §9: the tool does not grade hadith, interpret verses, or issue rulings.
Checks recorded here were performed by an AI assistant from published sources, not by a qualified
scholar. The owner may reverse a decision; none is awaiting approval.

Numbering is stable: **D-1 through D-31 are unchanged.** Supporting machine evidence lives under
`data/review/`; evaluation measurements live under `eval/results/`.

## Sources used for content decisions

| Source | Use |
|---|---|
| [Sahih al-Bukhari, Sultanate edition](https://shamela.ws/book/1681) | D-1, D-5, D-14 |
| [Sahih Muslim, Turkish edition](https://shamela.ws/book/711) and [Fuad Abd al-Baqi edition](https://shamela.ws/book/1727) | D-2, D-14 |
| [Dorar Hadith Encyclopedia](https://dorar.net/hadith) | D-5, D-6, sample verification |
| Ibn al-Salah, *Muqaddimah*, type 1, benefit 6 | Suspended reports, D-5 and D-20 |
| [Al-Suyuti, *Al-Itqan*, type 17](https://shamela.ws/book/11728) | Surah aliases, D-15 |
| Quranpedia mushafs 1 and 2; Tanzil “simple” text through api.alquran.cloud | Quran integrity and spelling, D-9, D-13, D-15 |

## D-1 — Bukhari split entries cite the integer number (2026-10-02)

The 26 source entries numbered like `402.2` are digital splits, not printed hadith numbers.
`citation.number` is the integer part, `citation.subNumber` preserves the full value, and the stable
id remains `bukhari:402.2`. Each split record is pending because it contains only part of the cited
entry; a sole hit becomes `NEEDS_SPECIALIST / SOURCE_NOT_REVIEWED`. Confirmed against the Sultanate
edition, which numbers these hadith with integers.

## D-2 — No grade without a reviewed, citable record (2026-10-02)

Only a reviewed hadith record carries the collection grade. Every pending record has no `grade`.
The 148 Muslim records without `arabicnumber` remain pending and cannot be approved because the
displayed source reference is absent; three are from Muslim’s introduction, outside the Sahih
proper. This enforces «لا ينسب حديث دون مصدر وحكم معتمد في البيانات».

## D-3 — Records excluded from collection approval (2026-10-02)

Collection approval never covers records with replacement characters, Bukhari split entries,
identical full-text blocks tied to multiple numbers, missing citation numbers, records held in
`data/review/held-records.json`, or records that fail D-5’s direct-transmission opener rule. Corpus
`p2-e2bfaf5a3ad2` contains 6,701 reviewed / 879 pending Bukhari records and 7,145 / 215 Muslim
records. Pending hits abstain; they never produce `MATCH`.

## D-4 — `matnText` is a narrow retrieval aid (2026-10-02)

`matnText` is stored only for one complete quoted segment introduced by an explicit attribution of
speech to the Prophet ﷺ and followed by nothing. It must be a verbatim substring of `exactText`, is
never displayed or used to decide status, and only improves retrieval. The narrow rule is retained
because a bad boundary must not become evidence.

## D-5 — Suspended or structurally uncertain reports remain pending (2026-10-02)

`bukhari:2819` opens «وقال الليث حدثني…». Dorar labels the entry «[معلق]», and the Sultanate
edition prints the same suspended form at [4/22](https://shamela.ws/book/1681/4468). Ibn al-Salah
distinguishes what Bukhari and Muslim transmit with a connected chain from suspended material and
notes that some suspended reports require examination. Therefore:

- `bukhari:2819` remains pending and carries no grade. Five reviewed connected occurrences remain
  available: `3424`, `5242`, `6639`, `6720`, `7469`.
- A record whose own text does not begin with حدثنا، حدثني، أخبرنا، أخبرني، or سمعت (optionally
  preceded by و) remains pending: 250 Bukhari and 30 Muslim records.
- This is a conservative structural rule, not a hadith classification. It knowingly over-holds
  connected continuations and cannot detect a suspension later in a record.
- Releasing a record requires source evidence tying that same wording and number to a connected
  report. Pending records never carry a grade in any status.

## D-6 — Conservative evaluation labels (2026-10-02)

- Uthmani-script paste `T-007` and ayah-bound spelling variant `H-008` are `MATCH` under D-9/D-13.
- Vague attribution such as «في الأثر» is `NEEDS_SPECIALIST`; the tool cannot infer a speaker.
- A hadith cited to an uncovered book is `NOT_FOUND`, with wording limited to covered sources and
  no judgment on the hadith.
- The single-collection mismatch labels stand. Dorar searches on two days found «خيركم من تعلم
  القرآن وعلمه» and «بلغوا عني ولو آية» outside Muslim results, and «الطهور شطر الإيمان» outside
  Bukhari results. Because search is not proof of absence, the UI says only that the wording was not
  found in the tool’s copy.
- `MATCH_REF_OK`, `UNCLEAR_ATTRIBUTION`, `INTERPRETIVE_CLAIM`, and `PERSONAL_RULING` are final codes.

## D-7 — Quran search retains honorific phrases (2026-10-03)

Quran normalization uses `keepHonorificPhrases: true`; deleting phrases such as «عز وجل» from a
draft could hide an insertion in a purported verse. Hadith retrieval may ignore honorific phrases,
but that normalization alone never decides a status.

## D-8 — Normalization boundaries (2026-10-03)

Punctuation separates words rather than joining them; direction marks are ignored. Strict Quran
search removes superscript alef U+0670 and bridges the verified «الملإ/نبإ» hamza forms. General
normalization does not rewrite mushaf spellings; those are handled only by D-9’s ayah-bound list and
the Uthmani search layer.

## D-9 — Quran spelling uses ayah-bound aliases and an Uthmani search layer (2026-10-03)

Owner decision. Sixty-six verified mushaf/everyday spelling pairs live in
`data/aliases/quran-spelling-variants.json` and apply only to their listed ayat. Broad folds such as
داود or إذن were rejected. Each ayah also carries a normalized, search-only Quranpedia mushaf-2
variant. It is never displayed, diffed, or cited; `exactText` remains the sole evidence text.

A genuine spelling error never ends `MATCH`. New pairs require reading both forms in the source,
binding them to exact ayat, testing every affected record, and documenting a new decision.

## D-10 — Corpus index invariants (2026-10-03)

The index addresses collection and search layer explicitly; every Quran ayah has its everyday
layer, aliases are schema-validated without silent skips, bigram containment uses distinct grams,
and search hits retain their source record. Citation display is source data, never composed by the
UI. Kind labels and citation formatting come through `kindMeta`; server loaders and cache stay out
of pure core. One shared schema validates corpus input.

## D-11 — An unread or partial reference is not treated as correct (2026-10-03)

If a cited reference cannot be parsed completely, the result is
`NEEDS_SPECIALIST / REF_NOT_CHECKED`; absence of a checked mismatch is not agreement. A parsed but
wrong known surah or collection still produces the relevant mismatch. This follows the package’s
requirement to state when evidence is insufficient.

## D-12 — Quran matcher, diff, and status boundaries (2026-10-03)

- A range citation matches only when the extracted text covers that exact consecutive range.
- A pending source record never produces `MATCH` or `DIFFERS`; it yields `NEEDS_SPECIALIST`.
- Exact hits of another kind may produce `KIND_MISMATCH`; fuzzy candidates never prove identity.
- `contentLevel`, unclear attribution, and interpretive/ruling claims are resolved before retrieval.
- Status rules use scores, kinds, references, and review state—not the presentation diff.
- The diff compares the draft with `exactText`; evidence is capped at five records and results at
  forty items. Tool wording says “reference in the source,” never “correct reference.”

## D-13 — Uthmani matching is allowed only for script evidence (2026-10-03)

Owner decision refining D-9. A word that differs from everyday `searchText` may use the Uthmani
variant only when the pasted span carries an Uthmani sign—U+0671, U+0653–U+065F, or U+06DF–U+06ED
except ۩—or that word carries U+0670, and it must not spell out an alef the mushaf writes above the
line. U+0670 and pause marks alone do not classify the whole span as Uthmani because the display
text also contains them.

Measured across all 6,236 ayat: 2,248 matched the default layer and 3,988 the Uthmani layer; ordinary
spelled-out errors remained rejected. A hit through either valid layer displays and diffs only
`exactText`.

## D-14 — Six held hadith records checked in independent editions (2026-10-03)

Five Muslim records were released after word-for-word checks in the Turkish edition:
`6172/2383` ([page 7369](https://shamela.ws/book/711/7369)), `3600/1453`
([4266](https://shamela.ws/book/711/4266)), `3944/1547`
([4668](https://shamela.ws/book/711/4668)), `2957/1221`
([3505](https://shamela.ws/book/711/3505)), and `7314/2912`
([8756](https://shamela.ws/book/711/8756)). `bukhari:2075` remains held: the source text merges
material in a way that cannot safely support one numbered citation; compare the Sultanate edition
[page 3301](https://shamela.ws/book/1681/3301). This was a six-record check, not a collection audit.

## D-15 — Remaining source-register decisions (2026-10-03)

- Quranpedia’s published SHA-256 for the gzip did not match the served gzip. The decompressed JSON
  is the integrity anchor; all 6,236 normalized ayat matched the independent Tanzil “simple” text
  letter-for-letter. The mismatch and both hashes remain recorded in the manifest/source register.
- Quran pause and structural marks are retained in `exactText`; a leading BOM is stripped.
- Empty hadith entries are skipped, not invented: 9 Bukhari and 203 Muslim source entries.
- Alternate surah names are accepted only after checking the Quran or recognized works. The alias
  «النساء القصرى» was added for al-Talaq from Al-Suyuti’s cited discussion; unverified popular names
  are not added.

## D-16 — Procedure for future religious/source decisions (2026-10-03)

Research approved or recognized sources first; compare an independent witness and measure the full
affected corpus where possible; choose the conservative outcome if evidence is insufficient;
implement and test it; then record the closed decision with sources, measurements, and limits.
Existing owner decisions remain fixed. Accounts, keys, deployment, screenshots, code licensing, and
submission remain owner responsibilities. This procedure is now mirrored in `AGENTS.md` §9.

## D-17 — Orchestrator and API v1 invariants (2026-10-03)

- Parsed references are typed data; clients receive `ApiSourceRecord`, which excludes `searchText`,
  `searchVariants`, and `matnText` by an allowlist.
- `coverage` contains only collections with a registered matcher. Limits are 40 items and five
  evidence records per item.
- Regex and LLM spans are validated against the draft, merged, deduplicated, then limited.
- `ERROR` carries no evidence. Diff and corrections are computed only after status selection.
- Warnings report degraded extraction and item limits; health exposes real coverage/version.
- API boundaries are schema-validated, rate-limited in memory, body-size limited, CORS allowlisted,
  and log metadata rather than draft content. The route returns stable error shapes.

## D-18 — Documentation and UI language follow the evidence boundary (2026-10-03)

Coverage is dynamic, source text is called «نص المصدر», and a citation is «المرجع في المصدر».
The tool does not call its own result «صحيح» or «موثّق»; collection titles and attributed grades in
records are the only exceptions. Copy controls copy source text/reference, not a claim of
authenticity. Architecture, API, privacy, sources, and UI strings were aligned to those terms.

## D-19 — UI evidence and accessibility choices (2026-10-03)

- IBM Plex Sans Arabic is the UI font and Amiri the quotation/Quran font. KFGQPC Hafs was rejected:
  it lacks U+0622 used by the corpus and its license forbids modifying the font.
- Coverage comes from the API; the UI never hard-codes searched books.
- Source text is quoted and visually separated from generated explanation; generated text is always
  labeled «شرح مولّد آلياً».
- Copying includes exact source text and citation. Repeated occurrences retain draft order.
- Client responses are schema-validated; drafts stay in component memory. Status uses label and icon
  as well as color, with distinct underline styles.
- The “no quotes found” state names supported forms but says that absence of extraction is not proof
  of absence. `/privacy` mirrors the public-facing privacy facts.

Chrome checks covered 360 px and 1280 px pages and Lighthouse accessibility scored 100 in the saved
snapshot. No screen-reader or physical-phone test was performed.

## D-20 — Regex extraction rules (2026-10-03)

- An ayah inside a marked hadith quote is not emitted as a second overlapping item. An unmarked
  quote stops before a definite ﴿…﴾ span, which becomes its own item.
- When two attribution phrases lead to one quote, the weaker claim wins:
  `unclear_attribution`, then another explicit kind, then `quran`. Thus «يروى عن النبي ﷺ…» abstains,
  while hadith-qudsi framing remains `hadith`.
- Non-speech phrases require a colon for an unmarked quote; verbs of speech do not. Unmarked spans
  end at sentence/reference/bracket/next-attribution boundaries.
- Supported marks are «…», “…”, and `"…"`; round brackets are Quran-only when immediately attached
  and not reference-like. The lead is at most 60 same-sentence characters. One-word checks count
  words containing a letter.
- «ورد عنه» remains `hadith`: it names the Prophet and searching is safer than unconditional
  specialist referral. «قال الله تعالى» outside ﴿…﴾ remains a Quran claim unless surrounding
  hadith framing makes it hadith; the Quran brackets always assert a verse.

Evidence: Ibn al-Salah and Al-Nawawi distinguish assertive «قال» from non-assertive transmission
forms such as «روي/ورد»; Al-Nawawi also notes that “athar” usage varies. For hadith qudsi, the
wording may be attributed to God while remaining non-Quran, summarized from Manna al-Qattan and
Al-Jurjani. These are interpretive routing rules, not authenticity judgments. The sources are not
fully independent—Al-Nawawi abridges Ibn al-Salah—and the extractor was initially tested on authored
drafts, not a representative corpus.

## D-21 — LLM span validation and merge (2026-10-03)

- Every returned quote must occur in the draft; only whitespace runs may differ. Repeated outputs
  map to successive occurrences, and excess copies are dropped.
- Regex precedes LLM on equal claims. The LLM may weaken an attribution but never override a regex
  Quran span inside ﴿…﴾. Interpretive claims and quotations remain separate; overlapping claims are
  trimmed around quotations, and level D wins between overlapping claims.
- `isDraft:false` cannot delete regex evidence. Invalid structured output is discarded and yields
  regex-only mode with `LLM_UNAVAILABLE_REGEX_ONLY`.
- OpenAI uses strict structured output through the Responses API. The draft is delimited as data,
  not instructions; provider timeouts are adapter concerns. No offset, status, source, or grade from
  the model is trusted.

The owner explicitly chose to keep both a quote and an overlapping interpretive claim. Initial tests
used mocked ports; live behavior is measured in D-27 onward.

## D-22 — Hadith matcher boundaries (2026-10-03)

- A pending record may identify why review is needed but never confirms a reference or grade.
- A Quran claim outside ﴿…﴾ may be a hadith-qudsi citation; a reviewed exact hadith hit can match.
  Inside ﴿…﴾ it is a verse claim and a hadith hit is `KIND_MISMATCH` (refined by D-31).
- References to uncovered books are not compared as if those books were searched. Partial or
  ambiguous references abstain.
- Numbers are compared with the source’s displayed citation; «متفق عليه» requires reviewed evidence
  in both covered collections. The nearest safe candidate is returned per record, never manufactured.
- Very short spans (fewer than three letter-bearing words) cannot produce a fuzzy positive.

Tests use fixture and real-corpus drafts; they are not proof that every citation form is covered.

## D-23 — Grounded explanation and copyable report (2026-10-04)

Generated explanations are optional presentation. Each is requested only for an existing
`DIFFERS` item, receives the bounded draft span and returned evidence, and must pass a closed schema,
length/sentence bounds, digit/reference preservation, and vocabulary/grounding checks. It cannot
change status, evidence, correction, or citation; rejected output is omitted. Reports copy the
deterministic result first and label any explanation as generated. Provider errors preserve the
review result. Initial checks used fake clients; live acceptance rates are in evaluation reports.

## D-24 — Security, privacy, failure, and secret audit (2026-10-04)

Prompts delimit the draft as untrusted data and restrict output fields. All model spans are checked
verbatim against the draft; explanations use a bounded vocabulary and cannot add source records.
Server logs contain request/result metadata, never draft or source text. Requests use `store:false`;
the public notice still says the configured provider processes submitted text and avoids promising
deletion outside Azw’s control. Secrets are server-only and excluded by git rules. Provider failure
returns deterministic regex review with a warning; total route failure returns `ERROR` without
evidence. These controls reduce, but do not eliminate, prompt-injection or provider risk.

## D-25 — Writer-applied corrections (2026-10-04)

A correction is built only by code from a chosen evidence record. Wording corrections are verbatim
stretches of `exactText`; reference corrections use `citation.display`. They are offered only when
the status rules identify the intended same-kind record and exact target span. The writer applies
one correction at a time to a copy beside the original; Azw never silently rewrites the draft and
does not provide “fix all.” Overlaps and stale offsets block application. Quran sweeps tested
wording/reference cases; hadith correction tests are narrower.

## D-26 — Evaluation expanded before the first run (2026-10-04)

The set grew from 50 to 85 cases before model evaluation: 34 tune cases with 37 expected items and
51 held-out cases with 59 items, including 36 critical cases. New cases cover spelling layers,
reference mismatches, pending records, misattribution, unclear claims, personal rulings, injection,
duplicates, and extraction boundaries. Labels derive from documented rules and corpus records;
`T-024` was corrected before the first run. The set was authored with knowledge of the system and
has not been reviewed by a scholar, so it is a regression set—not an external benchmark.

## D-27 — Evaluation runner and first measured result (2026-10-04)

The runner reports regex, LLM, and merged modes; matches expected items by overlap/kind; treats an
unexpected positive as a false confirmation; and checks reference evidence explicitly. It records
prompt/model/corpus/version, token use, latency, explanations, warnings, and release-gate results.
The first held-out merged run had zero false confirmations, 57/59 status accuracy, 58/59 extraction
recall, 20/21 abstentions, and 48/51 fully correct cases. One model/run is not a general quality
estimate; reruns exposed nondeterminism.

## D-28 — Tune-only fix loop (2026-10-04)

Four general rules were derived from tune failures:

1. An interpretive claim must actually infer from named evidence or state a ruling; introductions,
   reminders, and advice are not claims.
2. Regex speech forms include present tense (`يقول تعالى/النبي/رسول الله/ﷺ`).
3. Eight documented claim openings receive deterministic level C/D extraction.
4. The extracted kind is what the draft claims, not what the model recognizes from memory.

Held-out was exposed once by aggregate failure output; the kind rule was designed from tune case
`T-012`, not held-out text. Afterward merged held-out measured 58/59 status, 59/59 recall, 21/21
abstention, 48/51 cases, and zero false confirmations among 20 matches. Variations across repeated
runs remain; no threshold, normalization, or reference rule was tuned.

## D-29 — UI redesign and estimated progress (2026-10-05)

The logo is a repository-owned SVG redrawing, not the supplied black-background raster. Results
replace the editor while preserving its draft; «عدّل المسودة» returns to it. Because the API is one
request/one response, progress is time-based, explicitly labeled estimated, and never reaches 100%
before completion. On narrow screens the active result card precedes the draft, and correction is
the primary card action. Mock-up wording was corrected to match real evidence and limits. Checked in
Chrome desktop and 390 px; no target-user study was performed.

## D-30 — Parallel explanations and configurable reasoning effort (2026-10-05)

Regex items are matched immediately and eligible explanations start while LLM extraction runs.
Final items are rebuilt from the merged extraction; an early explanation is used only if its final
input is identical. Failed/changed extraction can therefore incur an unused call but cannot attach
the wrong explanation. `LLM_REASONING_EFFORT` is explicit and model-dependent; `none` is the
documented deployment setting. Per-call fallback retries unsupported `temperature` without changing
result semantics.

On held-out merged mode, the compared runs moved p50/p95 from 2,091/7,689 ms to 1,524/3,100 ms;
status from 57/59 to 58/59; recall from 58/59 to 59/59; accepted explanations from 16/17 to 14/17;
and output tokens per draft from 236 to 96. Both runs had zero false confirmations. This is a
single-machine, different-day comparison; model variation and cold-start cost remain.

## D-31 — Any span inside one ﴿…﴾ pair is claimed as Quran (2026-10-05)

A held-out false confirmation showed that requiring an extracted span to fill the brackets exactly
lost the writer’s Quran claim when the model returned the brackets or only part of their content.
The rule now reads the draft: after trimming its own brackets/space, a span between one opening ﴿
and its next closing ﴾—without another bracket crossing the pair—is in verse marks. It can turn a
hadith hit from `MATCH` into `KIND_MISMATCH`, never the reverse.

Unit and real-corpus integration tests cover full, partial, bracket-including, crossed, and unclosed
placements. The affected held-out case `H-017` is no longer blind because its aggregate failure
triggered the change; after the fix, three merged runs and the LLM run had zero false confirmations
among 20 matches. A model-only quote outside explicit marks still depends on the extraction prompt.
