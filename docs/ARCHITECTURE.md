# Azw — architecture

This document describes the implementation as it stands. The public wire contract is generated in
[`API.md`](API.md); source provenance belongs in [`SOURCES.md`](SOURCES.md); closed choices and their
evidence belong in [`DECISIONS.md`](DECISIONS.md).

## 1. Trust model

Azw separates retrieval from generation:

- A displayed quotation always comes from `SourceRecord.exactText` and carries that record's citation.
- Search-only text is never displayed, diffed or sent through the API.
- The LLM extracts spans and may explain a deterministic difference. It never chooses a candidate,
  a status, a grade or a correction.
- Every LLM span must occur verbatim in the draft and pass a zod schema before core accepts it.
- Low, missing or conflicting evidence produces abstention or referral, never a positive guess.
- Pending records have no grade and cannot produce `MATCH` or `DIFFERS`.

The stable status labels and content levels are defined in `AGENTS.md`. Only
`src/core/status/decide.ts` assigns a status.

## 2. Boundaries

```text
src/core       pure TypeScript: schemas, normalization, references, index, matchers,
               extraction, diff, status rules and orchestration
src/llm        provider adapters and prompts; implements the core LlmPort
src/server     corpus loading, API configuration, rate limiting and handlers
src/app        Next.js routes and pages
src/components presentation and client state
src/i18n       all user-facing Arabic strings
data/corpus    immutable built records and machine-readable manifest
data/review    approvals and held-record evidence
scripts        corpus maintenance and verification; never imported at runtime
eval           labeled cases, runner and dated reports
```

`src/core` imports no React, Next.js, filesystem or network code. Server loaders inject the corpus;
the LLM is injected through `LlmPort`. Boundary tests enforce this separation.

## 3. Review pipeline

The order is fixed:

```text
draft
  → regex extraction and LLM extraction in parallel
  → validate every extracted span against the original draft
  → merge overlaps, deduplicate, enforce the item limit
  → parse and attach cited references deterministically
  → retrieve candidates across every registered content kind
  → score and align against source records
  → decide status and reason in pure code
  → build the word diff for returned evidence
  → build an optional source-backed correction
  → validate an optional grounded LLM explanation
  → validate ReviewResult before returning it
```

Retrieval always searches across kinds. A quotation introduced as a hadith may therefore be found
as a Quran record and end `KIND_MISMATCH` instead of being silently missed.

## 4. Data contracts

The canonical zod schemas and exported TypeScript types live in `src/core/types.ts`.

- `SourceRecord` contains source text plus private retrieval keys.
- `ApiSourceRecord` explicitly allowlists the public fields and omits `searchText`,
  `searchVariants` and `matnText`.
- `ReviewItem.span` always identifies the exact text and UTF-16 offsets in the submitted draft.
- `evidence` is bounded to five records per item; an `ERROR` item has none.
- A correction is code-built from `exactText` or `citation.display`, never from generated prose.
- `ReviewResult.coverage` is derived from corpus collections that have a registered matcher.
- Results are validated with `ReviewResultSchema` before crossing the API boundary.

The API version is `1`. Contract changes must be made in the schemas first and followed by
`npm run docs:api`.

## 5. Arabic normalization

`src/core/normalize` returns normalized text with an offset map back to the original characters.
The search level:

- removes Arabic diacritics, tatweel, Quran pause marks and direction marks;
- folds common alef, ya and digit forms documented in the module;
- normalizes whitespace and punctuation for retrieval;
- keeps honorific phrases for Quran search text;
- does not alter `exactText`.

The strict level is used where stronger character identity matters. Normalization intentionally does
not turn every historical or keyboard spelling into an equivalent form.

### Quran spelling layers

Quran records have three searchable views:

1. `default`: normalized mushaf 1 display text.
2. `everyday`: ayah-bound substitutions from
   `data/aliases/quran-spelling-variants.json`.
3. `uthmani`: normalized mushaf 2 text in `searchVariants`.

The everyday list contains 66 reviewed word forms and applies only to the listed ayat. It is not a
global folding rule. The owner rejected bridging «داود» and «إذن» (D-9).

An Uthmani variant hit may count as the same spelling only when the differing word carries the
documented Uthmani signs and does not spell out an alef written above the line. Otherwise the span
is compared with the default text and a spelling difference cannot become `MATCH` (D-13). The
display, citation and diff always use mushaf 1 `exactText`.

## 6. Reference parsing

`src/core/references` reads references without an LLM and returns Quran, hadith or unknown forms.
It recognizes:

- surah names and reviewed aliases, ayah numbers and ranges;
- Bukhari, Muslim, «متفق عليه» and collection aliases;
- collection-specific hadith numbers;
- incomplete forms as `partial`, never as a checked correct reference.

A reference is attached only under the parser's proximity and sentence rules. Text the parser cannot
fully understand becomes `unknown` or `partial`; status rules then use `REF_NOT_CHECKED` rather than
claiming agreement.

## 7. Corpus and index

`src/server/corpus-loader.ts` reads `data/corpus/manifest.json`, validates the manifest and each
record, verifies file checksums and record counts, then constructs the in-memory index. Loading fails
as one unit; the server never exposes a partially loaded corpus.

Each content kind supplies a `SourceAdapter`, searchable layers and a `Matcher`. The index combines:

- normalized exact substring lookup;
- a distinct word-bigram inverted index for fuzzy candidates;
- collection and layer metadata needed to map hits back to records.

`kindMeta` owns labels, quote marks, icons and citation formatting so UI components do not branch on
specific kinds.

## 8. Matchers

### Quran

The Quran matcher searches all three Quran layers, supports adjacent ayah ranges, maps every hit back
to the mushaf 1 record and compares any cited range with the covered range. Fuzzy candidates are
aligned at word level. A close reviewed record can support `DIFFERS`; ambiguity or a middle score
produces referral.

### Hadith

The hadith matcher searches normalized full source records. `matnText` is retained as a reviewed
verbatim aid but is not a separate production search layer. It checks collection and citation number,
including both books for «متفق عليه». Muslim comparisons use `citation.number` (Abd al-Baqi), not the
internal record id.

Pending records may be returned only as evidence that needs specialist review. A cited book outside
the covered corpus is not confirmed or contradicted. A hadith-qudsi attribution is handled under the
conservative rule recorded in D-22.

## 9. Status rules

`decide()` receives candidates and parsed claims, not generated prose or word diffs. Its central
invariants are:

| Outcome | Required evidence |
|---|---|
| `MATCH` | reviewed exact candidate, permitted spelling path, compatible claimed kind, and correct cited reference if present |
| `DIFFERS` | a reviewed candidate establishes a wording, reference or kind difference |
| `NOT_FOUND` | no sufficient candidate in the sources actually searched |
| `NEEDS_SPECIALIST` | pending, ambiguous, conflicting or mid-confidence evidence; an unreadable reference; or content level C/D |
| `ERROR` | the item could not be completed; no evidence is exposed |

`NOT_FOUND` never means false or absent from the cited book. The corpus has documented gaps. Reason
sentences are deterministic Arabic strings from `src/i18n/ar.ts`.

## 10. Diff and corrections

`src/core/diff` tokenizes the original span and aligned source stretch, producing word operations
whose ranges point back to the original strings. Diff output is presentation evidence and is not an
input to status rules.

A correction is offered only when one reviewed record determines one safe change:

- wording: a verbatim stretch of `record.exactText`;
- reference: `record.citation.display`.

The writer applies one correction at a time to a separate revised copy. Azw never silently rewrites
the submitted draft and offers no “fix all” operation.

## 11. Extraction and generation

### Regex extractor

The baseline extractor recognizes Quran marks, supported quotation marks, reviewed attribution
phrases and nearby references. It drops one-word quotes except inside Quran marks and avoids creating
a second item for a Quran span nested in a hadith quotation. Its limitations are listed in
[`BACKLOG.md`](BACKLOG.md).

### LLM extractor

The supported server configuration uses OpenAI Responses with structured output. The model returns
candidate spans, claimed kinds and content levels. Core then:

1. validates the schema;
2. resolves repeated occurrences in order;
3. requires verbatim text, allowing only whitespace normalization between words;
4. drops invented or unlocatable spans;
5. merges valid results with regex extraction.

Missing configuration is not a supported deployment setup. A failed, timed-out or rejected LLM call
does not break the review: regex extraction continues and the result includes
`LLM_UNAVAILABLE_REGEX_ONLY`.

### Explanation

Only `DIFFERS` items are eligible. The input is limited to the draft span, source text, both
references where present, the deterministic reason and diff words. The output must be short,
schema-valid, grounded in verbatim quoted segments and limited to a closed vocabulary that cannot
introduce a grade, ruling or interpretation. Rejection simply omits the explanation.

Every displayed explanation is marked `generated: true` and labelled «شرح مولّد آلياً».

## 12. API and operation

The Node.js runtime exposes:

- `POST /api/v1/review` for the complete pipeline;
- `GET /api/v1/health` for corpus health, version, searched coverage and LLM configuration state;
- same-origin access by default, with exact additional origins from `CORS_ALLOWLIST`;
- an in-memory per-client token bucket;
- `Cache-Control: no-store` on responses;
- bounded request size, draft length, items and evidence.

The server log type contains request id, outcome, sizes, timings, counts and warning codes. It has no
field for a draft, extracted span or model output. The rate-limit address remains in memory only.

Deployment must include `data/corpus/*.json` and `data/aliases/*.json`; `next.config.ts` adds them to
the output trace. A multi-instance production deployment would need a shared rate-limit store.

## 13. UI

The App Router UI is Arabic, RTL and mobile-first. It reads `coverage` from health/results before
naming searched sources, validates API responses in the client, and shows status with label and icon
as well as color. Source text uses Amiri through the single `--font-quran` token; UI text uses IBM
Plex Sans Arabic.

Draft state and the revised copy live in React memory only. There is no local storage, cookie,
analytics integration, web manifest or service worker in the current build.

## 14. Extension points

- A new content kind adds an adapter, matcher and `kindMeta` entry without changing existing clients.
- A new provider implements `LlmPort` under `src/llm`.
- New clients call the versioned API and rely on its zod-derived contract.
- New UI languages add an i18n module instead of hard-coded component strings.
- New hadith books require licensed text, stable citations and source-provided grades before any
  reviewed record can produce `MATCH`.
