// No key can reach the browser (docs/DECISIONS.md D-24): the environment is read in two server
// files only, no variable is public, and nothing a page ships imports the server or the LLM code.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const SRC = fileURLToPath(new URL("..", import.meta.url));

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const files = sources(SRC).map((path) => ({ name: relative(SRC, path).replaceAll("\\", "/"), code: readFileSync(path, "utf8") }));

test("the environment is read only by the two server-side readers, and no variable is public", () => {
  expect(files.filter((f) => f.code.includes("process.env")).map((f) => f.name).sort()).toEqual(["llm/index.ts", "server/api-config.ts"]);
  expect(files.filter((f) => /NEXT_PUBLIC_|import\.meta\.env/.test(f.code)).map((f) => f.name)).toEqual([]);
});

test("only the API routes import src/server, and only src/server imports src/llm", () => {
  const importing = (pattern: RegExp) => files.filter((f) => pattern.test(f.code)).map((f) => f.name).sort();
  expect(importing(/from "(@\/|(\.\.\/)+)server(\/|")/)).toEqual(["app/api/v1/health/route.ts", "app/api/v1/review/route.ts"]);
  expect(importing(/from "(@\/|(\.\.\/)+)llm(\/|")/)).toEqual(["server/api-handlers.ts"]);
  expect(importing(/from "openai/)).toEqual(["llm/openai.ts"]);
});
