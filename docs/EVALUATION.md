# Azw — evaluation

This document contains the evaluation method, the final result to quote and its limits. Dated raw
reports remain in `eval/results/`; earlier runs are evidence of the development process, not current
headline numbers.

## 1. Review status

**No evaluation case has been reviewed by a qualified specialist or an independent human reviewer.**
The cases were drafted and source-checked by an AI coding assistant under the project's documented
rules. The labels are engineering test labels, not religious judgments.

The original 50 cases were written before product matching code existed. A further 35 cases were
added after the rules were known, before the first evaluation run; those 35 are not blind. The
held-out split has since been run repeatedly, and D-31 was written after one held-out failure, so the
entire held-out set must not be described as untouched.

## 2. Dataset

| Split | Cases | Expected items | Use |
|---|---:|---:|---|
| `eval/cases/tune.jsonl` | 34 | 37 | rule and prompt fixes |
| `eval/cases/heldout.jsonl` | 51 | 59 | reported result |
| **Total** | **85** | **96** | 36 cases marked critical |

Cases cover correct Quran and hadith quotations, wording and reference errors, Quran spelling,
Uthmani pastes, kind mismatches, unknown sayings, ambiguous attribution, interpretive claims,
personal rulings, mixed drafts, no-quote inputs and operational edge cases.

Each JSONL row contains the draft, expected spans, status, reason, content level, source ids when
applicable and whether the case is critical. `npm run check:cases` validates ids, source text and
label structure against the corpus.

### How text and labels were produced

- Source-backed quotations were copied from corpus `exactText`.
- Wording errors were explicit edits of those strings, recorded with their source ids.
- References were checked against record citations and the deterministic rules.
- Claims and referrals follow the content levels in the scientific package.
- A case was omitted when the available sources and written rules could not support one closed label.
- `NOT_FOUND` labels mean only “not verified in the covered corpus”.

## 3. Runner and modes

`eval/run-eval.ts` loads the same corpus and review orchestrator as the API and runs three modes:

| Mode | Extraction |
|---|---|
| `regex` | deterministic extractor only; baseline |
| `llm` | LLM extractor only |
| `merged` | regex and LLM together; production path |

Returned items are paired one-to-one with expected items by span overlap. An unextracted expected
item fails status, reason and retrieval. An extra returned item reduces precision and makes the case
incorrect. A false confirmation is any returned `MATCH` not supported by its paired label.

The runner records status and reason accuracy, source retrieval, extraction precision/recall,
abstention, scope-message handling, strict cases-right, false confirmations, latency, tokens,
explanation acceptance and stability across runs.

## 4. Final result — 5 October 2026

Full report: `eval/results/2026-10-05-p2-e2bfaf5a3ad2.md`.

| Setting | Value |
|---|---|
| Corpus | `p2-e2bfaf5a3ad2`; Quran, Bukhari, Muslim |
| Provider/model | OpenAI, `gpt-5.6-luna` |
| Reasoning effort | `none` |
| Timeout | 15 seconds |
| Prompt versions | extraction 3, explanation 2 |

**Release gate: PASS.** Across the reported three production runs, none of the 23 critical held-out
cases produced a false confirmation.

### Held-out result

| Metric | Regex baseline | Merged production |
|---|---:|---:|
| False confirmations / returned `MATCH` | 0 / 17 | 0 / 20 |
| Status accuracy | 48 / 59 | 58 / 59 |
| Source retrieval | 37 / 41 | 41 / 41 |
| Extraction recall | 49 / 59 | 59 / 59 |
| Extraction precision | 49 / 49 | 59 / 63 |
| Abstention | 15 / 21 | 21 / 21 |
| Requests given the scope message | 0 / 2 | 2 / 2 |
| Cases entirely right | 38 / 51 | 46 / 51 |
| Latency p50 / p95 | 4 / 15 ms | 1,498 / 3,676 ms |

The LLM changes the extraction coverage, not the source of truth: 12 held-out cases were right only
in merged mode, while four were right only in regex mode because the model added an unexpected
`NEEDS_SPECIALIST` card. No such extra card was a `MATCH`.

### Critical stability

| 23 critical held-out cases, merged | Run 1 | Run 2 | Run 3 |
|---|---:|---:|---:|
| Fully as labeled | 19 | 18 | 19 |
| Wrong, without a false confirmation | 4 | 5 | 4 |
| With a false confirmation | 0 | 0 | 0 |

One item of 64 changed between the three merged runs: an unexpected referral card appeared once. No
labeled item's status changed.

### Failure found and fixed

Before the final report, critical case `H-017` sometimes ended `MATCH` after merging an LLM span
inside Quran marks with a hadith candidate. The cause was reproduced without reading the held-out
draft: a partial span inside `﴿…﴾` lost the verse claim. D-31 records the rule that any span inside
one Quran-mark pair remains claimed as Quran. The failing report was retained, and `H-017` passed in
LLM mode and three merged runs after the fix.

Because the rule was motivated by a held-out failure, `H-017` is no longer blind evidence for that
rule.

## 5. Reasoning-effort comparison

Three runs of each setting on the same held-out split showed the tradeoff:

| Metric | `none` (deployed setting) | `medium` |
|---|---:|---:|
| Latency p50 / p95 | 1,498 / 3,676 ms | 2,804 / 5,289 ms |
| Critical cases fully labeled per run | 19, 18, 19 of 23 | 21, 21, 21 of 23 |
| Extraction precision per run | 59/63, 59/64, 59/63 | 59/60, 59/61, 59/61 |
| False confirmations | 0 in every run | 0 in every run |
| Output tokens per draft | 97 | 255 |

`none` was selected for latency (D-30), with the explicit cost that it produces more conservative
extra cards. `low` was not measured.

## 6. Cost estimate

The final held-out run averaged 1,540 input and 96 output tokens per draft, including eligible
explanation calls. At the OpenAI list price checked on 6 October 2026 for `gpt-5.6-luna`—$0.20 input
and $1.20 output per million tokens—the uncached estimate is:

```text
(1,540 × $0.20 + 96 × $1.20) / 1,000,000
= $0.0004232 per short review
≈ $0.42 per 1,000 reviews
```

This is an estimate, not a bill. Evaluation drafts contain one to four sentences; 12,000-character
drafts were not costed. It excludes hosting and assumes no cached-input discount. Pricing can change;
the current value belongs in the model provider's official documentation, not in application logic.

## 7. Comparison with manual checking

The owner checked 12 tune drafts manually using Quranpedia for Quran and Dorar for hadith. The set
contained four wording errors, five reference errors, one text outside the corpus and two correct
drafts.

| Result | Manual search | Azw merged |
|---|---:|---:|
| Total time | 24 min 40 s | about 17 s, estimated from the measured p50 |
| Per draft | median 2 min 02 s; range 1:00–3:08 | p50 1.4 s; p95 2.7 s on all tune drafts |
| Labeled outcome found | 12 / 12 | 12 / 12 |
| Source text and word diff shown | No | Yes |

At the medians, the manual task took more than 70 times as long. This demonstrates a time
difference, not higher correctness: the owner found all 12 expected outcomes manually too.

Limits of the comparison:

- one person, one sitting, short one-quote drafts;
- the checker was the project owner, knew the project and was not independently observed;
- the cases were from the tune split used to improve the rules;
- Azw's time excludes pasting and reading the cards, while manual time includes reading search results;
- the 17-second total is derived from p50, not a separate stopwatch run on those 12 drafts.

## 8. Limits that accompany every result

- The cases and labels lack qualified human review.
- The sample is small, Arabic-only and covers the MVP corpus.
- Thirty-five cases were written after the rules were known; they are not blind.
- Held-out was run repeatedly and one rule was added after a held-out failure.
- Only one model and one provider were measured.
- LLM extraction is nondeterministic even with the selected settings.
- Latency came from one developer environment, not the deployed host.
- The runner does not judge whether generated explanations are factually true; it checks schema and grounding constraints.
- Corpus review itself is sample-based and has the gaps documented in `SOURCES.md`.

## 9. Reproduce

```bash
npm run check:cases
npm run eval
```

`npm run eval` reads `.env`, calls the configured provider and may incur cost. It writes a dated
report rather than replacing prior evidence. Release-gate rules are implemented in `eval/lib/` and
tested independently.
