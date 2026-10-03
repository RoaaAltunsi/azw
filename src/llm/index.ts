// The LLM port's implementations (src/core/review.ts declares it), chosen by the environment
// (.env.example). Server only. A new provider is one adapter file and one entry of PROVIDERS.
import type { LlmPort } from "../core/review";
import { createOpenAiPort } from "./openai";

export interface LlmConfig {
  provider: string;
  model: string;
  apiKey: string;
  timeoutMs: number;
}

export const LLM_DEFAULT_TIMEOUT_MS = 15_000;

const PROVIDERS: Readonly<Record<string, (config: LlmConfig) => LlmPort>> = {
  openai: createOpenAiPort,
};

type Env = Readonly<Record<string, string | undefined>>;

// undefined unless LLM_PROVIDER, LLM_MODEL and LLM_API_KEY are all set. A missing or malformed
// LLM_TIMEOUT_MS falls back to the default.
export function readLlmConfig(env: Env = process.env): LlmConfig | undefined {
  const provider = env.LLM_PROVIDER?.trim().toLowerCase() ?? "";
  const model = env.LLM_MODEL?.trim() ?? "";
  const apiKey = env.LLM_API_KEY?.trim() ?? "";
  if (provider === "" || model === "" || apiKey === "") return undefined;
  const timeout = env.LLM_TIMEOUT_MS?.trim() ?? "";
  const timeoutMs = /^\d{1,9}$/.test(timeout) && Number(timeout) > 0 ? Number(timeout) : LLM_DEFAULT_TIMEOUT_MS;
  return { provider, model, apiKey, timeoutMs };
}

// undefined = no LLM takes part (nothing configured, or a provider no adapter exists for): the
// review then runs on the regex extractor and says so.
export function createLlmPort(config: LlmConfig | undefined): LlmPort | undefined {
  if (!config || !Object.hasOwn(PROVIDERS, config.provider)) return undefined;
  return PROVIDERS[config.provider]!(config);
}
