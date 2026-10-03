// Measures the corpus loader and the CorpusIndex on the real corpus. Prints timings only: the
// draft below is a fixed test text assembled from corpus records, and no query is printed.
//
//   npm run bench:index
import { performance } from "node:perf_hooks";
import { tokenize } from "../src/core/normalize/index.js";
import { buildCorpus, readCorpus, validateCorpus } from "../src/server/corpus-loader.js";
import { ROOT } from "./lib/util.js";

const BUILD_BUDGET_MS = 1500;
const LOOKUP_BUDGET_MS = 50;
const RUNS = 5;

const mb = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(0)} MB`;
const ms = (n: number): string => `${n.toFixed(1)} ms`;
const median = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
const gc = (globalThis as { gc?: () => void }).gc;

const heap = (): number => process.memoryUsage().heapUsed;
function timed<T>(fn: () => T): { value: T; time: number } {
  const start = performance.now();
  const value = fn();
  return { value, time: performance.now() - start };
}

// --- load phases -----------------------------------------------------------------------------
// Heap is sampled at the end of each phase; the highest sample is reported as the peak of a load.
const read = timed(() => readCorpus(ROOT));
const heapAfterRead = heap();
const validated = timed(() => validateCorpus(read.value));
const heapAfterValidation = heap();
const first = timed(() => buildCorpus(validated.value));
const { index } = first.value;
const heapAfterBuild = heap();
const peakHeap = Math.max(heapAfterRead, heapAfterValidation, heapAfterBuild);
// The first build includes JIT warm-up, as a cold server start does. The repeats show the spread.
const rebuilds = Array.from({ length: RUNS - 1 }, () => timed(() => buildCorpus(validated.value)).time);
gc?.();
const retained = process.memoryUsage().heapUsed;

// --- a 300-word draft holding 5 quotes -------------------------------------------------------
const text = (id: string): string => {
  const record = index.record(id);
  if (!record) throw new Error(`${id} is not in the corpus`);
  return record.exactText;
};
const words = (id: string, from: number, count: number): string => tokenize(text(id)).slice(from, from + count).join(" ");
const quotes = [
  text("quran:2:255"), // a whole ayah
  `${text("quran:2:153")} ${text("quran:2:154")}`, // two ayat
  text("quran:7:56").replace(/^\S+/, "كلمة"), // an ayah with its first word changed: candidates only
  words("bukhari:1", 30, 25), // from the middle of a hadith
  words("muslim:93", 40, 25).replace(/\S+$/, "كلمة"), // a hadith with its last word changed
];
const filler = "وهذا كلام الكاتب بين النقول يشرح به ما أراد ويمهّد لما بعده من غير أن ينسبه إلى أحد";
const quoteWords = quotes.reduce((n, q) => n + tokenize(q).length, 0);
const fillerWords = tokenize(filler);
const padding = Array.from({ length: Math.max(0, 300 - quoteWords) }, (_, i) => fillerWords[i % fillerWords.length]).join(" ");
const draftWords = quoteWords + tokenize(padding).length;

// Every quote on every layer of every collection, as the matchers will ask.
const exactTimes: number[] = [];
const candidateTimes: number[] = [];
const normalizeTimes: number[] = [];
let exactHits = 0;
let draftTotal = 0;
for (let run = 0; run < RUNS; run++) {
  const draftStart = performance.now();
  for (const quote of quotes) {
    for (const layer of index.layers) {
      const n = timed(() => index.normalizeFor(layer, quote));
      const e = timed(() => index.findExact(n.value.norm, layer));
      const c = timed(() => index.candidates(n.value.norm, layer));
      if (run > 0) {
        normalizeTimes.push(n.time);
        exactTimes.push(e.time);
        candidateTimes.push(c.time);
      } else exactHits += e.value.length;
    }
  }
  if (run > 0) draftTotal = Math.max(draftTotal, performance.now() - draftStart);
}

// Worst cases: a one-word query that occurs in thousands of records, and a two-word one.
const common = index.layers.map((layer) => {
  const one = index.normalizeFor(layer, "الله").norm;
  const two = index.normalizeFor(layer, "قال رسول").norm;
  return {
    layer,
    exact: timed(() => index.findExact(one, layer)),
    candidates: timed(() => index.candidates(two, layer)),
  };
});

const verdict = (value: number, budget: number): string => (value <= budget ? "within budget" : `OVER the ${budget} ms budget`);
const lines = [
  `records: ${index.recordCount}, layers: ${index.layers.map((l) => `${l.collection}/${l.layer}`).join(", ")}`,
  `read + parse:    ${ms(read.time)}`,
  `zod validation:  ${ms(validated.time)}`,
  `index build:     ${ms(first.time)} cold; ${rebuilds.map((t) => t.toFixed(0)).join(", ")} ms on ${rebuilds.length} repeats (median ${ms(median(rebuilds))}) — ${verdict(first.time, BUILD_BUDGET_MS)}`,
  `heap used:       ${mb(heapAfterRead)} after read + parse, ${mb(heapAfterValidation)} after validation, ${mb(heapAfterBuild)} after the build — peak of one load ${mb(peakHeap)}`,
  `heap retained:   ${gc ? `${mb(retained)} after gc, with the raw and the validated copies still referenced by this script` : "not measured (run node with --expose-gc)"}`,
  `draft:           ${draftWords} words, ${quotes.length} quotes, ${index.layers.length} layers each (${exactHits} exact hits)`,
  `normalizeFor:    median ${ms(median(normalizeTimes))}, max ${ms(Math.max(...normalizeTimes))}`,
  `findExact:       median ${ms(median(exactTimes))}, max ${ms(Math.max(...exactTimes))} — ${verdict(Math.max(...exactTimes), LOOKUP_BUDGET_MS)}`,
  `candidates:      median ${ms(median(candidateTimes))}, max ${ms(Math.max(...candidateTimes))} — ${verdict(Math.max(...candidateTimes), LOOKUP_BUDGET_MS)}`,
  `whole draft:     ${ms(draftTotal)} for ${quotes.length * index.layers.length} normalize + findExact + candidates calls (slowest run)`,
  "common queries (one call each):",
  ...common.map(
    (c) =>
      `  ${`${c.layer.collection}/${c.layer.layer}`.padEnd(16)} findExact, one word: ${ms(c.exact.time)} (${c.exact.value.length} hits); candidates, two words: ${ms(c.candidates.time)}`,
  ),
];
console.log(lines.join("\n"));
