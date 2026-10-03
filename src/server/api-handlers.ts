// The handlers of API v1, as functions of a Web Request, so that they are tested without a server.
// src/app/api/v1/*/route.ts only wires them. Documented in docs/ARCHITECTURE.md ("API v1").
//
// Privacy (AGENTS.md §2 rule 8): nothing here stores or logs the draft, a quote or the client
// address. A log entry holds the request id, the length, timings, item counts and statuses only;
// an error is logged by its class, never by a message that could quote the draft.
import { randomUUID } from "node:crypto";
import { regexExtractor } from "../core/extract";
import { review, searchedCoverage } from "../core/review";
import {
  API_VERSION,
  ApiErrorSchema,
  HealthSchema,
  ReviewRequestSchema,
  ReviewResultSchema,
  type ApiError,
  type ApiErrorCode,
  type Health,
  type Status,
} from "../core/types";
import { format } from "../i18n/ar";
import { readApiConfig, type ApiConfig } from "./api-config";
import { loadCorpus, type LoadedCorpus } from "./corpus-loader";
import { createRateLimiter, type RateLimiter } from "./rate-limit";

// Everything a log line may hold. There is no free-text field for request content.
export interface LogEntry {
  event: "review";
  requestId: string;
  httpStatus: number;
  outcome: "OK" | ApiErrorCode;
  // Why a 500 happened, as a fixed word.
  failure?: "CORPUS_LOAD_FAILED" | "REVIEW_THREW" | "RESPONSE_INVALID" | "HANDLER_THREW";
  // The class of the thrown error ("TypeError"), or the paths of the schema issues. Never a message
  // from the review step. The loader's own message names files only, so it is kept.
  detail?: string;
  chars?: number;
  loadMs?: number;
  reviewMs?: number;
  totalMs: number;
  items?: number;
  summary?: Record<Status, number>;
  warnings?: string[];
}

export interface ApiDeps {
  loadCorpus: () => LoadedCorpus;
  config: () => ApiConfig;
  log: (entry: LogEntry) => void;
  now: () => number; // ms
  rateLimiter: RateLimiter;
  newRequestId: () => string;
}

export function defaultApiDeps(): ApiDeps {
  const now = (): number => performance.now();
  return {
    loadCorpus: () => loadCorpus(),
    config: () => readApiConfig(),
    log: (entry) => console.log(JSON.stringify(entry)),
    now,
    rateLimiter: createRateLimiter(now),
    newRequestId: () => randomUUID(),
  };
}

export const API_ERROR_HTTP_STATUS: Readonly<Record<ApiErrorCode, number>> = {
  INVALID_REQUEST: 400,
  EMPTY_DRAFT: 400,
  DRAFT_TOO_LONG: 413,
  ORIGIN_NOT_ALLOWED: 403,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

const ms = (value: number): number => Math.round(value * 10) / 10;

// ---------------------------------------------------------------------------------------------
// CORS: same-origin always; another origin only when CORS_ALLOWLIST names it.
// ---------------------------------------------------------------------------------------------

type OriginCheck = { allowed: true; headers: Record<string, string> } | { allowed: false };

function hostOf(request: Request): string | null {
  return request.headers.get("x-forwarded-host") ?? request.headers.get("host");
}

function checkOrigin(request: Request, config: ApiConfig): OriginCheck {
  const origin = request.headers.get("origin");
  // No Origin header: not a cross-origin browser request (a same-origin GET, or a non-browser client).
  if (origin === null) return { allowed: true, headers: {} };
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return { allowed: false };
  }
  if (origin === new URL(request.url).origin || host === hostOf(request)) return { allowed: true, headers: {} };
  if (config.corsAllowlist.includes(origin)) {
    return {
      allowed: true,
      headers: { "access-control-allow-origin": origin, "access-control-expose-headers": "x-request-id, retry-after" },
    };
  }
  return { allowed: false };
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // Neither a draft's result nor an error may be cached anywhere.
      "cache-control": "no-store",
      vary: "Origin",
      ...headers,
    },
  });
}

function errorBody(code: ApiErrorCode, values: Record<string, string | number> = {}): ApiError {
  return ApiErrorSchema.parse({ apiVersion: API_VERSION, error: { code, message: format(`api.error.${code}`, values) } });
}

// ---------------------------------------------------------------------------------------------
// Request body
// ---------------------------------------------------------------------------------------------

// The body as text, or "too-large" as soon as it passes `maxBytes`: an oversized body is never
// read to its end.
async function readBody(request: Request, maxBytes: number): Promise<string | "too-large"> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return "too-large";
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return "too-large";
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

// A JSON string may spend six bytes on one UTF-16 code unit ("\uXXXX"); the rest is the envelope.
const maxBodyBytes = (config: ApiConfig): number => config.maxDraftChars * 6 + 1024;

// The first address of X-Forwarded-For, as the hosting proxy sets it. Used as the rate-limit key
// only: never logged, never returned.
function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

// ---------------------------------------------------------------------------------------------
// POST /api/v1/review
// ---------------------------------------------------------------------------------------------

export function createReviewHandler(deps: ApiDeps = defaultApiDeps()): {
  POST(request: Request): Promise<Response>;
  OPTIONS(request: Request): Response;
} {
  async function POST(request: Request): Promise<Response> {
    const started = deps.now();
    const requestId = deps.newRequestId();
    const entry: LogEntry = { event: "review", requestId, httpStatus: 500, outcome: "INTERNAL_ERROR", totalMs: 0 };
    let cors: Record<string, string> = {};

    const finish = (response: Response): Response => {
      entry.httpStatus = response.status;
      entry.totalMs = ms(deps.now() - started);
      try {
        deps.log(entry);
      } catch {
        // A log sink that fails must not change the answer.
      }
      return response;
    };
    const fail = (code: ApiErrorCode, values?: Record<string, string | number>, headers: Record<string, string> = {}): Response => {
      entry.outcome = code;
      return finish(json(errorBody(code, values), API_ERROR_HTTP_STATUS[code], { "x-request-id": requestId, ...cors, ...headers }));
    };

    try {
      const config = deps.config();

      const origin = checkOrigin(request, config);
      if (!origin.allowed) return fail("ORIGIN_NOT_ALLOWED");
      cors = origin.headers;

      const limit = deps.rateLimiter.take(clientKey(request), config.rateLimitPerMin);
      if (!limit.allowed) return fail("RATE_LIMITED", {}, { "retry-after": String(limit.retryAfterSeconds) });

      const body = await readBody(request, maxBodyBytes(config));
      if (body === "too-large") return fail("DRAFT_TOO_LONG", { max: config.maxDraftChars });
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(body);
      } catch {
        return fail("INVALID_REQUEST");
      }
      const parsedRequest = ReviewRequestSchema.safeParse(parsedJson);
      if (!parsedRequest.success) return fail("INVALID_REQUEST");
      const { text } = parsedRequest.data;
      entry.chars = text.length;
      if (text.trim() === "") return fail("EMPTY_DRAFT");
      if (text.length > config.maxDraftChars) return fail("DRAFT_TOO_LONG", { max: config.maxDraftChars });

      let corpus: LoadedCorpus;
      const loadStarted = deps.now();
      try {
        corpus = deps.loadCorpus();
      } catch (error) {
        entry.failure = "CORPUS_LOAD_FAILED";
        entry.detail = error instanceof Error ? error.message : "unknown";
        return fail("INTERNAL_ERROR");
      }
      entry.loadMs = ms(deps.now() - loadStarted);

      let result: unknown;
      const reviewStarted = deps.now();
      try {
        result = await review(text, {
          index: corpus.index,
          aliases: corpus.aliases,
          corpusVersion: corpus.corpusVersion,
          coverage: corpus.coverage,
          extractors: [regexExtractor],
          now: deps.now,
        });
      } catch (error) {
        entry.failure = "REVIEW_THREW";
        entry.detail = error instanceof Error ? error.name : "unknown";
        return fail("INTERNAL_ERROR");
      }
      entry.reviewMs = ms(deps.now() - reviewStarted);

      // The last gate: a result that does not fit the contract is not sent, not even in part.
      const valid = ReviewResultSchema.safeParse(result);
      if (!valid.success) {
        entry.failure = "RESPONSE_INVALID";
        entry.detail = valid.error.issues.slice(0, 5).map((issue) => `${issue.path.join(".")}:${issue.code}`).join(" ");
        return fail("INTERNAL_ERROR");
      }

      entry.outcome = "OK";
      entry.items = valid.data.items.length;
      entry.summary = valid.data.summary;
      entry.warnings = valid.data.warnings;
      return finish(json(valid.data, 200, { "x-request-id": requestId, ...cors }));
    } catch (error) {
      entry.failure = "HANDLER_THREW";
      entry.detail = error instanceof Error ? error.name : "unknown";
      return fail("INTERNAL_ERROR");
    }
  }

  // The preflight of a cross-origin POST. Without the allow-origin header the browser stops there.
  function OPTIONS(request: Request): Response {
    const origin = checkOrigin(request, deps.config());
    if (!origin.allowed) return json(errorBody("ORIGIN_NOT_ALLOWED"), 403, {});
    return new Response(null, {
      status: 204,
      headers: {
        vary: "Origin",
        ...origin.headers,
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "600",
      },
    });
  }

  return { POST, OPTIONS };
}

// ---------------------------------------------------------------------------------------------
// GET /api/v1/health
// ---------------------------------------------------------------------------------------------

export function createHealthHandler(deps: Pick<ApiDeps, "loadCorpus" | "config"> = defaultApiDeps()): { GET(request: Request): Response } {
  function GET(request: Request): Response {
    const config = deps.config();
    const origin = checkOrigin(request, config);
    if (!origin.allowed) return json(errorBody("ORIGIN_NOT_ALLOWED"), 403, {});
    let health: Health;
    try {
      const corpus = deps.loadCorpus();
      health = {
        ok: true,
        corpusVersion: corpus.corpusVersion,
        coverage: searchedCoverage(corpus.coverage, corpus.index),
        llmConfigured: config.llmConfigured,
      };
    } catch {
      health = { ok: false, corpusVersion: null, coverage: [], llmConfigured: config.llmConfigured };
    }
    return json(HealthSchema.parse(health), health.ok ? 200 : 503, origin.headers);
  }
  return { GET };
}
