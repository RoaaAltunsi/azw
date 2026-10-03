// Guards the lint rule that keeps src/core pure (AGENTS.md §6).
import { ESLint } from "eslint";
import { expect, test } from "vitest";

const eslint = new ESLint();

async function ruleIds(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).map((m) => m.ruleId ?? "");
}

const forbidden = [
  "next",
  "next/server",
  "react",
  "react-dom/server",
  "@/app/page",
  "@/components/Badge",
  "@/llm",
  "../llm",
  "../../llm/provider",
  "../../components/Badge",
  "../app/layout",
];

test.each(forbidden)("src/core may not import %s", async (source) => {
  const ids = await ruleIds(`import "${source}";\n`, "src/core/status/sample.ts");
  expect(ids).toContain("no-restricted-imports");
}, 30_000);

const allowed = ["zod", "../types", "../diff", "./rules", "@/core/types"];

test.each(allowed)("src/core may import %s", async (source) => {
  const ids = await ruleIds(`import "${source}";\n`, "src/core/status/sample.ts");
  expect(ids).not.toContain("no-restricted-imports");
}, 30_000);

test("src/core may not call fetch", async () => {
  const ids = await ruleIds(`export const r = fetch("https://example.com");\n`, "src/core/corpus/sample.ts");
  expect(ids).toContain("no-restricted-globals");
}, 30_000);

test("the restriction applies only to src/core", async () => {
  const ids = await ruleIds(`import "react";\n`, "src/components/sample.ts");
  expect(ids).not.toContain("no-restricted-imports");
}, 30_000);
