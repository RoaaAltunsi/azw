// GET /api/v1/health: whether the corpus loads, its version, and what is searched.
import { createHealthHandler } from "@/server/api-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createHealthHandler();

export const GET = (request: Request): Response => handler.GET(request);
