# Azw — privacy notice

This notice describes the code in this repository. A hosting provider and OpenAI process network
requests under their own terms; their infrastructure is outside Azw's code.

## What is processed

1. The browser sends the submitted draft to Azw's server at `POST /api/v1/review`.
2. The server compares it in memory with the local corpus.
3. In the supported configuration, the complete draft is sent to OpenAI so the model can identify
   quotation and claim spans. No account id, address or application identifier is placed in that
   model message.
4. For a `DIFFERS` item, Azw may send a second request containing only the draft span, compared
   source text, source and draft references, deterministic reason code and differing words. This is
   used to generate the note labelled «شرح مولّد آلياً».

Explanation requests for regex-found differences may start while extraction is still running. If
extraction later fails, the explanation is not shown, but that request may already have been sent.

The OpenAI adapter sends `store: false`. This asks the API not to store the response as application
state; it does not override the provider's abuse-monitoring or legal retention terms. See
<https://developers.openai.com/api/docs/guides/your-data>.

If the model call fails or times out, the rule-based extractor continues and the result contains
`LLM_UNAVAILABLE_REGEX_ONLY`. A failed call may still have transmitted some or all of the draft.

## What Azw does not keep

- No database, file or cache stores the draft.
- The draft exists in server memory only for the request.
- Logs contain no draft text, extracted quotation or model output.
- The LLM adapter logs no request or response body.
- API responses use `Cache-Control: no-store`.
- The browser uses component memory only: no account, cookie, analytics or `localStorage`.
- The current build has no service worker, so it does not cache an app shell or API response.

## Server logs

One structured line per request may contain:

- a random request id;
- HTTP status and fixed outcome code;
- draft length, duration and item count;
- count of each status and warning codes;
- on a server fault, an error class, schema paths or a corpus-loader message naming local files.

The log type has no free-text field for user content. Tests cover successful requests, failed model
calls, failed explanations and handler failures.

## Network address and rate limit

The in-memory rate limiter uses a client address as its key until the allowance refills, normally
about one minute and subject to a 10,000-key cap. The address is not logged, returned or written to
disk. A deployed hosting provider may retain its own access logs.

## Retention

Azw retains no draft data after the request finishes. OpenAI and the hosting provider apply their
own retention policies to data they receive.

## Enforcement

| Claim | Implementation and tests |
|---|---|
| No content in logs | `src/server/api-handlers.ts` and its privacy tests |
| No response caching | server response helper and API handler tests |
| Address used only for rate limiting | `src/server/rate-limit.ts`, `clientKey`, API tests |
| Draft sent in a server-only request with `store: false` | `src/llm/openai.ts` and fake-client tests |
| Explanation has bounded fields and statuses | `src/core/explain`, `src/core/review` and injection tests |
| Secrets and server modules do not enter the client | `src/components/client-boundary.test.ts` |

This notice must stay synchronized with the Arabic `/privacy` page whenever a provider, logger,
analytics tool, cache or storage system is added.
