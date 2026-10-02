// Informational probe: where does the Quran source text differ from everyday Arabic spelling in
// ways that stripping diacritics alone will not bridge? Changes nothing; prints counts and examples
// so the owner can decide how search text should be handled (docs/SOURCES.md, open decision).
//
//   npx tsx scripts/probe-quran-spelling.ts
import { CorpusFileSchema } from "./lib/schema.js";
import { p, readJson } from "./lib/util.js";

const records = CorpusFileSchema.parse(readJson(p("data/corpus/quran.json"))).records;
// Probe-only stripping (harakat + dagger alif). Not the project's normalization.
const strip = (s: string): string => s.replace(/[ً-ْٰ]/g, "");

const PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "hamza on the line before waw (رءوف / everyday رؤوف)", re: /ءو/ },
  { label: "hamza on ya seat before waw (مسئولا / everyday مسؤولا)", re: /ئو/ },
  { label: "open ta where everyday spelling has ة (رحمت، نعمت، امرأت …)", re: /^(?:رحمت|نعمت|امرأت|لعنت|كلمت|سنت|بقيت|قرت|فطرت|شجرت|ابنت|جنت|معصيت)$/ },
  { label: "hamza under final alif (الملإ، نبإ / everyday الملأ، نبأ)", re: /[^ا]إ$/ },
  { label: "داوود with two waws (also written داود)", re: /داوود/ },
  { label: "مائة (also written مئة)", re: /^(?:مائة|مائتين)$/ },
  { label: "pause / section signs standing as separate tokens", re: /^[ۖ-ۜ۞۩]$/ },
];

for (const { label, re } of PATTERNS) {
  const forms = new Map<string, { count: number; first: string }>();
  for (const r of records) {
    for (const word of strip(r.exactText).split(" ")) {
      if (!re.test(word)) continue;
      const f = forms.get(word) ?? { count: 0, first: `${r.citation.surah}:${r.citation.ayah}` };
      f.count++;
      forms.set(word, f);
    }
  }
  const total = [...forms.values()].reduce((n, f) => n + f.count, 0);
  const examples = [...forms].sort((a, b) => b[1].count - a[1].count).slice(0, 8).map(([w, f]) => `${w} ×${f.count} (${f.first})`);
  console.log(`${label}\n  ${forms.size} distinct forms, ${total} occurrences. ${examples.join("؛ ")}`);
}
const dagger = records.filter((r) => r.exactText.includes("ٰ")).length;
console.log(`dagger alif (U+0670) appears in ${dagger} ayat; removing it yields the everyday spelling (الرحمن، ذلك، هذا، على).`);
