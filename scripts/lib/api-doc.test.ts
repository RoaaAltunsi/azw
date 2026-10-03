import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { API_DOC_PATH, renderApiDoc } from "./api-doc.js";
import { p } from "./util.js";

test("docs/API.md is what the generator produces from the schemas and a real run", async () => {
  const onDisk = readFileSync(p(API_DOC_PATH), "utf8").replace(/\r\n/g, "\n");
  expect(onDisk, "run `npm run docs:api`").toBe(await renderApiDoc(p(".")));
});

test("the document shows no retrieval key", async () => {
  expect(await renderApiDoc(p("."))).not.toMatch(/searchText|searchVariants|matnText/);
});
