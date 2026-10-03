# Azw — privacy notice

What Azw does with a draft, as the code stands on 2026-10-03 (after P6). `AGENTS.md` §2 rule 8:
do not store drafts, do not log draft content, publish a short privacy notice. The Arabic notice
shown in the app (`/privacy`) must say what this file says, and no more.

## What is processed

- The draft you submit is sent to the Azw server (`POST /api/v1/review`), compared in memory with
  the source texts, and the result is returned. That is the only use made of it.
- **No LLM receives the draft today.** Quotes are found by a rule-based extractor on the Azw
  server. When the LLM extractor is added (P10), the draft will be sent to the configured LLM
  provider for extraction; this notice must be updated in the same change.

## What is not kept

- **The draft is not stored**: no database, no file, no cache. It exists in the server's memory
  for the time of the request.
- **The draft is not logged**, in whole or in part, and neither is any quote taken from it.
- **Responses are not cached**: every response carries `Cache-Control: no-store`, and the app's
  service worker (when added) caches the app shell only.
- No account, no cookie and no analytics exist in the app.

## What the server does record

One log line per request, holding only: a random request id, the HTTP status, an outcome code, the
length of the draft in characters, timings, the number of items, the count of each status, and
warning codes. The log entry type has no field for text (`LogEntry` in
`src/server/api-handlers.ts`), and a test checks that no part of a draft and no address appears in
the log.

## Your network address

The rate limit keeps the client address in the server's memory, as a key, until its allowance has
refilled (about a minute; at most 10,000 addresses). It is never logged, never written to disk and
never returned. The hosting provider may keep its own access logs; those are outside this code.

## Retention

None. Nothing about a draft outlives the request.

## Where this is enforced

| Claim | Code | Test |
|---|---|---|
| No draft or quote in the log | `src/server/api-handlers.ts` (`LogEntry`) | `src/server/api-handlers.test.ts`, "privacy: what is logged" |
| The search index keeps no query, and its error messages carry none | `src/core/corpus/corpus-index.ts` | `src/core/corpus/corpus-index.test.ts` (the error message; that nothing is kept is by reading the code) |
| No response is cached | `src/server/api-handlers.ts` (`json`) | `src/server/api-handlers.test.ts`, happy path |
| The address is a rate-limit key only | `src/server/rate-limit.ts`, `clientKey` | `src/server/api-handlers.test.ts`, "privacy: what is logged" |

Limits of this notice: it describes the application code. It was not checked against a deployed
host's own logging (P8), and it does not yet cover an LLM provider (P10).
