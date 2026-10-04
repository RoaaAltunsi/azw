// The grounded explanation of a DIFFERS item: what the model is given, and the check its answer
// must pass before it is shown. Pure. The answer is untrusted input (AGENTS.md §2 rule 9): it is
// shown only as `explanation: { text, generated: true }` and never changes a status, a reason or
// the evidence. Documented in docs/ARCHITECTURE.md ("Explanation"); choices: docs/DECISIONS.md D-23.
import { format } from "../../i18n/ar";
import { normalizeWithMap } from "../normalize";
import type { Evidence, ReviewItem } from "../types";

// A difference as words: `draft` cut from the user's draft, `source` from exactText.
export interface ExplainDiffOp {
  op: "replace" | "insert" | "delete";
  draft?: string; // absent only for "delete"
  source?: string; // absent only for "insert"
}

// The names of the explanation prompt (src/llm/prompts/explain.ts).
export interface ExplainDiffInput {
  draftExcerpt: string; // the span of the draft
  sourceText: string; // exactText of the records of the occurrence the item rests on
  sourceCitation: string; // citation.display of those records
  draftCitation: string | null; // the reference as the draft writes it
  reasonCode: string;
  diffOps: ExplainDiffOp[];
}

export const EXPLANATION_LIMITS = { MAX_CHARS: 240, MAX_SENTENCES: 2 } as const;

// Words the tool's generated text may not hold: each reads as a grade or a ruling (AGENTS.md §2
// rule 4). Compared without diacritics, anywhere in a word, inside a quoted segment too.
export const FORBIDDEN_WORDS: readonly string[] = ["صحيح", "ضعيف", "موضوع", "حكم", "يجب", "يحرم", "فتوى"];

// The only words a note may hold outside its quoted segments, the titles of the covered books and
// the words of the two citations (docs/DECISIONS.md D-24): the words needed to say where two texts
// or two references differ, and no others. A grade, a ruling, an interpretation, a name, an address
// or «مطابق» cannot be written with them. Compared without diacritics; a word may carry the
// prefixes و ف، ب ل ك and ال. «لا» is left out on purpose («لا يختلف»).
export const EXPLANATION_VOCABULARY: readonly string[] = `
  مسودة مسودتك نص نصك نصه مصدر كلمة كلمتان كلمتين كلمات لفظ لفظة لفظان لفظين ألفاظ عبارة حرف
  آية آيتان آيتين آيات سورة حديث قرآن قرآنية نبوي كتاب مرجع رقم رقمها رقمه موضع مواضع ترتيب
  نقل منقول مقتبس اقتباس عزو نسبة زيادة نقص
  ورد وردت يرد ترد وارد واردة جاء جاءت كتب كتبت مكتوب مكتوبة ذكر ذكرت مذكور مذكورة
  نسب نسبت ينسب منسوب منسوبا منسوبة أشير زائد زائدة ناقص ناقصة ينقص تنقص سقط سقطت
  حذف حذفت محذوف محذوفة تغير تغيرت أبدل أبدلت بدل بدلا استبدل استبدلت أضيف أضيفت
  موجود موجودة يوجد توجد يختلف تختلف مختلف مختلفة يخالف تخالف تقدم تقدمت تأخر تأخرت
  في من عن إلى على بين مع عند قبل بعد مكان هو هي هذا هذه ذلك تلك هنا أن إن أما لكن لكنه لكنها
  بينما حين حيث أو ثم قد كما ليس ليست لم غير دون فقط أي ما التي الذي منه منها فيه فيها به بها
  له لها عنه عنها عليه عليها أخرى آخر واحد واحدة أيضا كذلك
`
  .trim()
  .split(/\s+/);

// `occurrence`: the evidence entries of one occurrence, in record order (never empty).
export function buildExplainInput(draft: string, item: ReviewItem, occurrence: readonly Evidence[]): ExplainDiffInput {
  const exactText = new Map(occurrence.map(({ record }) => [record.id, record.exactText]));
  const diffOps = occurrence.flatMap(({ diff }) =>
    (diff ?? []).flatMap((d): ExplainDiffOp[] => {
      if (d.op === "equal") return [];
      const source = d.source && exactText.get(d.source.recordId)?.slice(d.source.start, d.source.end);
      return [{ op: d.op, ...(d.draft ? { draft: draft.slice(d.draft.start, d.draft.end) } : {}), ...(source ? { source } : {}) }];
    }),
  );
  const first = occurrence[0]!.record.citation.display;
  const last = occurrence[occurrence.length - 1]!.record.citation.display;
  return {
    draftExcerpt: item.span.text,
    sourceText: occurrence.map(({ record }) => record.exactText).join(" "),
    sourceCitation: first === last ? first : format("reason.ref.range", { first, last }),
    draftCitation: item.citedReference?.raw || null,
    reasonCode: item.reasonCode,
    diffOps,
  };
}

const QUOTED = /«([^«»]*)»|﴿([^﴿﴾]*)﴾/g;
// A quotation mark outside a matched «…» or ﴿…﴾: words quoted this way could not be checked.
const STRAY_QUOTE_MARK = /[«»﴿﴾"“”„‘’]/;
const SENTENCE_END = /[.!?؟\n]+/;
const HAS_WORD = /[\p{L}\p{N}]/u;

// Arabic-Indic and Extended Arabic-Indic digits as ASCII digits.
const asciiDigits = (text: string): string => text.replace(/[٠-٩۰-۹]/g, (d) => String(d.charCodeAt(0) & 0xf));
const numbersOf = (text: string): string[] => asciiDigits(text).match(/\d+/g) ?? [];

// Without diacritics, punctuation as spaces.
const fold = (text: string): string => ` ${normalizeWithMap(text, "search", { keepHonorificPhrases: true }).norm} `;

const VOCABULARY = new Set(EXPLANATION_VOCABULARY.map((word) => fold(word).trim()));

// The word itself, then the word without its prefixes: a conjunction, a preposition, the article
// (written «ل» after the preposition «ل»).
function withoutPrefixes(word: string): string[] {
  const forms = [word];
  if (/^[وف]./.test(word)) forms.push(word.slice(1));
  for (const form of [...forms]) if (/^[بلك]./.test(form)) forms.push(form.slice(1), form.replace(/^لل/, "ال"));
  for (const form of [...forms]) if (/^ال./.test(form)) forms.push(form.slice(2));
  return forms;
}

// The note as it may be shown, or null. `bookTitles`: the names of the covered collections
// («صحيح البخاري»); a title is a name, not a grade, so it is taken out before the word check.
export function validateExplanation(text: string, input: ExplainDiffInput, bookTitles: readonly string[]): string | null {
  const note = text.trim();
  if (note === "" || note.length > EXPLANATION_LIMITS.MAX_CHARS) return null;

  // Every quoted segment stands verbatim in what the model was given.
  const citations = [input.sourceCitation, input.draftCitation ?? ""];
  const grounds = [input.draftExcerpt, input.sourceText, ...citations];
  for (const match of note.matchAll(QUOTED)) {
    const segment = (match[1] ?? match[2] ?? "").trim();
    if (segment === "" || !grounds.some((ground) => ground.includes(segment))) return null;
  }
  const outsideQuotes = note.replace(QUOTED, " ");
  if (STRAY_QUOTE_MARK.test(outsideQuotes)) return null;

  // A full stop inside a quoted segment ends no sentence of the note.
  if (outsideQuotes.split(SENTENCE_END).filter((part) => HAS_WORD.test(part)).length > EXPLANATION_LIMITS.MAX_SENTENCES) return null;

  const cited = new Set(citations.flatMap(numbersOf));
  if (!numbersOf(note).every((n) => cited.has(n))) return null;

  const withoutTitles = bookTitles.reduce((rest, title) => rest.replaceAll(fold(title), " "), fold(note));
  if (FORBIDDEN_WORDS.some((word) => withoutTitles.includes(fold(word).trim()))) return null;

  // Outside the quoted segments and the titles, every word is one of the vocabulary or of a citation.
  const citationWords = new Set(citations.flatMap((citation) => fold(citation).trim().split(" ")));
  // A prefix may stand alone before a quoted segment (ب«…»).
  const known = (word: string): boolean => /^(\d+|[وفبلك])$/.test(word) || withoutPrefixes(word).some((form) => VOCABULARY.has(form) || citationWords.has(form));
  const ownWords = bookTitles.reduce((rest, title) => rest.replaceAll(fold(title), " "), fold(asciiDigits(outsideQuotes)));
  if (!ownWords.split(" ").filter((word) => word !== "").every(known)) return null;

  return note;
}
