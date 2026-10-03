// The OpenAI adapter of the LLM port: the Responses API with structured output (a JSON schema made
// from the zod schema, strict). Server only.
//
// Privacy (AGENTS.md §2 rule 8): nothing here logs, and the request asks the provider not to store
// the response (`store: false`). An error is rethrown as it came; the caller reads its class only.
import OpenAI, { APIConnectionError, APIConnectionTimeoutError, APIError, InternalServerError, RateLimitError } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { LlmExtractionSchema, type LlmExtraction } from "../core/extract/llm";
import type { LlmPort } from "../core/review";
import { EXTRACT_SYSTEM_PROMPT, extractUserMessage } from "./prompts/extract";

export interface OpenAiPortOptions {
  apiKey: string;
  model: string;
  // For one extraction as a whole, the retry included.
  timeoutMs: number;
  // A test passes its own; no network is used then.
  client?: Pick<OpenAI, "responses">;
}

const EXTRACTION_FORMAT = zodTextFormat(LlmExtractionSchema, "quotation_extraction");

// Worth one more attempt: the connection failed, the provider is overloaded (429) or failed (5xx).
// A timeout is not: the time budget covers the whole extraction and is spent by then.
const isTransient = (error: unknown): boolean =>
  error instanceof RateLimitError ||
  error instanceof InternalServerError ||
  (error instanceof APIConnectionError && !(error instanceof APIConnectionTimeoutError));

// Reasoning models refuse the sampling parameters; such a model is then called without one.
const refusesTemperature = (error: unknown): boolean => error instanceof APIError && error.status === 400 && error.param === "temperature";

export function createOpenAiPort(options: OpenAiPortOptions): LlmPort {
  // The SDK's own retries are off: it would also retry a timeout, and more than once.
  const client = options.client ?? new OpenAI({ apiKey: options.apiKey, maxRetries: 0 });
  let sendTemperature = true;

  const extract = async (draft: string, signal: AbortSignal): Promise<LlmExtraction> => {
    const response = await client.responses.parse(
      {
        model: options.model,
        instructions: EXTRACT_SYSTEM_PROMPT,
        input: extractUserMessage(draft),
        text: { format: EXTRACTION_FORMAT },
        store: false,
        ...(sendTemperature ? { temperature: 0 } : {}),
      },
      { signal, maxRetries: 0 },
    );
    // null: the model refused, or the output was cut before it was complete.
    if (response.output_parsed === null) throw new Error("LLM_NO_STRUCTURED_OUTPUT");
    return response.output_parsed;
  };

  return {
    async extractQuotes(draft) {
      const signal = AbortSignal.timeout(options.timeoutMs);
      let retried = false;
      for (;;) {
        try {
          return await extract(draft, signal);
        } catch (error) {
          if (sendTemperature && refusesTemperature(error)) sendTemperature = false;
          else if (!retried && isTransient(error)) retried = true;
          else throw error;
        }
      }
    },
    // P12.
    explainDiff: async () => null,
  };
}
