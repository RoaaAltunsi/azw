import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    // Several test files load the whole corpus (three JSON files and the index) inside a test,
    // each in its own worker at the same time. Alone that takes about 1.6 s; in the full parallel
    // run it has taken 5–18 s, so the default 5 s made the suite fail at random.
    testTimeout: 30_000,
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts", "eval/**/*.test.ts"],
  },
});
