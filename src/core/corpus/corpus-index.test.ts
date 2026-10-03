import { describe, expect, test } from "vitest";
import { UTHMANI_VARIANT_OPTIONS } from "../normalize";
import type { SourceRecord } from "../types";
import { createHadithAdapter, createQuranAdapter, type SourceAdapter } from "./adapter";
import { buildCorpusIndex, type LayerRef } from "./corpus-index";
import { ALPHA_FIXTURE, ayah, BETA_FIXTURE, hadith, QURAN_FIXTURE, SPELLING_FIXTURE } from "./test-fixtures";

const quranAdapter = createQuranAdapter(QURAN_FIXTURE, SPELLING_FIXTURE);
const index = buildCorpusIndex([quranAdapter, createHadithAdapter("alpha", ALPHA_FIXTURE), createHadithAdapter("beta", BETA_FIXTURE)]);

const Q: LayerRef = { collection: "quran", layer: "default" };
const Q_UTHMANI: LayerRef = { collection: "quran", layer: "uthmani" };
const Q_EVERYDAY: LayerRef = { collection: "quran", layer: "everyday" };
const ALPHA: LayerRef = { collection: "alpha", layer: "default" };
const BETA: LayerRef = { collection: "beta", layer: "default" };

// Always through normalizeFor, as a caller must.
const find = (layer: LayerRef, text: string) => index.findExact(index.normalizeFor(layer, text).norm, layer);
const ids = (layer: LayerRef, text: string): string[][] => find(layer, text).map((h) => h.recordIds);

describe("adapters", () => {
  test("Quran: one unit per surah, ayat in order, whatever the order of the records", () => {
    const units = quranAdapter.units(quranAdapter.load()).map((u) => u.map((r) => r.id));
    expect(units).toEqual([["quran:2:153", "quran:2:154"], ["quran:7:56"], ["quran:19:2"], ["quran:112:3", "quran:112:4"], ["quran:113:1"]]);
  });

  test("Quran: three layers, each with the options its text was built with", () => {
    expect(quranAdapter.layers.map((l) => [l.name, l.options])).toEqual([
      ["default", { keepHonorificPhrases: true }],
      ["uthmani", UTHMANI_VARIANT_OPTIONS],
      ["everyday", { keepHonorificPhrases: true }],
    ]);
  });

  test("hadith: one unit per record, one layer without options", () => {
    const adapter = createHadithAdapter("alpha", ALPHA_FIXTURE);
    expect(adapter.units(adapter.load()).every((u) => u.length === 1)).toBe(true);
    expect(adapter.layers.map((l) => [l.name, l.options])).toEqual([["default", {}]]);
  });

  test('"everyday" replaces the source form as a whole word, only in the listed ayat', () => {
    expect(index.layerText(Q_EVERYDAY, "quran:7:56")).toBe("ولا تفسدوا في الارض بعد اصلاحها وادعوه خوفا وطمعا ان رحمه الله قريب من المحسنين");
    expect(index.layerText(Q_EVERYDAY, "quran:19:2")).toBe(index.layerText(Q, "quran:19:2"));
    // The stored searchText is untouched.
    expect(index.record("quran:7:56")?.searchText).toContain("رحمت");
  });

  test("a word that only contains the source form is not replaced", () => {
    const adapter = createQuranAdapter([ayah(1, 1, "برحمت رحمت")], [{ group: "g", sourceForm: "رحمت", everydayForm: "رحمة", ayat: ["1:1"] }]);
    expect(adapter.layers.find((l) => l.name === "everyday")?.text(adapter.load()[0]!)).toBe("برحمت رحمه");
  });

  test("a spelling list out of step with the records is refused", () => {
    expect(() => createQuranAdapter(QURAN_FIXTURE, [{ ...SPELLING_FIXTURE[0]!, ayat: ["3:1"] }])).toThrow(/3:1/);
    expect(() => createQuranAdapter(QURAN_FIXTURE, [{ ...SPELLING_FIXTURE[0]!, ayat: ["112:3"] }])).toThrow(/112:3/);
  });

  test("a Quran record without the uthmani variant is refused", () => {
    const bare: SourceRecord = { ...ayah(1, 1, "نص"), searchVariants: undefined };
    expect(() => buildCorpusIndex([createQuranAdapter([bare], [])])).toThrow(/uthmani/);
  });
});

describe("index build", () => {
  test("lists every layer of every collection with its options", () => {
    expect(index.layers.map((l) => `${l.collection}/${l.layer}/${l.kind}`)).toEqual([
      "quran/default/quran",
      "quran/uthmani/quran",
      "quran/everyday/quran",
      "alpha/default/hadith",
      "beta/default/hadith",
    ]);
    expect(index.recordCount).toBe(QURAN_FIXTURE.length + ALPHA_FIXTURE.length + BETA_FIXTURE.length);
  });

  test("a record id held by two adapters is refused", () => {
    expect(() => buildCorpusIndex([createHadithAdapter("alpha", ALPHA_FIXTURE), createHadithAdapter("alpha2", ALPHA_FIXTURE)])).toThrow(/Duplicate record id/);
  });

  test("an adapter whose units lose or repeat records, or that names a layer twice, is refused", () => {
    const base = createHadithAdapter("alpha", ALPHA_FIXTURE);
    expect(() => buildCorpusIndex([{ ...base, units: (records) => records.slice(1).map((r) => [r]) }])).toThrow(/units hold 3 records, 4 were loaded/);
    expect(() => buildCorpusIndex([{ ...base, layers: [...base.layers, ...base.layers] }])).toThrow(/Duplicate layer/);
  });

  test("a record with an empty layer text is indexed, never hit, and does not shift its neighbours", () => {
    const empty = { ...ayah(1, 2, "نص"), searchText: "", searchVariants: [{ label: "uthmani", text: "فارغ" }] };
    const sparse = buildCorpusIndex([createQuranAdapter([ayah(1, 1, "اول النص"), empty, ayah(1, 3, "اخر النص")], [])]);
    const layer = { collection: "quran", layer: "default" };
    expect(sparse.layerText(layer, "quran:1:2")).toBe("");
    expect(sparse.findExact("اخر النص", layer)).toMatchObject([{ recordIds: ["quran:1:3"], start: 0, end: 8 }]);
    expect(sparse.findExact("النص اخر", layer)).toEqual([]);
  });

  test("an unknown layer throws, and the message does not carry the query", () => {
    const secret = "نص من مسودة الكاتب";
    for (const call of [() => index.findExact(secret, { collection: "quran", layer: "nope" }), () => index.candidates(secret, { collection: "nope", layer: "default" })]) {
      expect(call).toThrow(/Unknown layer/);
      try {
        call();
      } catch (e) {
        expect(String(e)).not.toContain(secret);
      }
    }
  });
});

describe("exact lookup", () => {
  test("a whole ayah: the range covers the record's layer text", () => {
    const [hit, ...rest] = find(Q, "لم يلد ولم يولد");
    expect(rest).toEqual([]);
    expect(hit).toMatchObject({ collection: "quran", layer: "default", recordIds: ["quran:112:3"], start: 0 });
    expect(hit?.end).toBe(index.layerText(Q, "quran:112:3")?.length);
    expect(hit?.records[0]).toBe(index.record("quran:112:3"));
  });

  test("part of an ayah: the range is inside the record's layer text", () => {
    const [hit] = find(Q, "استعينوا بالصبر والصلاة");
    const text = index.layerText(Q, "quran:2:153")!;
    expect(hit?.recordIds).toEqual(["quran:2:153"]);
    expect(text.slice(hit!.start, hit!.end)).toBe("استعينوا بالصبر والصلاه");
    expect(hit!.start).toBeGreaterThan(0);
    expect(hit!.end).toBeLessThan(text.length);
  });

  test("a quote spanning two ayat is one hit: start in the first record, end in the last", () => {
    const [hit, ...rest] = find(Q, "إن الله مع الصابرين ولا تقولوا لمن يقتل");
    expect(rest).toEqual([]);
    expect(hit?.recordIds).toEqual(["quran:2:153", "quran:2:154"]);
    const first = index.layerText(Q, "quran:2:153")!;
    const last = index.layerText(Q, "quran:2:154")!;
    expect(first.slice(hit!.start)).toBe("ان الله مع الصابرين");
    expect(last.slice(0, hit!.end)).toBe("ولا تقولوا لمن يقتل");
  });

  test("no hit across two surahs", () => {
    expect(find(Q, "كفوا أحد")).toHaveLength(1);
    expect(find(Q, "قل أعوذ")).toHaveLength(1);
    expect(find(Q, "كفوا أحد قل أعوذ")).toEqual([]);
    // Not even when the query carries the separator the index uses between units.
    expect(index.findExact("كفوا احد\nقل اعوذ", Q)).toEqual([]);
  });

  test("no hit across two hadith records", () => {
    expect(find(ALPHA, "بعد شهر أخبرنا فلان")).toEqual([]);
  });

  test("no hit on a partial word", () => {
    // «من الله» is inside «المؤمن الله».
    expect(find(ALPHA, "المؤمن الله")).toHaveLength(1);
    expect(find(ALPHA, "من الله")).toEqual([]);
    expect(find(ALPHA, "المؤمن الل")).toEqual([]);
    expect(find(Q, "صابرين")).toEqual([]);
  });

  test("a fragment in the middle of a hadith record", () => {
    const [hit] = find(ALPHA, "خرجنا في سفر طويل");
    expect(hit?.recordIds).toEqual(["alpha:1"]);
    expect(index.layerText(ALPHA, "alpha:1")!.slice(hit!.start, hit!.end)).toBe("خرجنا في سفر طويل");
  });

  test("all occurrences: every record holding the text, in every collection asked", () => {
    expect(ids(ALPHA, "أن الماء كان قليلا")).toEqual([["alpha:2"], ["alpha:3"]]);
    expect(ids(BETA, "أن الماء كان قليلا")).toEqual([["beta:1"]]);
  });

  test("all occurrences inside one record", () => {
    const repeated = buildCorpusIndex([createHadithAdapter("gamma", [hadith("gamma", "1", "قال نعم ثم قال نعم ثم قال لا")])]);
    const hits = repeated.findExact("قال نعم", { collection: "gamma", layer: "default" });
    expect(hits.map((h) => [h.start, h.end])).toEqual([[0, 7], [11, 18]]);
  });

  test("a pending record is found like any other and says so", () => {
    const hit = find(ALPHA, "أن الماء كان قليلا").find((h) => h.recordIds[0] === "alpha:3");
    expect(hit?.records[0]?.reviewStatus).toBe("pending");
    expect(find(BETA, "نص بلا رقم")[0]?.records[0]?.reviewStatus).toBe("pending");
  });

  test("an empty query has no hit", () => {
    expect(index.findExact("", Q)).toEqual([]);
    expect(index.findExact("   ", Q)).toEqual([]);
  });
});

describe("layers", () => {
  test("«ولاكن» is found through uthmani only, «ولكن» through default only", () => {
    expect(ids(Q_UTHMANI, "بل أحياء ولاكن لا تشعرون")).toEqual([["quran:2:154"]]);
    expect(ids(Q, "بل أحياء ولاكن لا تشعرون")).toEqual([]);
    expect(ids(Q, "بل أحياء ولكن لا تشعرون")).toEqual([["quran:2:154"]]);
    expect(ids(Q_UTHMANI, "بل أحياء ولكن لا تشعرون")).toEqual([]);
  });

  test("a hit names the layer that produced it and nothing more", () => {
    const [hit] = find(Q_UTHMANI, "ولاكن لا تشعرون");
    expect(Object.keys(hit!).sort()).toEqual(["collection", "end", "layer", "recordIds", "records", "start"]);
    expect(hit?.layer).toBe("uthmani");
  });

  test("a hit never mixes layers: uthmani spelling in one ayah, everyday in the next", () => {
    // «والصلواه» is the uthmani text of 2:153, «ولكن» the default text of 2:154.
    const mixed = "بالصبر والصلواه ان الله مع الصابرين ولا تقولوا لمن يقتل في سبيل الله اموات بل احياء ولكن";
    for (const layer of [Q, Q_UTHMANI, Q_EVERYDAY]) expect(index.findExact(mixed, layer)).toEqual([]);
  });

  test("«رحمة» is found through everyday in the listed ayah, and not through default", () => {
    expect(ids(Q_EVERYDAY, "إن رحمة الله قريب من المحسنين")).toEqual([["quran:7:56"]]);
    expect(ids(Q, "إن رحمة الله قريب من المحسنين")).toEqual([]);
    expect(ids(Q, "إن رحمت الله قريب من المحسنين")).toEqual([["quran:7:56"]]);
  });

  test("the pair is not applied in an ayah the list does not name", () => {
    expect(ids(Q_EVERYDAY, "ذكر رحمة ربك")).toEqual([]);
    expect(ids(Q_EVERYDAY, "ذكر رحمت ربك")).toEqual([["quran:19:2"]]);
  });

  test("normalizeFor uses the layer's options", () => {
    // Quran layers keep the honorific phrase, the hadith layer drops it.
    expect(index.normalizeFor(Q, "رضي الله عنهم ورضوا عنه").norm).toBe("رضي الله عنهم ورضوا عنه");
    expect(index.normalizeFor(ALPHA, "رضي الله عنهم ورضوا عنه").norm).toBe("ورضوا عنه");
    // Only the uthmani layer reads the superscript alef as a letter.
    expect(index.normalizeFor(Q_UTHMANI, "وَلَٰكِن").norm).toBe("ولاكن");
    expect(index.normalizeFor(Q, "وَلَٰكِن").norm).toBe("ولكن");
    const { norm, map } = index.normalizeFor(Q, "﴿قُلْ﴾");
    expect([norm, map]).toEqual(["قل", [1, 3]]);
  });
});

describe("candidates", () => {
  const changed = "يا أيها الذين آمنوا استعينوا بالصبر والصلاة إن الله مع المتقين";

  test("an ayah with one word changed ranks its ayah first, by bigram containment", () => {
    const norm = index.normalizeFor(Q, changed).norm;
    expect(index.findExact(norm, Q)).toEqual([]);
    const [top] = index.candidates(norm, Q);
    expect(top).toMatchObject({ collection: "quran", layer: "default", score: 9 / 10 });
    expect(top?.record.id).toBe("quran:2:153");
  });

  test("the score counts distinct query bigrams", () => {
    const [top] = index.candidates("ان الله ان الله مع الصابرين", Q);
    // Distinct bigrams: «ان الله», «الله ان», «الله مع», «مع الصابرين»; the ayah holds three of them.
    expect(top?.score).toBe(3 / 4);
  });

  test("ties are broken by record id, and the order is the same on every run", () => {
    const norm = index.normalizeFor(ALPHA, "أن الماء كان قليلا").norm;
    const runs = Array.from({ length: 5 }, () => index.candidates(norm, ALPHA).map((c) => `${c.record.id}=${c.score}`));
    expect(runs[0]).toEqual(["alpha:2=1", "alpha:3=1"]);
    for (const run of runs) expect(run).toEqual(runs[0]);
    // The same records given in another order rank the same.
    const reversed = buildCorpusIndex([createHadithAdapter("alpha", [...ALPHA_FIXTURE].reverse())]);
    expect(reversed.candidates(norm, ALPHA).map((c) => c.record.id)).toEqual(["alpha:2", "alpha:3"]);
  });

  test("k limits the result; a pending record is a candidate like any other", () => {
    const norm = index.normalizeFor(ALPHA, "أن الماء كان قليلا").norm;
    expect(index.candidates(norm, ALPHA, 1).map((c) => c.record.id)).toEqual(["alpha:2"]);
    expect(index.candidates(norm, ALPHA, 0)).toEqual([]);
    expect(index.candidates(norm, ALPHA)[1]?.record.reviewStatus).toBe("pending");
  });

  test("a query of fewer than two words has no bigrams: []", () => {
    expect(index.candidates("الله", Q)).toEqual([]);
    expect(index.candidates("", Q)).toEqual([]);
  });

  test("each layer has its own bigrams", () => {
    expect(index.candidates("احياء ولاكن", Q_UTHMANI).map((c) => c.record.id)).toEqual(["quran:2:154"]);
    expect(index.candidates("احياء ولاكن", Q)).toEqual([]);
    expect(index.candidates("رحمه الله", Q_EVERYDAY).map((c) => c.record.id)).toEqual(["quran:7:56"]);
    expect(index.candidates("رحمه الله", Q)).toEqual([]);
  });
});

describe("extension point: a new kind needs an adapter and nothing else", () => {
  const dua: SourceRecord = {
    id: "hisn:1",
    kind: "dua",
    collection: "hisn",
    exactText: "اللهم أعني على ذكرك وشكرك وحسن عبادتك",
    searchText: "اللهم اعني علي ذكرك وشكرك وحسن عبادتك",
    citation: { display: "fixture", number: "1" },
    sourceName: "fixture",
    edition: "fixture",
    license: "fixture",
    reviewStatus: "pending",
  };
  const duaAdapter: SourceAdapter = {
    kind: "dua",
    collection: "hisn",
    load: () => [dua],
    units: (records) => records.map((r) => [r]),
    layers: [{ name: "default", options: {}, text: (r) => r.searchText }],
  };
  const extended = buildCorpusIndex([quranAdapter, duaAdapter]);
  const layer: LayerRef = { collection: "hisn", layer: "default" };

  test("the record is found by exact lookup", () => {
    const hits = extended.findExact(extended.normalizeFor(layer, "أعني على ذكرك وشكرك").norm, layer);
    expect(hits.map((h) => h.recordIds)).toEqual([["hisn:1"]]);
    expect(hits[0]?.records[0]?.kind).toBe("dua");
  });

  test("and by candidates()", () => {
    const [top] = extended.candidates(extended.normalizeFor(layer, "اللهم أعني على ذكرك وحسن عبادتك").norm, layer);
    expect(top?.record.id).toBe("hisn:1");
    expect(extended.layers.at(-1)).toMatchObject({ collection: "hisn", kind: "dua", layer: "default" });
  });
});
