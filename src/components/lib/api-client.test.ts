import { expect, test } from "vitest";
import type { ReviewResult } from "@/core/types";
import { t } from "@/i18n/ar";
import { fetchHealth, requestReview } from "./api-client";

const RESULT: ReviewResult = {
  apiVersion: "1",
  corpusVersion: "test",
  coverage: ["quran"],
  items: [],
  summary: { MATCH: 0, DIFFERS: 0, NOT_FOUND: 0, NEEDS_SPECIALIST: 0, ERROR: 0 },
  warnings: [],
};

// A MATCH that rests on nothing: ReviewResultSchema refuses it (AGENTS.md §2 rule 3).
const UNSUPPORTED_MATCH = {
  ...RESULT,
  items: [
    {
      id: "i",
      span: { start: 0, end: 1, text: "x" },
      claimedKind: "quran",
      status: "MATCH",
      contentLevel: "A",
      reasonCode: "MATCH_NO_REFERENCE",
      reasonAr: "r",
      evidence: [],
      extractedBy: ["regex"],
    },
  ],
};

const answering = (status: number, body: unknown): typeof fetch =>
  (async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status })) as typeof fetch;

test("a 200 that is a ReviewResult is a result; the draft goes in the body and is not cached", async () => {
  const calls: Array<[unknown, RequestInit | undefined]> = [];
  const fetchImpl = (async (url: unknown, init?: RequestInit) => {
    calls.push([url, init]);
    return new Response(JSON.stringify(RESULT), { status: 200 });
  }) as typeof fetch;
  expect(await requestReview("مسودة", { fetchImpl })).toEqual({ kind: "result", result: RESULT });
  expect(calls[0]![0]).toBe("/api/v1/review");
  expect(calls[0]![1]).toMatchObject({ method: "POST", body: JSON.stringify({ text: "مسودة" }), cache: "no-store" });
});

test("an API error shows the API's own message", async () => {
  const body = { apiVersion: "1", error: { code: "RATE_LIMITED", message: "رسالة الخدمة" } };
  expect(await requestReview("x", { fetchImpl: answering(429, body) })).toEqual({ kind: "error", message: "رسالة الخدمة" });
});

test("a failed response is never a result, even when its body is one", async () => {
  expect(await requestReview("x", { fetchImpl: answering(500, RESULT) })).toEqual({
    kind: "error",
    message: t("state.error.unexpected"),
  });
});

test.each([
  ["not JSON", "<html>"],
  ["another shape", { items: [] }],
  ["a MATCH without evidence", UNSUPPORTED_MATCH],
])("a 200 whose body is %s is an error, not a result", async (_name, body) => {
  expect(await requestReview("x", { fetchImpl: answering(200, body) })).toEqual({
    kind: "error",
    message: t("state.error.unexpected"),
  });
});

test("no answer: a network sentence; a cancelled request is neither a result nor an error", async () => {
  const failing = (async () => {
    throw new TypeError("failed to fetch");
  }) as typeof fetch;
  expect(await requestReview("x", { fetchImpl: failing })).toEqual({ kind: "error", message: t("state.error.network") });
  const controller = new AbortController();
  controller.abort();
  expect(await requestReview("x", { fetchImpl: failing, signal: controller.signal })).toEqual({ kind: "aborted" });
});

test("health: the body of a 200 and of a 503 alike; anything else is null", async () => {
  const ok = { ok: true, corpusVersion: "v", coverage: ["quran"], llmConfigured: false };
  const down = { ok: false, corpusVersion: null, coverage: [], llmConfigured: false };
  expect(await fetchHealth({ fetchImpl: answering(200, ok) })).toEqual(ok);
  expect(await fetchHealth({ fetchImpl: answering(503, down) })).toEqual(down);
  expect(await fetchHealth({ fetchImpl: answering(200, { ok: true }) })).toBeNull();
  expect(await fetchHealth({ fetchImpl: answering(502, "bad gateway") })).toBeNull();
});
