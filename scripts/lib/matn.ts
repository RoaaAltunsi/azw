// Conservative matn separation for the hadith-api Arabic editions.
//
// A matn is stored ONLY when the record is a single directly-quoted prophetic saying:
//   1. the text contains exactly one pair of straight quotes ("…"),
//   2. nothing but spaces / direction marks / a full stop follows the closing quote,
//   3. the part before the opening quote has no sentence break and no Quran braces
//      (i.e. it is a chain of narration, not a narrative), and
//   4. that part ends with an explicit attribution of speech to the Prophet ﷺ (rules below).
// The stored value is the quoted segment copied verbatim from the source text (only surrounding
// spaces and direction marks are trimmed). Anything else — narratives, multiple quotes, an
// unterminated quote, companions' statements — gets no matnText.
//
// This is a heuristic about where the quoted speech starts and ends. It makes no claim about the
// hadith itself and is listed for human review in docs/SOURCES.md.

const HARAKAT_AND_TATWEEL = /[ً-ْٰـ]/g;
const DIRECTION_MARKS = /[\u200E\u200F]/g;
const EDGE_TRIM = /^[\s\u200E\u200F]+|[\s\u200E\u200F]+$/g;

const SALAWAT = "(?:صلى الله عليه وسلم)";
const PROPHET = "(?:رسول الله|النبي)";

const ATTRIBUTION_RULES: Array<{ rule: string; re: RegExp }> = [
  { rule: "qala-qala-rasul", re: new RegExp(`(?:^|[ ،])قال قال ${PROPHET} ${SALAWAT}$`) },
  { rule: "an-al-nabi-qala", re: new RegExp(`(?:^|[ ،])عن ${PROPHET} ${SALAWAT} (?:أنه )?قال$`) },
  { rule: "anna-rasul-qala", re: new RegExp(`(?:^|[ ،])أن ${PROPHET} ${SALAWAT} قال$`) },
  { rule: "samitu-yaqul", re: new RegExp(`(?:^|[ ،])(?:سمعت|سمع) ${PROPHET} ${SALAWAT} يقول$`) },
];

export const MATN_MIN_WORDS = 3;

function bare(text: string): string {
  return text
    .replace(DIRECTION_MARKS, "")
    .replace(HARAKAT_AND_TATWEEL, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractMatn(text: string): { matn: string; rule: string } | null {
  const first = text.indexOf('"');
  if (first < 0) return null;
  const second = text.indexOf('"', first + 1);
  if (second < 0 || text.indexOf('"', second + 1) >= 0) return null;

  const before = text.slice(0, first);
  const after = text.slice(second + 1);
  if (/[^\s\u200E\u200F.]/.test(after)) return null;
  if (/[.{}]/.test(before)) return null;

  const tail = bare(before).replace(/[\s:،]+$/, "");
  const hit = ATTRIBUTION_RULES.find((r) => r.re.test(tail));
  if (!hit) return null;

  const matn = text.slice(first + 1, second).replace(EDGE_TRIM, "");
  if (bare(matn).split(" ").filter(Boolean).length < MATN_MIN_WORDS) return null;
  return { matn, rule: hit.rule };
}
