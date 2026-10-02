# Starting point

What existed in this repository before the challenge days (4–6 October 2026).

The participant guide allows earlier work on condition that the starting version is documented and
rights are disclosed, and it evaluates only what is done from 4 to 6 October. This file is that
documentation. Everything listed here is preparation: source data, checks on that data, and test
cases. **No product code existed before 4 October 2026: there was no `src/` directory, no app, no
API, no matching logic, no normalization, no LLM integration and no UI.**

## 1. The marker commit

| | |
|---|---|
| Tag | `pre-challenge-start` |
| Commit | `<PRE_CHALLENGE_COMMIT>` (filled in on 4 October; a commit cannot contain its own hash) |
| Pre-challenge commits | The history starts on 2026-10-02; every commit up to the tag is dated before 4 October |
| Corpus version at the tag | `p0-a6d2d36b84e8` (`data/corpus/manifest.json`) |

To set the marker, on the last commit made before 4 October 09:00 Riyadh time:

```
git tag pre-challenge-start
git push origin pre-challenge-start
git rev-parse --short pre-challenge-start
```

Put the hash printed by the last command in the table above as part of the first commit of
4 October. Do not move the tag afterwards.

To see what was built during the challenge:

```
git log pre-challenge-start..HEAD --oneline
git diff pre-challenge-start..HEAD --stat
```

## 2. What existed at the tag

### Specification

| Path | What it is |
|---|---|
| `AGENTS.md` | Project spec: scope, non-negotiable rules, the four statuses, sources, planned architecture, conventions. It describes `src/` as a plan; none of it was built |

### Data

| Path | What it is |
|---|---|
| `data/raw/quranpedia/` | Quran source files as downloaded: `mushafs-1.json`, `mushafs-1.json.gz`, `manifest.json`, `LICENSE.md` |
| `data/raw/hadith-api/` | Hadith source files as downloaded: `ara-bukhari.min.json`, `ara-muslim.min.json`, `COMMIT.txt` (pinned commit) |
| `data/corpus/quran.json`, `bukhari.json`, `muslim.json` | Built corpus: 6236 Quran, 7580 Bukhari and 7360 Muslim records. `searchText` is empty in every record (normalization is challenge work) |
| `data/corpus/manifest.json`, `build-report.json` | Machine-readable source register and build report |
| `data/aliases/surahs.json` | Surah names and variants |
| `data/review/reviewed.json` | The review list: the owner's approvals (who, when, scope, method) |
| `data/review/held-records.json` | Records kept pending regardless of a collection approval |
| `data/review/dorar-verification.json`, `hadith-review-sample.json` | Results of the sample checks against Dorar |

Not in the repository: `data/raw/dorar-cache/` (cached Dorar responses, all rights reserved,
gitignored).

Review state at the tag: 6236 Quran, 6940 Bukhari and 7169 Muslim records are `reviewed`; 640
Bukhari and 191 Muslim records are `pending`. What "reviewed" means and its limits are in
`docs/SOURCES.md`.

### Scripts (data preparation and checks only)

| Path | What it does |
|---|---|
| `scripts/build-corpus.ts` | Builds `data/corpus/` from `data/raw/` and applies the review list |
| `scripts/verify-corpus.ts` | Checks counts, ids, references, numbering and manifest checksums |
| `scripts/verify-raw.ts` | Checks the raw downloads against their upstream origins (network) |
| `scripts/verify-hadith-dorar.ts` | Spot-checks sampled hadith records against Dorar |
| `scripts/make-review-sheet.ts`, `make-hadith-review-sample.ts` | Generate the review sheets in `docs/` |
| `scripts/probe-quran-spelling.ts` | Reports mushaf spellings in the Quran text for the owner's decision |
| `scripts/check-cases.ts` | Checks the labeled test cases against the corpus |
| `scripts/lib/` | Shared code for the scripts above (corpus schema, hadith source adapter, review gate, matn rule, Dorar client, hand-compiled alternate surah names, case rules) and their unit tests (67 tests) |

None of these scripts normalizes, searches or matches text for the product. The case checker's only
text comparison is an exact substring test.

### Test cases

| Path | What it is |
|---|---|
| `eval/cases/tune.jsonl` | 20 labeled cases, the only ones tuning may use |
| `eval/cases/heldout.jsonl` | 30 labeled cases, reported as the result |

Written on 2026-10-02, before any matching code existed, so the matching logic cannot have been
tuned to them. There was no evaluation harness (`eval/run-eval.ts`) and no results.

### Documents

| Path | What it is |
|---|---|
| `docs/SOURCES.md` | Source register: sources, versions, licenses, numbering, findings, reviewer log |
| `docs/EVALUATION.md` | How the test cases were made and checked, and the status of their human review |
| `docs/DECISIONS.md` | Decisions recorded for human review (D-1 to D-6) |
| `docs/REVIEW_SHEET.md` | The data review sheet the collection approvals were given on |
| `docs/HADITH_REVIEW_SAMPLE.md` | The 24-record hadith sample compared with Dorar |
| `docs/HADITH_FLAGGED_INVESTIGATION.md` | Investigation of the 10 flagged sample records; why six are held |
| `docs/STARTING_POINT.md` | This file |
| `docs/BACKLOG.md` | Headings only |

### Tooling

`package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore`, `.gitattributes`. Development
dependencies only: TypeScript, tsx, zod, @types/node. No Next.js, React, Tailwind, vitest or LLM SDK
was installed.

## 3. What did not exist

- `src/` in any form: `src/core`, `src/llm`, `src/app`, `src/components`, `src/i18n`.
- Arabic normalization, reference parsing, the corpus index, matchers, diff, status rules, the
  orchestrator, extraction (regex or LLM), prompts, the API route, the UI, the PWA files.
- `eval/run-eval.ts`, `eval/results/`, any measured result.
- `README.md`, `LICENSE`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/PRIVACY.md`, a deployment.

## 4. Open at the starting point

- The Quran-spelling decision (`docs/SOURCES.md` section 5 item 3).
- The Quranpedia checksum question (`docs/SOURCES.md` section 3.1).
- Seven held hadith records (`data/review/held-records.json`).
- The human review of the 50 test cases (`docs/EVALUATION.md` section 1).

## 5. Rights and how the work was produced

- **Source data.** The Quran text comes from Quranpedia's official dump and the hadith text from
  fawazahmed0/hadith-api. Their licenses, versions and attribution requirements are in
  `docs/SOURCES.md` and `data/corpus/manifest.json`; the Quranpedia terms as received are in
  `data/raw/quranpedia/LICENSE.md`. Dorar content is all rights reserved and is not redistributed.
- **Code and documents.** Written for this project by the project owner. A license for the code has
  not been chosen yet; it is separate from the data licenses.
- **AI assistance.** The pre-challenge scripts, documents and test cases were written with an AI
  coding agent (Claude Code) under the owner's direction, following a prompt plan the owner keeps
  outside the repository. Approvals of source data were given by the owner, not by the agent.
- **No earlier codebase.** The repository's history starts on 2026-10-02 and holds no code from an
  earlier application.
