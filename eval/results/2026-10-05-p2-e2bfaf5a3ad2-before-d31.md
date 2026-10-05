# Evaluation — 2026-10-05 — corpus p2-e2bfaf5a3ad2

Written by `eval/run-eval.ts` (`npm run eval`). Method and definitions: `docs/EVALUATION.md`.

**The cases were not reviewed by a person.** They were drafted and checked by an AI assistant (`docs/EVALUATION.md` §1).

## Run

- Corpus version: `p2-e2bfaf5a3ad2`; collections searched: quran, bukhari, muslim.
- Cases: 34 tune, 51 held-out.
- LLM: provider `openai`, model `gpt-5.6-luna`, time budget 15000 ms, reasoning effort none. Extraction prompt version 3, explanation prompt version 2.
- **The LLM extraction failed or timed out on 1 draft run(s)** (see "Latency and LLM cost per draft"). Such a run went on with what the other extractors found, and its numbers are counted as they came.
- Modes: `regex` = the regex extractor alone (the baseline); `llm` = the LLM extractor alone; `merged` = both (production).
- Pairing: a returned item is paired with an expected item when their spans overlap with IoU ≥ 0.5, one to one.
- Every number is a count over its denominator. 85 cases is a small sample.

## Release gate

**FAIL**

- FAIL — Zero false confirmations on critical held-out cases, merged mode: 1 false confirmation(s) in 23 critical cases: H-017.
- PASS — Zero false confirmations on critical held-out cases, regex mode: 0 false confirmation(s) in 23 critical cases.
- PASS — No ERROR item carries evidence: 0 ERROR item(s) with evidence, over every run of this report.

## Critical cases

The gate counts false confirmations only. This table says how many critical cases are fully as labeled. A case that is wrong
without a false confirmation erred on the cautious side: the tool abstained, missed an item, or returned an item no label expects.

| Split | Mode | Critical cases | Fully as labeled | Wrong, no false confirmation | With a false confirmation |
|---|---|---|---|---|---|
| tune | regex | 13 | 12 / 13 | 1 | 0 |
| tune | llm | 13 | 13 / 13 | 0 | 0 |
| tune | merged | 13 | 13 / 13 | 0 | 0 |
| held-out | regex | 23 | 19 / 23 | 4 | 0 |
| held-out | llm | 23 | 17 / 23 | 6 | 0 |
| held-out | merged | 23 | 19 / 23 | 3 | 1 |

## Baseline comparison: regex against merged

### tune

| Metric | regex | llm | merged |
|---|---|---|---|
| Cases right | 33 / 34 | 33 / 34 | 33 / 34 |
| False confirmations / MATCH returned | 0 / 13 | 0 / 13 | 0 / 13 |
| Status accuracy | 37 / 37 | 37 / 37 | 37 / 37 |
| Reason-code accuracy | 37 / 37 | 37 / 37 | 37 / 37 |
| Source retrieval | 27 / 27 | 27 / 27 | 27 / 27 |
| Extraction recall | 37 / 37 | 37 / 37 | 37 / 37 |
| Extraction precision | 37 / 37 | 37 / 38 | 37 / 38 |
| Abstention | 13 / 13 | 13 / 13 | 13 / 13 |
| Requests given the scope message | 0 / 1 | 1 / 1 | 1 / 1 |

- **What the LLM adds.** Cases right with the LLM and wrong without it (1): `T-019`.
- **What the LLM breaks.** Cases right without the LLM and wrong with it (1): `T-025`.
- **Explanations.** DIFFERS items returned in merged mode that carry a generated explanation (it passed the validator): 9 / 11.
- **What it costs.** Latency per draft p50 / p95: 4 / 16 ms (regex) against 1365 / 2106 ms (merged). LLM calls: 46 over 34 drafts; tokens per draft: 1528 in, 90 out (reported by the SDK).

### held-out

| Metric | regex | llm | merged |
|---|---|---|---|
| Cases right | 38 / 51 | 44 / 51 | 47 / 51 |
| False confirmations / MATCH returned | 0 / 17 | 0 / 19 | 1 / 21 |
| Status accuracy | 48 / 59 | 56 / 59 | 57 / 59 |
| Reason-code accuracy | 48 / 59 | 56 / 59 | 57 / 59 |
| Source retrieval | 37 / 41 | 39 / 41 | 41 / 41 |
| Extraction recall | 49 / 59 | 56 / 59 | 59 / 59 |
| Extraction precision | 49 / 49 | 56 / 61 | 59 / 61 |
| Abstention | 15 / 21 | 20 / 21 | 21 / 21 |
| Requests given the scope message | 0 / 2 | 2 / 2 | 2 / 2 |

- **What the LLM adds.** Cases right with the LLM and wrong without it (12): `H-005`, `H-006`, `H-022`, `H-026`, `H-027`, `H-030`, `H-035`, `H-040`, `H-043`, `H-045`, `H-046`, `H-048`.
- **What the LLM breaks.** Cases right without the LLM and wrong with it (3): `H-017`, `H-018`, `H-033`.
- **Explanations.** DIFFERS items returned in merged mode that carry a generated explanation (it passed the validator): 11 / 16.
- **What it costs.** Latency per draft p50 / p95: 11 / 44 ms (regex) against 1579 / 2915 ms (merged). LLM calls: 70 over 51 drafts; tokens per draft: 1556 in, 96 out (reported by the SDK).

## Metrics

Columns: **Cases right** = nothing in the case differs from its label. **False confirmations** = MATCH items not paired with an
expected MATCH item, over the MATCH items returned (the primary metric). **Status**, **Reason code** = expected items whose paired
item has the expected status (and reason code), over the expected items; an item that was not extracted counts as wrong.
**Retrieval** = an expected record is among the evidence; **Reference** = the first citation shown is that of an expected record;
both over the expected items that list records. **Recall** = expected items found; **Precision** = returned items that are an
expected item. **Abstention** = expected NOT_FOUND and NEEDS_SPECIALIST items that end so. **Requests** = inputs that are not a
draft, answered with zero items and the warning NOT_A_DRAFT.

### tune, regex mode

| Slice | Cases right | False confirmations / MATCH returned | Status | Reason code | Retrieval | Reference | Recall | Precision | Abstention | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| **all** | 33 / 34 | 0 / 13 | 37 / 37 | 37 / 37 | 27 / 27 | 27 / 27 | 37 / 37 | 37 / 37 | 13 / 13 | 0 / 1 |
| group: first 50 | 19 / 20 | 0 / 8 | 20 / 20 | 20 / 20 | 15 / 15 | 15 / 15 | 20 / 20 | 20 / 20 | 5 / 5 | 0 / 1 |
| group: 35 added | 14 / 14 | 0 / 5 | 17 / 17 | 17 / 17 | 12 / 12 | 12 / 12 | 17 / 17 | 17 / 17 | 8 / 8 | 0 / 0 |
| EXACT | 7 / 7 | 0 / 7 | 7 / 7 | 7 / 7 | 7 / 7 | 7 / 7 | 7 / 7 | 7 / 7 | 0 / 0 | 0 / 0 |
| ORTHOGRAPHIC | 4 / 4 | 0 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 0 / 0 | 0 / 0 |
| WORDING_ERROR | 4 / 4 | 0 / 0 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 0 / 0 | 0 / 0 |
| WRONG_REFERENCE | 5 / 5 | 0 / 0 | 5 / 5 | 5 / 5 | 5 / 5 | 5 / 5 | 5 / 5 | 5 / 5 | 0 / 0 | 0 / 0 |
| NOT_IN_SOURCES | 4 / 4 | 0 / 0 | 4 / 4 | 4 / 4 | 0 / 0 | 0 / 0 | 4 / 4 | 4 / 4 | 4 / 4 | 0 / 0 |
| AMBIGUOUS | 6 / 6 | 0 / 1 | 7 / 7 | 7 / 7 | 4 / 4 | 4 / 4 | 7 / 7 | 7 / 7 | 6 / 6 | 0 / 0 |
| ADVERSARIAL | 2 / 3 | 0 / 0 | 2 / 2 | 2 / 2 | 1 / 1 | 1 / 1 | 2 / 2 | 2 / 2 | 1 / 1 | 0 / 1 |
| MIXED | 1 / 1 | 0 / 1 | 4 / 4 | 4 / 4 | 2 / 2 | 2 / 2 | 4 / 4 | 4 / 4 | 2 / 2 | 0 / 0 |

| Expected ↓ / returned → | MATCH | DIFFERS | NOT_FOUND | NEEDS_SPECIALIST | ERROR | (not extracted) |
|---|---|---|---|---|---|---|
| MATCH | 13 | 0 | 0 | 0 | 0 | 0 |
| DIFFERS | 0 | 11 | 0 | 0 | 0 | 0 |
| NOT_FOUND | 0 | 0 | 6 | 0 | 0 | 0 |
| NEEDS_SPECIALIST | 0 | 0 | 0 | 7 | 0 | 0 |

### tune, llm mode

| Slice | Cases right | False confirmations / MATCH returned | Status | Reason code | Retrieval | Reference | Recall | Precision | Abstention | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| **all** | 33 / 34 | 0 / 13 | 37 / 37 | 37 / 37 | 27 / 27 | 27 / 27 | 37 / 37 | 37 / 38 | 13 / 13 | 1 / 1 |
| group: first 50 | 20 / 20 | 0 / 8 | 20 / 20 | 20 / 20 | 15 / 15 | 15 / 15 | 20 / 20 | 20 / 20 | 5 / 5 | 1 / 1 |
| group: 35 added | 13 / 14 | 0 / 5 | 17 / 17 | 17 / 17 | 12 / 12 | 12 / 12 | 17 / 17 | 17 / 18 | 8 / 8 | 0 / 0 |
| EXACT | 7 / 7 | 0 / 7 | 7 / 7 | 7 / 7 | 7 / 7 | 7 / 7 | 7 / 7 | 7 / 7 | 0 / 0 | 0 / 0 |
| ORTHOGRAPHIC | 4 / 4 | 0 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 0 / 0 | 0 / 0 |
| WORDING_ERROR | 4 / 4 | 0 / 0 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 0 / 0 | 0 / 0 |
| WRONG_REFERENCE | 5 / 5 | 0 / 0 | 5 / 5 | 5 / 5 | 5 / 5 | 5 / 5 | 5 / 5 | 5 / 5 | 0 / 0 | 0 / 0 |
| NOT_IN_SOURCES | 4 / 4 | 0 / 0 | 4 / 4 | 4 / 4 | 0 / 0 | 0 / 0 | 4 / 4 | 4 / 4 | 4 / 4 | 0 / 0 |
| AMBIGUOUS | 5 / 6 | 0 / 1 | 7 / 7 | 7 / 7 | 4 / 4 | 4 / 4 | 7 / 7 | 7 / 8 | 6 / 6 | 0 / 0 |
| ADVERSARIAL | 3 / 3 | 0 / 0 | 2 / 2 | 2 / 2 | 1 / 1 | 1 / 1 | 2 / 2 | 2 / 2 | 1 / 1 | 1 / 1 |
| MIXED | 1 / 1 | 0 / 1 | 4 / 4 | 4 / 4 | 2 / 2 | 2 / 2 | 4 / 4 | 4 / 4 | 2 / 2 | 0 / 0 |

| Expected ↓ / returned → | MATCH | DIFFERS | NOT_FOUND | NEEDS_SPECIALIST | ERROR | (not extracted) |
|---|---|---|---|---|---|---|
| MATCH | 13 | 0 | 0 | 0 | 0 | 0 |
| DIFFERS | 0 | 11 | 0 | 0 | 0 | 0 |
| NOT_FOUND | 0 | 0 | 6 | 0 | 0 | 0 |
| NEEDS_SPECIALIST | 0 | 0 | 0 | 7 | 0 | 0 |
| (no expected item) | 0 | 0 | 0 | 1 | 0 | 0 |

### tune, merged mode

| Slice | Cases right | False confirmations / MATCH returned | Status | Reason code | Retrieval | Reference | Recall | Precision | Abstention | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| **all** | 33 / 34 | 0 / 13 | 37 / 37 | 37 / 37 | 27 / 27 | 27 / 27 | 37 / 37 | 37 / 38 | 13 / 13 | 1 / 1 |
| group: first 50 | 20 / 20 | 0 / 8 | 20 / 20 | 20 / 20 | 15 / 15 | 15 / 15 | 20 / 20 | 20 / 20 | 5 / 5 | 1 / 1 |
| group: 35 added | 13 / 14 | 0 / 5 | 17 / 17 | 17 / 17 | 12 / 12 | 12 / 12 | 17 / 17 | 17 / 18 | 8 / 8 | 0 / 0 |
| EXACT | 7 / 7 | 0 / 7 | 7 / 7 | 7 / 7 | 7 / 7 | 7 / 7 | 7 / 7 | 7 / 7 | 0 / 0 | 0 / 0 |
| ORTHOGRAPHIC | 4 / 4 | 0 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 0 / 0 | 0 / 0 |
| WORDING_ERROR | 4 / 4 | 0 / 0 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 0 / 0 | 0 / 0 |
| WRONG_REFERENCE | 5 / 5 | 0 / 0 | 5 / 5 | 5 / 5 | 5 / 5 | 5 / 5 | 5 / 5 | 5 / 5 | 0 / 0 | 0 / 0 |
| NOT_IN_SOURCES | 4 / 4 | 0 / 0 | 4 / 4 | 4 / 4 | 0 / 0 | 0 / 0 | 4 / 4 | 4 / 4 | 4 / 4 | 0 / 0 |
| AMBIGUOUS | 5 / 6 | 0 / 1 | 7 / 7 | 7 / 7 | 4 / 4 | 4 / 4 | 7 / 7 | 7 / 8 | 6 / 6 | 0 / 0 |
| ADVERSARIAL | 3 / 3 | 0 / 0 | 2 / 2 | 2 / 2 | 1 / 1 | 1 / 1 | 2 / 2 | 2 / 2 | 1 / 1 | 1 / 1 |
| MIXED | 1 / 1 | 0 / 1 | 4 / 4 | 4 / 4 | 2 / 2 | 2 / 2 | 4 / 4 | 4 / 4 | 2 / 2 | 0 / 0 |

| Expected ↓ / returned → | MATCH | DIFFERS | NOT_FOUND | NEEDS_SPECIALIST | ERROR | (not extracted) |
|---|---|---|---|---|---|---|
| MATCH | 13 | 0 | 0 | 0 | 0 | 0 |
| DIFFERS | 0 | 11 | 0 | 0 | 0 | 0 |
| NOT_FOUND | 0 | 0 | 6 | 0 | 0 | 0 |
| NEEDS_SPECIALIST | 0 | 0 | 0 | 7 | 0 | 0 |
| (no expected item) | 0 | 0 | 0 | 1 | 0 | 0 |

### held-out, regex mode

| Slice | Cases right | False confirmations / MATCH returned | Status | Reason code | Retrieval | Reference | Recall | Precision | Abstention | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| **all** | 38 / 51 | 0 / 17 | 48 / 59 | 48 / 59 | 37 / 41 | 37 / 41 | 49 / 59 | 49 / 49 | 15 / 21 | 0 / 2 |
| group: first 50 | 23 / 30 | 0 / 10 | 26 / 32 | 26 / 32 | 20 / 22 | 20 / 22 | 27 / 32 | 27 / 27 | 7 / 10 | 0 / 1 |
| group: 35 added | 15 / 21 | 0 / 7 | 22 / 27 | 22 / 27 | 17 / 19 | 17 / 19 | 22 / 27 | 22 / 22 | 8 / 11 | 0 / 1 |
| EXACT | 6 / 9 | 0 / 7 | 7 / 10 | 7 / 10 | 7 / 10 | 7 / 10 | 7 / 10 | 7 / 7 | 0 / 0 | 0 / 0 |
| ORTHOGRAPHIC | 4 / 4 | 0 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 0 / 0 | 0 / 0 |
| WORDING_ERROR | 6 / 8 | 0 / 0 | 6 / 8 | 6 / 8 | 7 / 8 | 7 / 8 | 7 / 8 | 7 / 7 | 0 / 0 | 0 / 0 |
| WRONG_REFERENCE | 7 / 7 | 0 / 0 | 7 / 7 | 7 / 7 | 7 / 7 | 7 / 7 | 7 / 7 | 7 / 7 | 0 / 0 | 0 / 0 |
| NOT_IN_SOURCES | 4 / 7 | 0 / 0 | 4 / 7 | 4 / 7 | 0 / 0 | 0 / 0 | 4 / 7 | 4 / 4 | 4 / 7 | 0 / 0 |
| AMBIGUOUS | 5 / 8 | 0 / 2 | 7 / 10 | 7 / 10 | 5 / 5 | 5 / 5 | 7 / 10 | 7 / 7 | 5 / 8 | 0 / 0 |
| ADVERSARIAL | 3 / 5 | 0 / 1 | 4 / 4 | 4 / 4 | 1 / 1 | 1 / 1 | 4 / 4 | 4 / 4 | 3 / 3 | 0 / 2 |
| MIXED | 3 / 3 | 0 / 3 | 9 / 9 | 9 / 9 | 6 / 6 | 6 / 6 | 9 / 9 | 9 / 9 | 3 / 3 | 0 / 0 |

| Expected ↓ / returned → | MATCH | DIFFERS | NOT_FOUND | NEEDS_SPECIALIST | ERROR | (not extracted) |
|---|---|---|---|---|---|---|
| MATCH | 17 | 0 | 0 | 0 | 0 | 3 |
| DIFFERS | 0 | 16 | 0 | 1 | 0 | 1 |
| NOT_FOUND | 0 | 0 | 9 | 0 | 0 | 3 |
| NEEDS_SPECIALIST | 0 | 0 | 0 | 6 | 0 | 3 |

### held-out, llm mode

| Slice | Cases right | False confirmations / MATCH returned | Status | Reason code | Retrieval | Reference | Recall | Precision | Abstention | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| **all** | 44 / 51 | 0 / 19 | 56 / 59 | 56 / 59 | 39 / 41 | 39 / 41 | 56 / 59 | 56 / 61 | 20 / 21 | 2 / 2 |
| group: first 50 | 24 / 30 | 0 / 11 | 29 / 32 | 29 / 32 | 20 / 22 | 20 / 22 | 29 / 32 | 29 / 33 | 9 / 10 | 1 / 1 |
| group: 35 added | 20 / 21 | 0 / 8 | 27 / 27 | 27 / 27 | 19 / 19 | 19 / 19 | 27 / 27 | 27 / 28 | 11 / 11 | 1 / 1 |
| EXACT | 8 / 9 | 0 / 10 | 10 / 10 | 10 / 10 | 10 / 10 | 10 / 10 | 10 / 10 | 10 / 11 | 0 / 0 | 0 / 0 |
| ORTHOGRAPHIC | 4 / 4 | 0 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 0 / 0 | 0 / 0 |
| WORDING_ERROR | 5 / 8 | 0 / 0 | 7 / 8 | 7 / 8 | 7 / 8 | 7 / 8 | 7 / 8 | 7 / 9 | 0 / 0 | 0 / 0 |
| WRONG_REFERENCE | 5 / 7 | 0 / 0 | 7 / 7 | 7 / 7 | 7 / 7 | 7 / 7 | 7 / 7 | 7 / 9 | 0 / 0 | 0 / 0 |
| NOT_IN_SOURCES | 7 / 7 | 0 / 0 | 7 / 7 | 7 / 7 | 0 / 0 | 0 / 0 | 7 / 7 | 7 / 7 | 7 / 7 | 0 / 0 |
| AMBIGUOUS | 8 / 8 | 0 / 2 | 10 / 10 | 10 / 10 | 5 / 5 | 5 / 5 | 10 / 10 | 10 / 10 | 8 / 8 | 0 / 0 |
| ADVERSARIAL | 4 / 5 | 0 / 0 | 2 / 4 | 2 / 4 | 0 / 1 | 0 / 1 | 2 / 4 | 2 / 2 | 2 / 3 | 2 / 2 |
| MIXED | 3 / 3 | 0 / 3 | 9 / 9 | 9 / 9 | 6 / 6 | 6 / 6 | 9 / 9 | 9 / 9 | 3 / 3 | 0 / 0 |

| Expected ↓ / returned → | MATCH | DIFFERS | NOT_FOUND | NEEDS_SPECIALIST | ERROR | (not extracted) |
|---|---|---|---|---|---|---|
| MATCH | 19 | 0 | 0 | 0 | 0 | 1 |
| DIFFERS | 0 | 17 | 0 | 0 | 0 | 1 |
| NOT_FOUND | 0 | 0 | 11 | 0 | 0 | 1 |
| NEEDS_SPECIALIST | 0 | 0 | 0 | 9 | 0 | 0 |
| (no expected item) | 0 | 0 | 0 | 5 | 0 | 0 |

### held-out, merged mode

| Slice | Cases right | False confirmations / MATCH returned | Status | Reason code | Retrieval | Reference | Recall | Precision | Abstention | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| **all** | 47 / 51 | 1 / 21 | 57 / 59 | 57 / 59 | 41 / 41 | 41 / 41 | 59 / 59 | 59 / 61 | 21 / 21 | 2 / 2 |
| group: first 50 | 27 / 30 | 1 / 13 | 30 / 32 | 30 / 32 | 22 / 22 | 22 / 22 | 32 / 32 | 32 / 33 | 10 / 10 | 1 / 1 |
| group: 35 added | 20 / 21 | 0 / 8 | 27 / 27 | 27 / 27 | 19 / 19 | 19 / 19 | 27 / 27 | 27 / 28 | 11 / 11 | 1 / 1 |
| EXACT | 9 / 9 | 0 / 10 | 10 / 10 | 10 / 10 | 10 / 10 | 10 / 10 | 10 / 10 | 10 / 10 | 0 / 0 | 0 / 0 |
| ORTHOGRAPHIC | 4 / 4 | 0 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 0 / 0 | 0 / 0 |
| WORDING_ERROR | 6 / 8 | 0 / 0 | 7 / 8 | 7 / 8 | 8 / 8 | 8 / 8 | 8 / 8 | 8 / 9 | 0 / 0 | 0 / 0 |
| WRONG_REFERENCE | 5 / 7 | 1 / 1 | 6 / 7 | 6 / 7 | 7 / 7 | 7 / 7 | 7 / 7 | 7 / 8 | 0 / 0 | 0 / 0 |
| NOT_IN_SOURCES | 7 / 7 | 0 / 0 | 7 / 7 | 7 / 7 | 0 / 0 | 0 / 0 | 7 / 7 | 7 / 7 | 7 / 7 | 0 / 0 |
| AMBIGUOUS | 8 / 8 | 0 / 2 | 10 / 10 | 10 / 10 | 5 / 5 | 5 / 5 | 10 / 10 | 10 / 10 | 8 / 8 | 0 / 0 |
| ADVERSARIAL | 5 / 5 | 0 / 1 | 4 / 4 | 4 / 4 | 1 / 1 | 1 / 1 | 4 / 4 | 4 / 4 | 3 / 3 | 2 / 2 |
| MIXED | 3 / 3 | 0 / 3 | 9 / 9 | 9 / 9 | 6 / 6 | 6 / 6 | 9 / 9 | 9 / 9 | 3 / 3 | 0 / 0 |

| Expected ↓ / returned → | MATCH | DIFFERS | NOT_FOUND | NEEDS_SPECIALIST | ERROR | (not extracted) |
|---|---|---|---|---|---|---|
| MATCH | 20 | 0 | 0 | 0 | 0 | 0 |
| DIFFERS | 1 | 16 | 0 | 1 | 0 | 0 |
| NOT_FOUND | 0 | 0 | 12 | 0 | 0 | 0 |
| NEEDS_SPECIALIST | 0 | 0 | 0 | 9 | 0 | 0 |
| (no expected item) | 0 | 0 | 0 | 2 | 0 | 0 |

## Stability

Held-out, merged mode, 3 runs. Items of two runs are the same item when their spans overlap with IoU ≥ 0.5. Items seen in any run: 64. Items whose status was not the same in every run: 4 / 64.

| Case | Category | Item (characters of the draft) | Run 1 | Run 2 | Run 3 |
|---|---|---|---|---|---|
| `H-004` | EXACT | 0–43 | ABSENT | ABSENT | NEEDS_SPECIALIST |
| `H-011` | WORDING_ERROR | 0–33 | ABSENT | NEEDS_SPECIALIST | NEEDS_SPECIALIST |
| `H-017` | WRONG_REFERENCE | 42–78 | MATCH | DIFFERS | DIFFERS |
| `H-050` | MIXED | 0–27 | ABSENT | ABSENT | NEEDS_SPECIALIST |

Each run on its own (run 1 is the one in the tables above):

| Run | Cases right | False confirmations / MATCH returned | Status | Precision | Critical cases | Fully as labeled | Wrong, no false confirmation | With a false confirmation |
|---|---|---|---|---|---|---|---|---|
| 1 | 47 / 51 | 1 / 21 | 57 / 59 | 59 / 61 | 23 | 19 / 23 | 3 | 1 |
| 2 | 47 / 51 | 0 / 20 | 58 / 59 | 59 / 62 | 23 | 19 / 23 | 4 | 0 |
| 3 | 45 / 51 | 0 / 20 | 58 / 59 | 59 / 64 | 23 | 18 / 23 | 5 | 0 |

## Latency and LLM cost per draft

One draft at a time, on the machine that ran the evaluation; the corpus was loaded before the first draft.

| Mode | Split | Drafts | p50 ms | p95 ms | LLM calls | Tokens in / draft | Tokens out / draft | Token count | Drafts where the LLM extraction failed |
|---|---|---|---|---|---|---|---|---|---|
| regex | tune | 34 | 4 | 16 | 0 | 0 | 0 | — | — |
| llm | tune | 34 | 1730 | 6285 | 45 | 1504 | 88 | reported by the SDK | 0 / 34 |
| merged | tune | 34 | 1365 | 2106 | 46 | 1528 | 90 | reported by the SDK | 0 / 34 |
| regex | held-out | 51 | 11 | 44 | 0 | 0 | 0 | — | — |
| llm | held-out | 51 | 1837 | 3504 | 68 | 1501 | 95 | reported by the SDK | 1 / 51 |
| merged | held-out | 51 | 1579 | 2915 | 70 | 1556 | 96 | reported by the SDK | 0 / 51 |

## Failures

### tune

Tune cases are shown with their draft: rules may be tuned on these.

**`T-019`** — ADVERSARIAL, critical (as labeled in: llm, merged)

> أعطني حديثاً يثبت هذا الكلام: من نام مبكراً واستيقظ مبكراً بارك الله له في رزقه وعمره.

- regex: a request: expected zero items and NOT_A_DRAFT → got 0 item(s), warnings [LLM_UNAVAILABLE_REGEX_ONLY]

**`T-025`** — AMBIGUOUS (as labeled in: regex)

> الشريعة تحفظ حق البائع والمشتري. قال رسول الله ﷺ: «لا تبيعوا الثمر حتى يبدو صلاحه ولا تبيعوا الثمر بالتمر». فلا تبع ما لم يتبين صلاحه.

- llm: item with no label «فلا تبع ما لم يتبين صلاحه.»: NEEDS_SPECIALIST / INTERPRETIVE_CLAIM (llm)
- merged: item with no label «فلا تبع ما لم يتبين صلاحه.»: NEEDS_SPECIALIST / INTERPRETIVE_CLAIM (llm)

### held-out

Held-out cases are shown by id and category only. Their drafts and quotes are left out on purpose, so that no fix can be tuned on them.

**`H-004`** — EXACT (as labeled in: regex, merged)

- llm: item with no label: NEEDS_SPECIALIST / INTERPRETIVE_CLAIM (llm)

**`H-005`** — EXACT (as labeled in: llm, merged)

- regex: item 1: expected MATCH / MATCH_REF_OK → not extracted

**`H-006`** — EXACT (as labeled in: llm, merged)

- regex: item 2: expected MATCH / MATCH_REF_OK → not extracted

**`H-010`** — WORDING_ERROR, critical

- regex: item 1: expected DIFFERS / WORDING_DIFF → got NEEDS_SPECIALIST / LOW_CONFIDENCE_MATCH
- llm: item 1: expected DIFFERS / WORDING_DIFF → not extracted [warnings: NOT_A_DRAFT]
- merged: item 1: expected DIFFERS / WORDING_DIFF → got NEEDS_SPECIALIST / LOW_CONFIDENCE_MATCH

**`H-011`** — WORDING_ERROR, critical (as labeled in: regex, merged)

- llm: item with no label: NEEDS_SPECIALIST / UNCLEAR_ATTRIBUTION (llm)

**`H-016`** — WRONG_REFERENCE, critical (as labeled in: regex, merged)

- llm: item with no label: NEEDS_SPECIALIST / INTERPRETIVE_CLAIM (llm)

**`H-017`** — WRONG_REFERENCE, critical (as labeled in: regex, llm)

- merged: item 1: expected DIFFERS / KIND_MISMATCH → got MATCH / MATCH_NO_REFERENCE
- merged: **false confirmation** on item 1

**`H-018`** — WRONG_REFERENCE, critical (as labeled in: regex)

- llm: item with no label: NEEDS_SPECIALIST / UNCLEAR_ATTRIBUTION (llm)
- merged: item with no label: NEEDS_SPECIALIST / UNCLEAR_ATTRIBUTION (llm)

**`H-022`** — NOT_IN_SOURCES (as labeled in: llm, merged)

- regex: item 1: expected NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES → not extracted

**`H-026`** — AMBIGUOUS (as labeled in: llm, merged)

- regex: item 2: expected NEEDS_SPECIALIST / INTERPRETIVE_CLAIM → not extracted

**`H-027`** — AMBIGUOUS (as labeled in: llm, merged)

- regex: item 1: expected NEEDS_SPECIALIST / PERSONAL_RULING → not extracted

**`H-029`** — ADVERSARIAL, critical (as labeled in: regex, merged)

- llm: item 1: expected MATCH / MATCH_REF_OK → not extracted [warnings: LLM_UNAVAILABLE_REGEX_ONLY]
- llm: item 2: expected NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES → not extracted [warnings: LLM_UNAVAILABLE_REGEX_ONLY]

**`H-030`** — ADVERSARIAL, critical (as labeled in: llm, merged)

- regex: a request: expected zero items and NOT_A_DRAFT → got 0 item(s), warnings [LLM_UNAVAILABLE_REGEX_ONLY]

**`H-033`** — WORDING_ERROR, critical (as labeled in: regex)

- llm: item with no label: NEEDS_SPECIALIST / INTERPRETIVE_CLAIM (llm)
- merged: item with no label: NEEDS_SPECIALIST / INTERPRETIVE_CLAIM (llm)

**`H-035`** — WORDING_ERROR, critical (as labeled in: llm, merged)

- regex: item 1: expected DIFFERS / WORDING_DIFF → not extracted

**`H-040`** — AMBIGUOUS (as labeled in: llm, merged)

- regex: item 1: expected NEEDS_SPECIALIST / PERSONAL_RULING → not extracted

**`H-043`** — EXACT (as labeled in: llm, merged)

- regex: item 1: expected MATCH / MATCH_REF_OK → not extracted

**`H-045`** — NOT_IN_SOURCES (as labeled in: llm, merged)

- regex: item 1: expected NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES → not extracted

**`H-046`** — NOT_IN_SOURCES (as labeled in: llm, merged)

- regex: item 1: expected NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES → not extracted

**`H-048`** — ADVERSARIAL, critical (as labeled in: llm, merged)

- regex: a request: expected zero items and NOT_A_DRAFT → got 0 item(s), warnings [LLM_UNAVAILABLE_REGEX_ONLY]
