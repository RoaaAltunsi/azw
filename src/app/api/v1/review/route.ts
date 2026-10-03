// POST /api/v1/review: the stable, versioned API every client calls (AGENTS.md §6).
// The logic lives in src/server/api-handlers.ts; this file only wires it to the route.
import { createReviewHandler } from "@/server/api-handlers";

// The corpus is read from disk (src/server/corpus-loader.ts): Node runtime, never Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createReviewHandler();

export const POST = (request: Request): Promise<Response> => handler.POST(request);
export const OPTIONS = (request: Request): Response => handler.OPTIONS(request);
