# Azw — privacy notice

What Azw does with a draft, as the code stands on 2026-10-04 (after the audit of P13, `docs/DECISIONS.md` D-24). `AGENTS.md` §2 rule 8:
do not store drafts, do not log draft content, publish a short privacy notice. The Arabic notice
shown in the app (`/privacy`) must say what this file says, and no more.

## What is processed

- The draft you submit is sent to the Azw server (`POST /api/v1/review`), compared in memory with
  the source texts, and the result is returned.
- **When an LLM is configured on the server** (`LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY`), **the
  whole draft is sent to the LLM provider** so that the model finds the quotes in it. That is the
  only purpose, and nothing else is sent with it: no address, no identifier. The one provider an
  adapter exists for is OpenAI (`src/llm/openai.ts`, the Responses API). The request asks the
  provider not to store the response (`store: false`). What the provider keeps of what it
  receives is governed by its own terms (<https://developers.openai.com/api/docs/guides/your-data>),
  not by this code.
- **For a quote that ends «مختلف في اللفظ أو المرجع» (`DIFFERS`)**, when the LLM read the draft, a
  second request goes to the same provider to write the short note shown under «شرح مولّد آلياً».
  It holds: the quote, the source text it was compared with, the source's reference, the
  reference the draft cites, the reason code, and the words that differ between the two texts.
  Nothing else is sent with it, and it too asks the provider not to store the response
  (`store: false`). No such request is made for any other status, nor when the extraction failed.
- When no LLM is configured, quotes are found by a rule-based extractor on the Azw server and the
  draft does not leave it. `GET /api/v1/health` reports `llmConfigured`; a result that carries the
  warning `LLM_UNAVAILABLE_REGEX_ONLY` was made without an LLM reading the draft to its end (none
  configured, or the call failed or timed out; a failed call may still have sent the draft).

## What is not kept

- **Azw does not store the draft**: no database, no file, no cache. It exists in the server's
  memory for the time of the request.
- **Azw does not log the draft**, in whole or in part, nor any quote taken from it, nor what the
  LLM returns. The LLM adapter logs nothing.
- **Responses are not cached**: every response carries `Cache-Control: no-store`, and the app's
  service worker (when added) caches the app shell only.
- No account, no cookie and no analytics exist in the app.

## What the server does record

One log line per request, holding only: a random request id, the HTTP status, an outcome code, the
length of the draft in characters, timings, the number of items, the count of each status, and
warning codes. When a request fails with a fault of the server, the line also holds a fixed word
for where it failed (`failure`) and one detail: the class name of the error, the paths of the
schema issues, or, when the corpus did not load, the loader's own message, which names corpus
files. The log entry type has no field for the draft, for a quote or for what the LLM returns
(`LogEntry` in `src/server/api-handlers.ts`), and tests check that no part of a draft, no
generated text and no address appears in the log.

## Your network address

The rate limit keeps the client address in the server's memory, as a key, until its allowance has
refilled (about a minute; at most 10,000 addresses). It is never logged, never written to disk and
never returned. The hosting provider may keep its own access logs; those are outside this code.

## Retention

None on the Azw server: nothing about a draft outlives the request. How long the LLM provider
keeps what is sent to it is set by its terms.

## Where this is enforced

| Claim | Code | Test |
|---|---|---|
| No draft or quote in the log | `src/server/api-handlers.ts` (`LogEntry`) | `src/server/api-handlers.test.ts`, "privacy: what is logged", "the LLM port" (also an explanation that fails, times out or is rejected) and "failures never look like a result" |
| The search index keeps no query, and its error messages carry none | `src/core/corpus/corpus-index.ts` | `src/core/corpus/corpus-index.test.ts` (the error message; that nothing is kept is by reading the code) |
| No response is cached | `src/server/api-handlers.ts` (`json`) | `src/server/api-handlers.test.ts`, happy path |
| The address is a rate-limit key only | `src/server/rate-limit.ts`, `clientKey` | `src/server/api-handlers.test.ts`, "privacy: what is logged" |
| The draft goes to the provider in the user message only, with `store: false`; the adapter logs nothing | `src/llm/openai.ts` | `src/llm/openai.test.ts` (a fake client) |
| An explanation request holds the six fields above and nothing else, with `store: false`; it is made for `DIFFERS` items only, and only when the extraction succeeded | `src/core/explain/index.ts`, `src/core/review.ts`, `src/llm/openai.ts` | `src/core/review.test.ts`, "explanations"; `src/core/injection.test.ts`; `src/llm/openai.test.ts`, "explainDiff" |
| No key and no server code reaches the browser | `src/llm/index.ts`, `src/server/api-config.ts` (the only readers of the environment) | `src/components/client-boundary.test.ts` |

Limits of this notice: it describes the application code. It was not checked against a deployed
host's own logging (P8). What the LLM provider does with a request was not tested and cannot be
from this code.
