// The UI's only door to the server: the two routes of API v1 (docs/API.md). Every response is
// validated against the schemas of src/core/types.ts before the UI sees it, so a malformed body is
// never rendered as a result.
import { ApiErrorSchema, HealthSchema, ReviewResultSchema, type Health, type ReviewResult } from "@/core/types";
import { t } from "@/i18n/ar";

export const REVIEW_URL = "/api/v1/review";
export const HEALTH_URL = "/api/v1/health";

export type ReviewOutcome =
  | { kind: "result"; result: ReviewResult }
  // `message` is the API's own error.message, or a fixed sentence of the UI when no API answer exists.
  | { kind: "error"; message: string }
  | { kind: "aborted" };

interface RequestOptions {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export async function requestReview(text: string, options: RequestOptions = {}): Promise<ReviewOutcome> {
  const { signal, fetchImpl = fetch } = options;
  let response: Response;
  try {
    response = await fetchImpl(REVIEW_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      cache: "no-store",
      signal,
    });
  } catch {
    return signal?.aborted ? { kind: "aborted" } : { kind: "error", message: t("state.error.network") };
  }

  const body = await readJson(response);
  if (signal?.aborted) return { kind: "aborted" };

  // A result is taken only from a 200. Anything else is an error, whatever its body holds.
  if (response.ok) {
    const result = ReviewResultSchema.safeParse(body);
    if (result.success) return { kind: "result", result: result.data };
  } else {
    const error = ApiErrorSchema.safeParse(body);
    if (error.success) return { kind: "error", message: error.data.error.message };
  }
  return { kind: "error", message: t("state.error.unexpected") };
}

// The health body is the same shape for 200 and 503. null = no usable answer.
export async function fetchHealth(options: RequestOptions = {}): Promise<Health | null> {
  const { signal, fetchImpl = fetch } = options;
  try {
    const response = await fetchImpl(HEALTH_URL, { cache: "no-store", signal });
    const health = HealthSchema.safeParse(await readJson(response));
    return health.success ? health.data : null;
  } catch {
    return null;
  }
}
