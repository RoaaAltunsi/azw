"use client";

import { useEffect, useState } from "react";
import type { Health } from "@/core/types";
import { fetchHealth } from "./lib/api-client";

export type HealthState =
  | { status: "loading" }
  // The corpus loaded and something is searched: the only state in which sources are named.
  | { status: "ready"; health: Health & { corpusVersion: string } }
  | { status: "unavailable" };

export function toHealthState(health: Health | null): HealthState {
  if (!health || !health.ok || health.corpusVersion === null || health.coverage.length === 0) {
    return { status: "unavailable" };
  }
  return { status: "ready", health: { ...health, corpusVersion: health.corpusVersion } };
}

// GET /api/v1/health, once per mount. The covered sources are read from it and never hard-coded
// (AGENTS.md §6, "Coverage must be true").
export function useHealth(): HealthState {
  const [state, setState] = useState<HealthState>({ status: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    void fetchHealth({ signal: controller.signal }).then((health) => {
      if (!controller.signal.aborted) setState(toHealthState(health));
    });
    return () => controller.abort();
  }, []);
  return state;
}
