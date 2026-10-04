# CLAUDE.md — instructions for every Claude session in this repo

@AGENTS.md

`AGENTS.md` (imported above) is the source of truth for scope, rules and architecture.
This file adds how to work. If the two ever disagree, `AGENTS.md` wins.

## 1. Code

- Write clean, modular, efficient and scalable code.
- Keep it simple. Do not over-engineer: no abstraction, option or layer until something needs it.
- One job per file and per function. Reuse what exists before adding something new.
- Match the code around you: its naming, its comment style, its tests.
- Build only what the task asks. Put other ideas in `docs/BACKLOG.md`.

**Example.** The task is "add a copy button for the report". Good: one pure function in
`src/components/lib/report.ts` with a test, plus a small button that reuses `CopyButton`.
Not good: a new "export framework" with formats nobody asked for.

## 2. Answers and explanations

- Keep them simple, clear, short and direct. Lead with the answer.
- Use plain words. Avoid complex terms; if you must use one, explain it in a few words.
- Explain a flow with a small example, step by step.

**Example.** To explain a status, show the flow instead of describing it in the abstract:

```
draft: قال تعالى: ﴿إن مع العسر يسرا﴾ [الشرح: 7]
 1. extract  → the quote «إن مع العسر يسرا», claimed as quran, reference الشرح: 7
 2. match    → found word for word in quran:94:6
 3. decide   → the text matches, but the cited ayah is 7 and the source says 6
 4. result   → DIFFERS / REF_MISMATCH_AYAH, with the source text and its citation
```

## 3. Before you say "done"

Run all four and report what happened, including failures:

```
npm run lint && npm run typecheck && npm test && npm run build
```

- Changed a zod schema in `src/core/types.ts`? Run `npm run docs:api`.
- Changed behavior? Update `docs/ARCHITECTURE.md`. Made a choice the task left open? Record it in
  `docs/DECISIONS.md`.
- Do not commit or tag unless the owner asks.

## 4. Reference documents

Read these when the task touches them. They are extracted from the organisers' PDFs.

| File | Read it when |
|---|---|
| `docs/reference/scientific-package.md` | Anything about religious content: which sources are approved, the content levels, the binding rules, the safety test cases, the glossary |
| `docs/reference/challenge-guide.md` | Docs for judges, the demo, the presentation, or any choice about what to build first: track 4, judging criteria and weights, deliverables, dates |

## 5. Project skills (`.claude/skills/`)

| Skill | Use it for |
|---|---|
| `frontend` | UI work in `src/app`, `src/components`, `src/i18n` |
| `corpus` | Source data: `data/`, `scripts/`, adding or rebuilding a source, aliases, review files |
| `core-pipeline` | `src/core`: extractors, matchers, status rules, diff, the orchestrator, the API schema |
| `llm` | `src/llm`, prompts, validators of model output, privacy of what is sent |
| `source-decisions` | A question about religious content the task leaves open |
| `evaluation` | `eval/` cases, labels, metrics, the tune and held-out splits |
| `submission` | README and docs for judges, the demo script, the presentation |
