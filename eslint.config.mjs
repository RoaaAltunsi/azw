import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// src/core must stay pure TypeScript, reusable by any client (AGENTS.md §6):
// no Next.js, no React, no fetch, and nothing from the app, component or LLM layers.
const coreBoundary = {
  files: ["src/core/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          { name: "next", message: "src/core must not depend on Next.js." },
          { name: "react", message: "src/core must not depend on React." },
          { name: "react-dom", message: "src/core must not depend on React." },
        ],
        patterns: [
          {
            group: ["next/*", "react/*", "react-dom/*"],
            message: "src/core must not depend on Next.js or React.",
          },
          {
            // "@/app/…", "src/app/…", "../llm/…", "../../components/…" and the bare folders.
            regex: "^(@/|src/|(\\.\\./)+)(app|components|llm)(/|$)",
            message: "src/core must not import from src/app, src/components or src/llm.",
          },
        ],
      },
    ],
    "no-restricted-globals": [
      "error",
      { name: "fetch", message: "src/core does no I/O; inject a port instead." },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  coreBoundary,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "data/**",
  ]),
]);

export default eslintConfig;
