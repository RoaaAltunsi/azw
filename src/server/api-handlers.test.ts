// The API v1 handlers, called with Web Requests, on the real corpus.
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { ApiErrorSchema, HealthSchema, ReviewResultSchema, type ReviewResult } from "../core/types";
import { t } from "../i18n/ar";
import { readApiConfig, type ApiConfig } from "./api-config";
import { createHealthHandler, createReviewHandler, type ApiDeps, type LogEntry } from "./api-handlers";
import { loadCorpus } from "./corpus-loader";
import { createRateLimiter } from "./rate-limit";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const URL_REVIEW = "https://azw.example/api/v1/review";
const DRAFT = "قال تعالى: ﴿استعينوا بالصبر والصلاة﴾ [البقرة: 153]. وقال رسول الله ﷺ: «إنما الأعمال بالنيات». رواه البخاري.";

interface Harness {
  handler: ReturnType<typeof createReviewHandler>;
  health: ReturnType<typeof createHealthHandler>;
  logs: LogEntry[];
  clock: { ms: number };
}

function harness(config: Partial<ApiConfig> = {}, overrides: Partial<ApiDeps> = {}): Harness {
  const logs: LogEntry[] = [];
  const clock = { ms: 0 };
  let id = 0;
  const deps: ApiDeps = {
    loadCorpus: () => loadCorpus(ROOT),
    config: () => ({ maxDraftChars: 12_000, rateLimitPerMin: 1000, corsAllowlist: [], llmConfigured: false, ...config }),
    log: (entry) => logs.push(structuredClone(entry)),
    now: () => clock.ms,
    rateLimiter: createRateLimiter(() => clock.ms),
    newRequestId: () => `req-${++id}`,
    ...overrides,
  };
  return { handler: createReviewHandler(deps), health: createHealthHandler(deps), logs, clock };
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(URL_REVIEW, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function errorOf(response: Response): Promise<{ code: string; message: string; keys: string[] }> {
  const body: unknown = await response.json();
  const parsed = ApiErrorSchema.parse(body);
  return { ...parsed.error, keys: Object.keys(body as object) };
}

describe("POST /api/v1/review — happy path", () => {
  test("returns a valid ReviewResult", async () => {
    const { handler } = harness();
    const response = await handler.POST(post({ text: DRAFT }));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toBe("req-1");
    const result = ReviewResultSchema.parse(await response.json());
    expect(result.apiVersion).toBe("1");
    expect(result.coverage).toEqual(["quran"]);
    expect(result.items.map((i) => [i.status, i.reasonCode])).toEqual([
      ["MATCH", "MATCH_REF_OK"],
      ["NOT_FOUND", "NO_RECORD_IN_COVERED_SOURCES"],
    ]);
    expect(result.summary).toEqual({ MATCH: 1, DIFFERS: 0, NOT_FOUND: 1, NEEDS_SPECIALIST: 0, ERROR: 0 });
    expect(result.warnings).toEqual(["LLM_UNAVAILABLE_REGEX_ONLY"]);
  });

  test("no response carries a retrieval key, and a grade appears only with a record that has one", async () => {
    const { handler } = harness();
    const response = await handler.POST(post({ text: "﴿الله﴾ ثم ﴿إن رحمة الله قريب من المحسنين﴾ ثم ﴿بسم الله الرحمان الرحيم﴾" }));
    const text = await response.text();
    expect(text).not.toMatch(/searchText|searchVariants|matnText/);
    const result = JSON.parse(text) as ReviewResult;
    const records = result.items.flatMap((i) => i.evidence.map((e) => e.record));
    expect(records.length).toBeGreaterThan(5);
    for (const record of records) {
      expect(Object.keys(record).sort()).toEqual(["citation", "collection", "edition", "exactText", "id", "kind", "license", "reviewStatus", "sourceName", "sourceUrl"]);
      // Quran records carry no grade in the data, so none is shown.
      expect("grade" in record).toBe(false);
    }
  });
});

describe("POST /api/v1/review — validation", () => {
  test.each([
    ["a body that is not JSON", "ليس JSON"],
    ["an empty body", ""],
    ["no text field", { draft: "نص" }],
    ["text that is not a string", { text: 5 }],
    ["an unknown extra field", { text: "نص", store: true }],
    ["a JSON array", ["نص"]],
  ])("%s → 400 INVALID_REQUEST", async (_name, body) => {
    const { handler } = harness();
    const response = await handler.POST(post(body));
    expect(response.status).toBe(400);
    expect(await errorOf(response)).toEqual({ code: "INVALID_REQUEST", message: t("api.error.INVALID_REQUEST"), keys: ["apiVersion", "error"] });
  });

  test.each([["an empty text", ""], ["whitespace only", " \n\t "]])("%s → 400 EMPTY_DRAFT", async (_name, text) => {
    const { handler } = harness();
    const response = await handler.POST(post({ text }));
    expect(response.status).toBe(400);
    expect(await errorOf(response)).toMatchObject({ code: "EMPTY_DRAFT", message: "المسودة فارغة. يُرجى لصق النص المراد مراجعته." });
  });

  test("a text of MAX_DRAFT_CHARS is accepted, one character more → 413 DRAFT_TOO_LONG", async () => {
    const { handler } = harness({ maxDraftChars: 50 });
    expect((await handler.POST(post({ text: "ن".repeat(50) }))).status).toBe(200);
    const response = await handler.POST(post({ text: "ن".repeat(51) }));
    expect(response.status).toBe(413);
    expect(await errorOf(response)).toMatchObject({
      code: "DRAFT_TOO_LONG",
      message: "المسودة أطول من الحد المسموح به (50 حرفاً). يُرجى تقسيمها ومراجعة كل جزء على حدة.",
    });
  });

  test("an oversized body is refused before it is parsed", async () => {
    const { handler } = harness({ maxDraftChars: 50 });
    const response = await handler.POST(post({ text: "ن".repeat(5000) }));
    expect(response.status).toBe(413);
    const declared = await handler.POST(post({ text: "نص" }, { "content-length": "999999" }));
    expect(declared.status).toBe(413);
  });
});

describe("POST /api/v1/review — rate limit", () => {
  const from = (ip: string): Request => post({ text: "نص بلا اقتباس" }, { "x-forwarded-for": `${ip}, 10.0.0.1` });

  test("RATE_LIMIT_PER_MIN requests pass, the next is 429 with Retry-After; another client is not affected", async () => {
    const { handler, clock } = harness({ rateLimitPerMin: 2 });
    expect((await handler.POST(from("203.0.113.7"))).status).toBe(200);
    expect((await handler.POST(from("203.0.113.7"))).status).toBe(200);
    const refused = await handler.POST(from("203.0.113.7"));
    expect(refused.status).toBe(429);
    expect(refused.headers.get("retry-after")).toBe("30");
    expect(await errorOf(refused)).toMatchObject({ code: "RATE_LIMITED", message: t("api.error.RATE_LIMITED") });
    expect((await handler.POST(from("203.0.113.8"))).status).toBe(200);
    // Half a minute later one token is back.
    clock.ms += 30_000;
    expect((await handler.POST(from("203.0.113.7"))).status).toBe(200);
    expect((await handler.POST(from("203.0.113.7"))).status).toBe(429);
  });
});

describe("CORS", () => {
  const ALLOWED = "https://extension.example";

  test("no Origin header, and the same origin, are served without CORS headers", async () => {
    const { handler } = harness({ corsAllowlist: [ALLOWED] });
    const sameOrigin: Array<Record<string, string>> = [{}, { origin: "https://azw.example" }, { origin: "https://azw.test", host: "azw.test" }];
    for (const headers of sameOrigin) {
      const response = await handler.POST(post({ text: "نص" }, headers));
      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBeNull();
      expect(response.headers.get("vary")).toBe("Origin");
    }
  });

  test("an origin in CORS_ALLOWLIST is allowed, on the request and on its preflight", async () => {
    const { handler } = harness({ corsAllowlist: [ALLOWED] });
    const response = await handler.POST(post({ text: "نص" }, { origin: ALLOWED }));
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(ALLOWED);
    const preflight = handler.OPTIONS(new Request(URL_REVIEW, { method: "OPTIONS", headers: { origin: ALLOWED, "access-control-request-method": "POST" } }));
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe(ALLOWED);
    expect(preflight.headers.get("access-control-allow-methods")).toBe("POST, OPTIONS");
    expect(preflight.headers.get("access-control-allow-headers")).toBe("content-type");
    // An error for an allowed origin is readable by it too.
    const invalid = await handler.POST(post("x", { origin: ALLOWED }));
    expect([invalid.status, invalid.headers.get("access-control-allow-origin")]).toEqual([400, ALLOWED]);
  });

  test.each([
    ["with an empty allowlist", []],
    ["with an allowlist that names another origin", [ALLOWED]],
  ])("another origin is refused %s: 403, no allow-origin header, nothing reviewed", async (_name, corsAllowlist) => {
    let loaded = 0;
    const { handler } = harness({ corsAllowlist }, { loadCorpus: () => (loaded++, loadCorpus(ROOT)) });
    const response = await handler.POST(post({ text: DRAFT }, { origin: "https://other.example" }));
    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(await errorOf(response)).toMatchObject({ code: "ORIGIN_NOT_ALLOWED", keys: ["apiVersion", "error"] });
    expect(loaded).toBe(0);
    const preflight = handler.OPTIONS(new Request(URL_REVIEW, { method: "OPTIONS", headers: { origin: "https://other.example" } }));
    expect([preflight.status, preflight.headers.get("access-control-allow-origin")]).toEqual([403, null]);
  });

  test("CORS_ALLOWLIST is read as a list of origins; «*» and junk are ignored", () => {
    expect(readApiConfig({ CORS_ALLOWLIST: " https://a.example , *, junk, https://b.example/path ,https://a.example" }).corsAllowlist).toEqual(["https://a.example", "https://b.example"]);
    expect(readApiConfig({}).corsAllowlist).toEqual([]);
  });
});

describe("failures never look like a result", () => {
  const expectFixedError = async (response: Response): Promise<void> => {
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ apiVersion: "1", error: { code: "INTERNAL_ERROR", message: "تعذّر إكمال التحقق، ولم تُراجَع المسودة. يُرجى إعادة المحاولة لاحقاً." } });
    expect(text).not.toMatch(/items|summary|coverage/);
  };

  test("a corpus that fails to load → 500 with the fixed message and no items", async () => {
    const { handler, logs } = harness({}, { loadCorpus: () => loadCorpus(fileURLToPath(new URL("./no-such-root", import.meta.url))) });
    await expectFixedError(await handler.POST(post({ text: DRAFT })));
    expect(logs[0]).toMatchObject({ httpStatus: 500, outcome: "INTERNAL_ERROR", failure: "CORPUS_LOAD_FAILED", detail: "Corpus loader: cannot read data/corpus/manifest.json" });
  });

  test("a result that fails ReviewResultSchema → 500, not a partial result", async () => {
    const { handler, logs } = harness({}, { loadCorpus: () => ({ ...loadCorpus(ROOT), corpusVersion: "" }) });
    await expectFixedError(await handler.POST(post({ text: DRAFT })));
    expect(logs[0]).toMatchObject({ failure: "RESPONSE_INVALID", detail: "corpusVersion:too_small" });
  });

  test("a review that throws → 500", async () => {
    const broken = { ...loadCorpus(ROOT), aliases: null as never };
    const { handler, logs } = harness({}, { loadCorpus: () => broken });
    await expectFixedError(await handler.POST(post({ text: DRAFT })));
    expect(logs[0]).toMatchObject({ failure: "REVIEW_THREW", detail: "TypeError" });
  });

  test("a config that throws → 500", async () => {
    const { handler, logs } = harness({}, { config: () => { throw new Error("no config"); } });
    await expectFixedError(await handler.POST(post({ text: DRAFT })));
    expect(logs[0]).toMatchObject({ failure: "HANDLER_THREW", detail: "Error" });
  });

  test("a log sink that throws does not change the answer", async () => {
    const { handler } = harness({}, { log: () => { throw new Error("log sink down"); } });
    expect((await handler.POST(post({ text: DRAFT }))).status).toBe(200);
  });
});

describe("privacy: what is logged", () => {
  test("one entry per request: id, length, timings, counts and statuses — no draft, no quote, no address", async () => {
    const { handler, logs, clock } = harness({ maxDraftChars: 500, rateLimitPerMin: 3 });
    const ip = "203.0.113.77";
    const headers = { "x-forwarded-for": ip, "x-real-ip": ip };
    const drafts = [DRAFT, "ن".repeat(501), "", "{ليس JSON", DRAFT, DRAFT];
    for (const text of drafts) {
      clock.ms += 5;
      await handler.POST(post(text.startsWith("{") ? text : { text }, headers));
    }
    await handler.POST(post({ text: DRAFT }, { ...headers, origin: "https://other.example" }));

    expect(logs.map((l) => [l.httpStatus, l.outcome])).toEqual([
      [200, "OK"],
      [413, "DRAFT_TOO_LONG"],
      [400, "EMPTY_DRAFT"],
      [429, "RATE_LIMITED"],
      [429, "RATE_LIMITED"],
      [429, "RATE_LIMITED"],
      [403, "ORIGIN_NOT_ALLOWED"],
    ]);
    expect(logs[0]).toEqual({
      event: "review",
      requestId: "req-1",
      httpStatus: 200,
      outcome: "OK",
      chars: DRAFT.length,
      loadMs: 0,
      reviewMs: 0,
      totalMs: 0,
      items: 2,
      summary: { MATCH: 1, DIFFERS: 0, NOT_FOUND: 1, NEEDS_SPECIALIST: 0, ERROR: 0 },
      warnings: ["LLM_UNAVAILABLE_REGEX_ONLY"],
    });

    const logged = JSON.stringify(logs);
    // No word of the draft, in any form, and no Arabic at all: the log is ids, numbers and codes.
    for (const word of DRAFT.split(/[\s﴿﴾«».:،\[\]]+/).filter((w) => w.length > 1)) expect(logged).not.toContain(word);
    expect(logged).not.toMatch(/[؀-ۿ]/);
    expect(logged).not.toContain(ip);
    expect(logged).not.toContain("other.example");
  });
});

describe("GET /api/v1/health", () => {
  const get = (headers: Record<string, string> = {}): Request => new Request("https://azw.example/api/v1/health", { headers });

  test("ok, with the corpus version and the searched coverage", async () => {
    const { health } = harness({ llmConfigured: false });
    const response = health.GET(get());
    expect(response.status).toBe(200);
    expect(HealthSchema.parse(await response.json())).toEqual({
      ok: true,
      corpusVersion: loadCorpus(ROOT).corpusVersion,
      coverage: ["quran"],
      llmConfigured: false,
    });
  });

  test("a corpus that does not load → 503, ok: false", async () => {
    const { health } = harness({ llmConfigured: true }, { loadCorpus: () => { throw new Error("no corpus"); } });
    const response = health.GET(get());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, corpusVersion: null, coverage: [], llmConfigured: true });
  });

  test("llmConfigured needs the three LLM variables", () => {
    expect(readApiConfig({ LLM_PROVIDER: "x", LLM_MODEL: "y", LLM_API_KEY: "z" }).llmConfigured).toBe(true);
    expect(readApiConfig({ LLM_PROVIDER: "x", LLM_MODEL: "y", LLM_API_KEY: " " }).llmConfigured).toBe(false);
    expect(readApiConfig({}).llmConfigured).toBe(false);
  });

  test("another origin is refused", () => {
    const { health } = harness();
    expect(health.GET(get({ origin: "https://other.example" })).status).toBe(403);
  });
});

describe("configuration", () => {
  test("defaults, and a bad value falls back to the default", () => {
    expect(readApiConfig({})).toMatchObject({ maxDraftChars: 12_000, rateLimitPerMin: 10 });
    expect(readApiConfig({ MAX_DRAFT_CHARS: "500", RATE_LIMIT_PER_MIN: "3" })).toMatchObject({ maxDraftChars: 500, rateLimitPerMin: 3 });
    expect(readApiConfig({ MAX_DRAFT_CHARS: "0", RATE_LIMIT_PER_MIN: "-1" })).toMatchObject({ maxDraftChars: 12_000, rateLimitPerMin: 10 });
    expect(readApiConfig({ MAX_DRAFT_CHARS: "many", RATE_LIMIT_PER_MIN: "" })).toMatchObject({ maxDraftChars: 12_000, rateLimitPerMin: 10 });
  });
});
