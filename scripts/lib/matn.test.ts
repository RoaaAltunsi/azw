// Fixtures are real records from data/corpus; no hadith text is typed here. Failure paths are
// produced by mutating a real record with non-Arabic filler.
import assert from "node:assert/strict";
import { test } from "node:test";
import { extractMatn, MATN_MIN_WORDS } from "./matn.js";
import { CorpusFileSchema } from "./schema.js";
import { p, readJson } from "./util.js";

const records = CorpusFileSchema.parse(readJson(p("data/corpus/bukhari.json"))).records;
const text = (id: string): string => {
  const r = records.find((x) => x.id === id);
  if (!r) throw new Error(`fixture record not found: ${id}`);
  return r.exactText;
};

const SAYING = text("bukhari:5026"); // one quoted saying after «قال رسول الله ﷺ»
const open = SAYING.indexOf('"');
const close = SAYING.lastIndexOf('"');

test("extractMatn — returns the quoted saying verbatim, without quotes or edge marks", () => {
  const hit = extractMatn(SAYING);
  assert.ok(hit);
  assert.ok(SAYING.includes(hit.matn));
  assert.ok(SAYING.slice(open + 1, close).includes(hit.matn));
  assert.doesNotMatch(hit.matn, /^[\s‎‏"]|[\s‎‏"]$/);
  assert.ok(["qala-qala-rasul", "an-al-nabi-qala", "anna-rasul-qala", "samitu-yaqul"].includes(hit.rule));
});

test("extractMatn — every stored matnText is what the rule yields for that record", () => {
  for (const r of records.filter((x) => x.matnText !== undefined)) {
    assert.equal(extractMatn(r.exactText)?.matn, r.matnText, r.id);
  }
});

const rejected: Array<[string, string]> = [
  ["no quotes at all", SAYING.replace(/"/g, "")],
  ["opening quote never closed (bukhari:1)", text("bukhari:1")],
  ["closing quote removed", SAYING.slice(0, close) + SAYING.slice(close + 1)],
  ["two quoted sayings in a narrative (bukhari:1493)", text("bukhari:1493")],
  ["a second quote pair appended", `${SAYING} "x y z"`],
  ["text continues after the closing quote", `${SAYING} x`],
  ["sentence break before the quote (narrative, not a chain)", `x. ${SAYING}`],
  ["Quran braces before the quote", `{x} ${SAYING}`],
  ["quote not introduced by an attribution to the Prophet (bukhari:12)", text("bukhari:12")],
  ["attribution words removed from before the quote", `x y z ${SAYING.slice(open)}`],
  [`quoted segment shorter than ${MATN_MIN_WORDS} words`, `${SAYING.slice(0, open)}"x y"${SAYING.slice(close + 1)}`],
  ["empty text", ""],
];

for (const [name, input] of rejected) {
  test(`extractMatn — no matn: ${name}`, () => assert.equal(extractMatn(input), null));
}
