import assert from "node:assert/strict";
import { test } from "node:test";
import { toRanges } from "./util.js";

const cases: Array<[string, string[], string]> = [
  ["empty list", [], ""],
  ["single number", ["7"], "7"],
  ["consecutive run", ["1", "2", "3"], "1–3"],
  ["runs and singles", ["1", "2", "5", "6", "7", "16"], "1–2, 5–7, 16"],
  ["decimal entries never join a run", ["401", "402", "402.2", "403"], "401–402, 402.2, 403"],
  ["no run across a gap of one", ["1", "3"], "1, 3"],
];

for (const [name, input, expected] of cases) {
  test(`toRanges — ${name}`, () => assert.equal(toRanges(input), expected));
}
