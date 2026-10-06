# Azw — starting point and judging boundary

The participant guide states that only work from **4–6 October 2026** is judged. This document
separates that work from earlier preparation and product development.

## 1. Markers

| Marker | Commit | Time (Riyadh) | Meaning |
|---|---|---|---|
| `pre-challenge-start` tag | `aa9a516` | 2026-10-02 23:36 | End of initial data, scripts, cases and specification preparation |
| Official judging boundary | `c97d946` | 2026-10-03 22:44 | Last repository commit before 4 October; the product state already present here is not counted as work from 4–6 October |

The existing tag must not be moved. It is an earlier preparation marker, not the official judging
boundary. To inspect eligible repository changes, use:

```bash
git log c97d946..HEAD --oneline
git diff c97d946..HEAD --stat
```

## 2. State at the preparation tag — 2 October

At `aa9a516` the repository held:

- the project specification and scientific constraints in `AGENTS.md`;
- pinned Quran and Sahihayn raw data, built corpus and machine-readable manifest;
- source approvals, held-record evidence and initial source/evaluation documentation;
- corpus build, verification, Dorar sample and case-checking scripts;
- 20 tune and 30 held-out labeled cases;
- no `src/`, product matcher, API, UI, LLM adapter or evaluation runner.

That tag remains useful for proving which preparatory assets predated product implementation.

## 3. Product state before the official challenge days

Product work began on 3 October -**IMPORTANT:** see the reason bellow-. By commit `c97d946`, before the official 4 October start, the
repository already contained:

- the Next.js application shell, Arabic RTL interface and information pages;
- core zod contracts and boundary rules;
- Arabic normalization and offset maps;
- Quran everyday-spelling aliases and Uthmani search variants;
- deterministic Quran and hadith reference parsing;
- the in-memory corpus index and loader;
- Quran and hadith matchers, word diff and deterministic status rules;
- regex extraction and OpenAI structured extraction with span validation and merge;
- `POST /api/v1/review`, `GET /api/v1/health`, rate limiting, CORS and logging;
- source-backed UI cards and the initial documentation for those components.

This work is disclosed as pre-challenge product work. The owner started early because of daytime job
constraints -from 9:00 AM until 5:00 PM-.

## 4. Work committed during 4–6 October

The eligible period added or materially changed:

- grounded generated explanations for `DIFFERS` items and a copyable report;
- prompt-injection, privacy, transparency, failure-mode and secret audits;
- source-backed corrections and the revised-draft workflow;
- expansion of the labeled set from 50 to 85 cases;
- the evaluation runner, baseline comparison, stability runs, cost measurement and manual-time comparison;
- tune-split extraction fixes and explicit documentation of held-out exposure;
- the redesigned one-screen/one-card result flow;
- parallel explanation calls and configurable reasoning effort for latency;
- the D-31 fix for preserving a Quran claim inside `﴿…﴾` after a false confirmation was observed;
- deployment tracing and final UI fixes;
- submission documentation, README and license cleanup.

Exact commits and dates are visible in `git log c97d946..HEAD`.

## 5. Rights and provenance

- Quran and hadith data retain the licenses recorded in `docs/SOURCES.md` and `LICENSES_AR.md`.
- Dorar responses are not redistributed; their cache is gitignored.
- Azw's original code and documentation are licensed under the root MIT `LICENSE`.
- AI coding assistants helped prepare code, data checks, cases and documentation under the owner's
  direction. Their source checks are not attributed to a qualified religious specialist.
- The repository history begins on 2 October and contains no earlier application codebase.
