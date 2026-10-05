# Evaluation — 2026-10-05 — corpus p2-e2bfaf5a3ad2

Written by `eval/run-eval.ts` (`npm run eval`). Method and definitions: `docs/EVALUATION.md`.

**The cases were not reviewed by a person.** They were drafted and checked by an AI assistant (`docs/EVALUATION.md` §1).

## Run

- Corpus version: `p2-e2bfaf5a3ad2`; collections searched: quran, bukhari, muslim.
- Cases: 51 held-out.
- LLM: provider `openai`, model `gpt-5.6-luna`, time budget 15000 ms, reasoning effort medium. Extraction prompt version 3, explanation prompt version 2.
- Modes: `regex` = the regex extractor alone (the baseline); `llm` = the LLM extractor alone; `merged` = both (production).
- Pairing: a returned item is paired with an expected item when their spans overlap with IoU ≥ 0.5, one to one.
- Every number is a count over its denominator. 85 cases is a small sample.

## Release gate

**PASS**

- PASS — Zero false confirmations on critical held-out cases, merged mode: 0 false confirmation(s) in 23 critical cases.
- PASS — Zero false confirmations on critical held-out cases, regex mode: 0 false confirmation(s) in 23 critical cases.
- PASS — No ERROR item carries evidence: 0 ERROR item(s) with evidence, over every run of this report.

## Critical cases

The gate counts false confirmations only. This table says how many critical cases are fully as labeled. A case that is wrong
without a false confirmation erred on the cautious side: the tool abstained, missed an item, or returned an item no label expects.

| Split | Mode | Critical cases | Fully as labeled | Wrong, no false confirmation | With a false confirmation |
|---|---|---|---|---|---|
| held-out | regex | 23 | 19 / 23 | 4 | 0 |
| held-out | llm | 23 | 19 / 23 | 3 | 1 |
| held-out | merged | 23 | 21 / 23 | 2 | 0 |

## Baseline comparison: regex against merged

### held-out

| Metric | regex | llm | merged |
|---|---|---|---|
| Cases right | 38 / 51 | 46 / 51 | 48 / 51 |
| False confirmations / MATCH returned | 0 / 17 | 1 / 21 | 0 / 20 |
| Status accuracy | 48 / 59 | 57 / 59 | 58 / 59 |
| Reason-code accuracy | 48 / 59 | 56 / 59 | 57 / 59 |
| Source retrieval | 37 / 41 | 40 / 41 | 41 / 41 |
| Extraction recall | 49 / 59 | 58 / 59 | 59 / 59 |
| Extraction precision | 49 / 49 | 58 / 60 | 59 / 60 |
| Abstention | 15 / 21 | 21 / 21 | 21 / 21 |
| Requests given the scope message | 0 / 2 | 2 / 2 | 2 / 2 |

- **What the LLM adds.** Cases right with the LLM and wrong without it (11): `H-005`, `H-006`, `H-022`, `H-026`, `H-030`, `H-035`, `H-040`, `H-043`, `H-045`, `H-046`, `H-048`.
- **What the LLM breaks.** Cases right without the LLM and wrong with it (1): `H-033`.
- **Explanations.** DIFFERS items returned in merged mode that carry a generated explanation (it passed the validator): 17 / 17.
- **What it costs.** Latency per draft p50 / p95: 4 / 19 ms (regex) against 2804 / 5289 ms (merged). LLM calls: 70 over 51 drafts; tokens per draft: 1556 in, 255 out (reported by the SDK).

## Metrics

Columns: **Cases right** = nothing in the case differs from its label. **False confirmations** = MATCH items not paired with an
expected MATCH item, over the MATCH items returned (the primary metric). **Status**, **Reason code** = expected items whose paired
item has the expected status (and reason code), over the expected items; an item that was not extracted counts as wrong.
**Retrieval** = an expected record is among the evidence; **Reference** = the first citation shown is that of an expected record;
both over the expected items that list records. **Recall** = expected items found; **Precision** = returned items that are an
expected item. **Abstention** = expected NOT_FOUND and NEEDS_SPECIALIST items that end so. **Requests** = inputs that are not a
draft, answered with zero items and the warning NOT_A_DRAFT.

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
| **all** | 46 / 51 | 1 / 21 | 57 / 59 | 56 / 59 | 40 / 41 | 40 / 41 | 58 / 59 | 58 / 60 | 21 / 21 | 2 / 2 |
| group: first 50 | 27 / 30 | 1 / 13 | 30 / 32 | 29 / 32 | 21 / 22 | 21 / 22 | 31 / 32 | 31 / 31 | 10 / 10 | 1 / 1 |
| group: 35 added | 19 / 21 | 0 / 8 | 27 / 27 | 27 / 27 | 19 / 19 | 19 / 19 | 27 / 27 | 27 / 29 | 11 / 11 | 1 / 1 |
| EXACT | 9 / 9 | 0 / 10 | 10 / 10 | 10 / 10 | 10 / 10 | 10 / 10 | 10 / 10 | 10 / 10 | 0 / 0 | 0 / 0 |
| ORTHOGRAPHIC | 4 / 4 | 0 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 0 / 0 | 0 / 0 |
| WORDING_ERROR | 6 / 8 | 0 / 0 | 7 / 8 | 7 / 8 | 7 / 8 | 7 / 8 | 7 / 8 | 7 / 8 | 0 / 0 | 0 / 0 |
| WRONG_REFERENCE | 5 / 7 | 1 / 1 | 6 / 7 | 6 / 7 | 7 / 7 | 7 / 7 | 7 / 7 | 7 / 8 | 0 / 0 | 0 / 0 |
| NOT_IN_SOURCES | 7 / 7 | 0 / 0 | 7 / 7 | 7 / 7 | 0 / 0 | 0 / 0 | 7 / 7 | 7 / 7 | 7 / 7 | 0 / 0 |
| AMBIGUOUS | 7 / 8 | 0 / 2 | 10 / 10 | 9 / 10 | 5 / 5 | 5 / 5 | 10 / 10 | 10 / 10 | 8 / 8 | 0 / 0 |
| ADVERSARIAL | 5 / 5 | 0 / 1 | 4 / 4 | 4 / 4 | 1 / 1 | 1 / 1 | 4 / 4 | 4 / 4 | 3 / 3 | 2 / 2 |
| MIXED | 3 / 3 | 0 / 3 | 9 / 9 | 9 / 9 | 6 / 6 | 6 / 6 | 9 / 9 | 9 / 9 | 3 / 3 | 0 / 0 |

| Expected ↓ / returned → | MATCH | DIFFERS | NOT_FOUND | NEEDS_SPECIALIST | ERROR | (not extracted) |
|---|---|---|---|---|---|---|
| MATCH | 20 | 0 | 0 | 0 | 0 | 0 |
| DIFFERS | 1 | 16 | 0 | 0 | 0 | 1 |
| NOT_FOUND | 0 | 0 | 12 | 0 | 0 | 0 |
| NEEDS_SPECIALIST | 0 | 0 | 0 | 9 | 0 | 0 |
| (no expected item) | 0 | 0 | 0 | 2 | 0 | 0 |

### held-out, merged mode

| Slice | Cases right | False confirmations / MATCH returned | Status | Reason code | Retrieval | Reference | Recall | Precision | Abstention | Requests |
|---|---|---|---|---|---|---|---|---|---|---|
| **all** | 48 / 51 | 0 / 20 | 58 / 59 | 57 / 59 | 41 / 41 | 41 / 41 | 59 / 59 | 59 / 60 | 21 / 21 | 2 / 2 |
| group: first 50 | 28 / 30 | 0 / 12 | 31 / 32 | 30 / 32 | 22 / 22 | 22 / 22 | 32 / 32 | 32 / 32 | 10 / 10 | 1 / 1 |
| group: 35 added | 20 / 21 | 0 / 8 | 27 / 27 | 27 / 27 | 19 / 19 | 19 / 19 | 27 / 27 | 27 / 28 | 11 / 11 | 1 / 1 |
| EXACT | 9 / 9 | 0 / 10 | 10 / 10 | 10 / 10 | 10 / 10 | 10 / 10 | 10 / 10 | 10 / 10 | 0 / 0 | 0 / 0 |
| ORTHOGRAPHIC | 4 / 4 | 0 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 0 / 0 | 0 / 0 |
| WORDING_ERROR | 6 / 8 | 0 / 0 | 7 / 8 | 7 / 8 | 8 / 8 | 8 / 8 | 8 / 8 | 8 / 9 | 0 / 0 | 0 / 0 |
| WRONG_REFERENCE | 7 / 7 | 0 / 0 | 7 / 7 | 7 / 7 | 7 / 7 | 7 / 7 | 7 / 7 | 7 / 7 | 0 / 0 | 0 / 0 |
| NOT_IN_SOURCES | 7 / 7 | 0 / 0 | 7 / 7 | 7 / 7 | 0 / 0 | 0 / 0 | 7 / 7 | 7 / 7 | 7 / 7 | 0 / 0 |
| AMBIGUOUS | 7 / 8 | 0 / 2 | 10 / 10 | 9 / 10 | 5 / 5 | 5 / 5 | 10 / 10 | 10 / 10 | 8 / 8 | 0 / 0 |
| ADVERSARIAL | 5 / 5 | 0 / 1 | 4 / 4 | 4 / 4 | 1 / 1 | 1 / 1 | 4 / 4 | 4 / 4 | 3 / 3 | 2 / 2 |
| MIXED | 3 / 3 | 0 / 3 | 9 / 9 | 9 / 9 | 6 / 6 | 6 / 6 | 9 / 9 | 9 / 9 | 3 / 3 | 0 / 0 |

| Expected ↓ / returned → | MATCH | DIFFERS | NOT_FOUND | NEEDS_SPECIALIST | ERROR | (not extracted) |
|---|---|---|---|---|---|---|
| MATCH | 20 | 0 | 0 | 0 | 0 | 0 |
| DIFFERS | 0 | 17 | 0 | 1 | 0 | 0 |
| NOT_FOUND | 0 | 0 | 12 | 0 | 0 | 0 |
| NEEDS_SPECIALIST | 0 | 0 | 0 | 9 | 0 | 0 |
| (no expected item) | 0 | 0 | 0 | 1 | 0 | 0 |

## Stability

Held-out, merged mode, 3 runs. Items of two runs are the same item when their spans overlap with IoU ≥ 0.5. Items seen in any run: 61. Items whose status was not the same in every run: 1 / 61.

| Case | Category | Item (characters of the draft) | Run 1 | Run 2 | Run 3 |
|---|---|---|---|---|---|
| `H-004` | EXACT | 0–43 | ABSENT | NEEDS_SPECIALIST | NEEDS_SPECIALIST |

Each run on its own (run 1 is the one in the tables above):

| Run | Cases right | False confirmations / MATCH returned | Status | Precision | Critical cases | Fully as labeled | Wrong, no false confirmation | With a false confirmation |
|---|---|---|---|---|---|---|---|---|
| 1 | 48 / 51 | 0 / 20 | 58 / 59 | 59 / 60 | 23 | 21 / 23 | 2 | 0 |
| 2 | 47 / 51 | 0 / 20 | 58 / 59 | 59 / 61 | 23 | 21 / 23 | 2 | 0 |
| 3 | 48 / 51 | 0 / 20 | 58 / 59 | 59 / 61 | 23 | 21 / 23 | 2 | 0 |

## Latency and LLM cost per draft

One draft at a time, on the machine that ran the evaluation; the corpus was loaded before the first draft.

| Mode | Split | Drafts | p50 ms | p95 ms | LLM calls | Tokens in / draft | Tokens out / draft | Token count | Drafts where the LLM extraction failed |
|---|---|---|---|---|---|---|---|---|---|
| regex | held-out | 51 | 4 | 19 | 0 | 0 | 0 | — | — |
| llm | held-out | 51 | 2813 | 8027 | 67 | 1510 | 227 | reported by the SDK | 0 / 51 |
| merged | held-out | 51 | 2804 | 5289 | 70 | 1556 | 255 | reported by the SDK | 0 / 51 |

## Failures

### held-out

Held-out cases are shown by id and category only. Their drafts and quotes are left out on purpose, so that no fix can be tuned on them.

**`H-005`** — EXACT (as labeled in: llm, merged)

- regex: item 1: expected MATCH / MATCH_REF_OK → not extracted

**`H-006`** — EXACT (as labeled in: llm, merged)

- regex: item 2: expected MATCH / MATCH_REF_OK → not extracted

**`H-010`** — WORDING_ERROR, critical

- regex: item 1: expected DIFFERS / WORDING_DIFF → got NEEDS_SPECIALIST / LOW_CONFIDENCE_MATCH
- llm: item 1: expected DIFFERS / WORDING_DIFF → not extracted [warnings: NOT_A_DRAFT]
- merged: item 1: expected DIFFERS / WORDING_DIFF → got NEEDS_SPECIALIST / LOW_CONFIDENCE_MATCH

**`H-017`** — WRONG_REFERENCE, critical (as labeled in: regex, merged)

- llm: item 1: expected DIFFERS / KIND_MISMATCH → got MATCH / MATCH_NO_REFERENCE
- llm: **false confirmation** on item 1

**`H-022`** — NOT_IN_SOURCES (as labeled in: llm, merged)

- regex: item 1: expected NOT_FOUND / NO_RECORD_IN_COVERED_SOURCES → not extracted

**`H-026`** — AMBIGUOUS (as labeled in: llm, merged)

- regex: item 2: expected NEEDS_SPECIALIST / INTERPRETIVE_CLAIM → not extracted

**`H-027`** — AMBIGUOUS

- regex: item 1: expected NEEDS_SPECIALIST / PERSONAL_RULING → not extracted
- llm: item 1: expected NEEDS_SPECIALIST / PERSONAL_RULING → got NEEDS_SPECIALIST / INTERPRETIVE_CLAIM
- merged: item 1: expected NEEDS_SPECIALIST / PERSONAL_RULING → got NEEDS_SPECIALIST / INTERPRETIVE_CLAIM

**`H-030`** — ADVERSARIAL, critical (as labeled in: llm, merged)

- regex: a request: expected zero items and NOT_A_DRAFT → got 0 item(s), warnings [LLM_UNAVAILABLE_REGEX_ONLY]

**`H-031`** — WRONG_REFERENCE, critical (as labeled in: regex, merged)

- llm: item with no label: NEEDS_SPECIALIST / INTERPRETIVE_CLAIM (llm)

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
