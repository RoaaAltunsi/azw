// API settings from the environment (.env.example). Read per request, so a bad value can never
// break the build or the module load: it falls back to the default.
export interface ApiConfig {
  maxDraftChars: number; // UTF-16 code units, as String.length counts them
  rateLimitPerMin: number; // requests per client per minute
  corsAllowlist: string[]; // origins ("https://example.org"); empty = same-origin only
  llmConfigured: boolean; // the three LLM_* variables are set; says nothing about whether it is used
}

export const API_DEFAULTS = { MAX_DRAFT_CHARS: 12_000, RATE_LIMIT_PER_MIN: 10 } as const;

type Env = Readonly<Record<string, string | undefined>>;

function positiveInt(value: string | undefined, fallback: number): number {
  const text = value?.trim() ?? "";
  if (!/^\d{1,9}$/.test(text)) return fallback;
  const n = Number(text);
  return n > 0 ? n : fallback;
}

// Each entry must be an origin. "*" and anything that does not parse as a URL are ignored: the
// allowlist can only name origins, never open the API to all of them.
function origins(value: string | undefined): string[] {
  const out: string[] = [];
  for (const entry of (value ?? "").split(",")) {
    try {
      const { origin } = new URL(entry.trim());
      if (origin !== "null" && !out.includes(origin)) out.push(origin);
    } catch {
      // not an origin
    }
  }
  return out;
}

const isSet = (value: string | undefined): boolean => (value ?? "").trim() !== "";

export function readApiConfig(env: Env = process.env): ApiConfig {
  return {
    maxDraftChars: positiveInt(env.MAX_DRAFT_CHARS, API_DEFAULTS.MAX_DRAFT_CHARS),
    rateLimitPerMin: positiveInt(env.RATE_LIMIT_PER_MIN, API_DEFAULTS.RATE_LIMIT_PER_MIN),
    corsAllowlist: origins(env.CORS_ALLOWLIST),
    llmConfigured: isSet(env.LLM_PROVIDER) && isSet(env.LLM_MODEL) && isSet(env.LLM_API_KEY),
  };
}
