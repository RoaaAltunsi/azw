// Writes docs/API.md from the exported zod schemas and a real run (scripts/lib/api-doc.ts).
//
//   npm run docs:api            write the file
//   npm run docs:api -- --check exit 1 if the file is out of date
import { readFileSync, writeFileSync } from "node:fs";
import { API_DOC_PATH, renderApiDoc } from "./lib/api-doc.js";
import { p } from "./lib/util.js";

const doc = await renderApiDoc(p("."));
if (process.argv.includes("--check")) {
  const current = readFileSync(p(API_DOC_PATH), "utf8").replace(/\r\n/g, "\n");
  if (current !== doc) {
    console.error(`${API_DOC_PATH} is out of date. Run: npm run docs:api`);
    process.exit(1);
  }
  console.log(`${API_DOC_PATH} is up to date.`);
} else {
  writeFileSync(p(API_DOC_PATH), doc);
  console.log(`Wrote ${API_DOC_PATH} (${doc.length} characters).`);
}
