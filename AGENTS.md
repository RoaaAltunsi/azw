# AGENTS.md — Azw (عَزْو) project context

> Read this file before every task. It is the single source of truth for scope, rules and architecture.
> If a task prompt conflicts with this file, stop and ask; do not guess.
> A question the prompt leaves open is not a conflict: research it, decide it and document it
> (section 9, "Decisions on religious content").

## 1. What we are building

**Azw (عَزْو)** is a mobile-first web app (installable PWA) for Arabic da'wah content writers.
The writer pastes an Arabic draft. Azw:

1. finds every Quran quotation and every text attributed to the Prophet ﷺ,
2. matches each one against approved, licensed sources,
3. shows the source text, the exact reference and a word-level diff,
4. assigns one of four statuses, and refers to a specialist whenever the evidence is not enough.

Tagline: «انقل النص كما ورد، ومن حيث ورد.»

Competition: "AI in Service of Islamic Content" challenge, Track 04 (knowledge and verification tools).

## 2. Non-negotiable rules (from the challenge's scientific package)

These come from «المرجعية والحزمة العلمية والبيانات» and the participant guide. Never violate them.

1. **Traceability (الموثوقية والإسناد).** Every quoted text the app displays must trace to a source record.
   Never attribute a text to a source that does not contain it.
2. **Separate scripture from generated text.** Source text and AI-generated explanation must be visually
   and structurally distinct. Generated text is always labeled «شرح مولّد آلياً».
3. **Abstain instead of guessing (مقاومة الهلوسة).** If evidence is missing or confidence is low,
   the result is "not verified" or "needs specialist". Never produce an unsupported positive result.
4. **No fatwa, no grading by the model (عدم الاستقلال بالفتوى).** The app never issues rulings,
   never interprets verses, and the LLM never grades a hadith. A grade is shown only when it exists
   in the source record, with its attribution.
5. **No hadith without a source and an approved grade in the data.** The package says:
   «لا ينسب حديث دون مصدر وحكم معتمد في البيانات». MVP hadith scope = Sahih al-Bukhari and Sahih Muslim.
6. **Gentle correction.** When a verse is misquoted: point to the correct text gently, show surah and ayah,
   and never build on the altered text.
7. **Transparency.** The UI states plainly that this is an AI-assisted tool, not a human scholar.
8. **Privacy.** Do not store drafts. Do not log draft content. Publish a short privacy notice.
9. **The model's memory is never a source.** LLM output is untrusted input: schema-validated,
   bounded to spans of the user's draft, and never trusted to decide a status.

## 3. Content levels (from the scientific package) and how Azw maps to them

| Package level | Scope | Required handling | Azw behavior |
|---|---|---|---|
| (أ) معلومات أصلية مستقرة | Quran, approved authentic hadith | Direct answer documented by source | Text matching against approved records → statuses below |
| (ب) شرح وتعريف واستدلال | Explanations, concepts | From approved material, show reference, avoid certainty where disagreement exists | Only the short diff explanation, labeled as generated |
| (ج) مسائل خلافية أو عالية الحساسية | Fiqh disagreement, detailed creed, contested history | Restricted answer, state disagreement, or refer | `NEEDS_SPECIALIST` |
| (د) فتوى أو حالة شخصية | Personal rulings | No independent ruling; refer to a qualified party | `NEEDS_SPECIALIST` with referral wording; never answered |

Every result item carries `contentLevel: "A" | "B" | "C" | "D"`.

## 4. The four statuses (exact Arabic UI labels, do not rename)

| Code | Arabic label | Rule |
|---|---|---|
| `MATCH` | مطابق لنص المصدر | Reviewed record + text matches under documented normalization + cited reference (if any) is correct |
| `DIFFERS` | مختلف في اللفظ أو المرجع | Close candidate found, but the wording differs, the reference is wrong, or the kind is wrong (e.g., a verse attributed as hadith) |
| `NOT_FOUND` | لم يُتحقق منه ضمن المصادر المتاحة | No sufficient record in the covered sources. Never call it false or fabricated |
| `NEEDS_SPECIALIST` | يحتاج مراجعة مختص | Ambiguous or conflicting candidates, mid-confidence score, interpretive or ruling claims (levels C/D) |

Plus a system state `ERROR` → «تعذّر إكمال التحقق». It never shows a match badge, and an `ERROR` item
carries no evidence.

Why «مطابق لنص المصدر» and not «موثّق»: the app proves that a text exists in a source with this wording.
It never proves authenticity.

## 5. Sources (MVP)

| Kind | Display text | Search text | Notes |
|---|---|---|---|
| Quran | Quranpedia "Hafs" mushaf (id 1, publisher: King Fahd Complex), from the official versioned dump (`mushafs-1.json`, dump version 2026-10-02). Quranpedia is named in the package itself | The same text, normalized (diacritics removed). This is NOT enough on its own: the text is in everyday spelling but keeps some mushaf spellings (see "Quran spelling" below). Plus a search-only "uthmani" variant from Quranpedia mushaf 2 (see "Uthmani-script pastes" below) | 114 surahs / 6236 ayat, verified. Leading BOM (U+FEFF) stripped. Credit «Quranpedia.net» with a link and the dump version wherever the data is republished |
| Hadith | Sahih al-Bukhari, Sahih Muslim from fawazahmed0/hadith-api (Unlicense), editions ara-bukhari / ara-muslim, pinned to commit `df57907`. The repository does not state which printed edition the Arabic text was digitized from | Normalized copy of the same text | Bukhari record id = `bukhari:<hadithnumber>`; displayed number = integer part of `hadithnumber` (1–7563). Muslim record id = `muslim:<hadithnumber>` (source running number); the displayed citation number = integer part of `arabicnumber` (Fuad Abd al-Baqi, 1–3033), NOT `hadithnumber`, with the full value kept in `citation.subNumber`. Samples verified against dorar.net |

### Findings from P0.1 (facts about the data; do not assume otherwise)

- **Quran spelling (decided 2026-10-03, `docs/DECISIONS.md` D-9).** Removing diacritics and the dagger
  alif bridges most words, but not these mushaf spellings: open ta (رحمت، نعمت، امرأت), hamza forms
  (رءوف، مسئولا), مائة. A writer's «رحمة» will not match «رحمت» by diacritic removal alone. They are
  bridged by the owner-approved list `data/aliases/quran-spelling-variants.json`; each pair applies
  ONLY in its listed ayat. Do not add folding rules to normalization. A new pair is added only
  after the check of section 9 (the mushaf's word and the everyday form, read in the source text,
  bound to its ayat) and is recorded in `docs/DECISIONS.md`. «داود» and «إذن» were rejected by the
  owner and stay unbridged.
- **Uthmani-script pastes (decided 2026-10-03, D-9).** Every Quran record carries
  `searchVariants: [{ label: "uthmani", text }]`: the same ayah from Quranpedia mushaf 2 (Hafs,
  Uthmani script, King Fahd Complex), normalized with `UTHMANI_VARIANT_OPTIONS` from
  `src/core/normalize`. It is for retrieval only: never displayed, never diffed, never cited. Compare
  it with the draft span normalized with the same options; compare `searchText` with the span
  normalized with `{ keepHonorificPhrases: true }`. A match through the variant or through the
  spelling list is a spelling match of the same ayah. The Quran matcher must use both, and still
  display and diff `exactText`. Owner's decision (D-9): a spelling error never ends
  MATCH. A span in everyday script that equals only the variant (e.g. it writes «الرحمان») is a
  spelling error: the variant may produce MATCH only for words actually written as the mushaf writes
  them (decided 2026-10-03, D-13). A word that differs from `searchText` must be in Uthmani script
  (the span carries a sign only Uthmani texts have: ٱ U+0671, U+0653–U+065F, or U+06DF–U+06ED
  without ۩; or the word itself carries the superscript alef U+0670) and must not spell out an alef
  the mushaf writes above the line. The superscript alef and the pause marks alone do not make a
  span Uthmani script: our own Quran text carries them;
  otherwise compare the span with `searchText` only. Rules and measured coverage: `docs/ARCHITECTURE.md`,
  "The Quran uthmani search variant".
- **The Quran text is not in Uthmani script.** It is everyday (imla'i) spelling with full diacritics
  and embedded pause marks, plus the signs ۞ and ۩.
- **Bukhari gaps and split entries.** 9 source entries are empty, so those numbers are absent from the
  corpus. 26 entries have a decimal `hadithnumber` (e.g. `402.2`): the id keeps the decimal
  (`bukhari:402.2`), the displayed number is the integer part, and `citation.subNumber` keeps the full value.
- **Muslim gaps.** 203 source entries are empty and are skipped. 148 records have no `arabicnumber`:
  `citation.number = null`, no grade, never approvable. As a result 71 of the 3033 Abd al-Baqi numbers
  are not in the corpus. A quote from one of them ends NOT_FOUND although it is in Sahih Muslim;
  NOT_FOUND wording must therefore never imply the text is absent from the book.
- **Records that stay pending.** Both hadith collections were approved by the owner on 2026-10-02 on
  sample checks. After the review of 2026-10-03, 6701 Bukhari and 7145 Muslim records are reviewed.
  A collection approval never covers: records with damaged text (U+FFFD/U+FFFC), split entries,
  records whose text the source repeats under several numbers, records without a citation number,
  records whose text does not open with a formula of direct transmission (حدثنا، حدثني، أخبرنا،
  أخبرني، سمعت — such a record may be a suspended report, معلّق: `docs/DECISIONS.md` D-5), and the
  records in `data/review/held-records.json`. These remain `pending`, carry no grade, and can
  never produce MATCH.
- **What "reviewed" means.** The owner accepted the collection after automated checks and a sample
  comparison; it does not mean each record was compared with a printed edition. Limits are recorded in
  `data/review/reviewed.json` and `docs/SOURCES.md`.
- **Quranpedia checksum.** The published sha256 covers the `.gz` and does not match the file served,
  although its content is identical to the local JSON. Accepted (`docs/DECISIONS.md` D-15): the
  decompressed JSON is the integrity anchor, and all 6236 ayat equal the Tanzil "simple" text letter
  for letter once diacritics and marks are removed.

**Dorar** (الدرر السنية, named in the package) is NOT the matching corpus and never a runtime
dependency of MATCH. Its API (`https://dorar.net/dorar_api.json?skey=…`) is a live keyword search
returning ~15 HTML results. It is used (1) to verify samples of our Sahihayn data, and (2) optionally,
to point to other books with the grade quoted verbatim from the named muhaddith, without changing our
status. In P0.1 the verification also used two things beyond the documented API: the site-search book
filter `&s[]=<book id>`, and Dorar's public hadith pages («أصول الحديث») for word-for-word comparison.
Dorar's content is all rights reserved: responses are cached only in the gitignored
`data/raw/dorar-cache/`, and Dorar text is not republished beyond short quoted evidence in the docs.

All sources are listed in `docs/SOURCES.md` (source register): name, URL, version or date, license or
terms, numbering scheme, checksum, review status, and who reviewed what. The machine-readable register
is `data/corpus/manifest.json`.

## 6. Architecture (built for extension)

```
azw/
├─ AGENTS.md                  # this file
├─ data/
│  ├─ raw/                    # downloaded originals (gitignored if license forbids redistribution)
│  ├─ corpus/                 # built, versioned JSON: one file per source + manifest.json
│  └─ aliases/                # surah names & variants, collection-name aliases
├─ scripts/                   # build-corpus.ts, verify-corpus.ts (no runtime code here)
├─ eval/
│  ├─ cases/                  # tune.jsonl, heldout.jsonl (labeled)
│  ├─ run-eval.ts
│  └─ results/                # dated markdown reports
├─ src/
│  ├─ core/                   # PURE TypeScript. No Next.js, no React, no fetch. Reusable by any client
│  │  ├─ types.ts             # ContentKind, SourceRecord, ReviewItem, Status, ContentLevel …
│  │  ├─ normalize/           # Arabic normalization with offset maps
│  │  ├─ references/          # citation parsing (surah/ayah, collection/number, «متفق عليه»)
│  │  ├─ corpus/              # SourceAdapter registry + in-memory index
│  │  ├─ matchers/            # one Matcher per ContentKind (quran, hadith, …)
│  │  ├─ extract/             # regex extractor (baseline) + span validation + merge
│  │  ├─ diff/                # word-level diff mapped back to original text
│  │  ├─ status/              # deterministic status rules (the only place statuses are decided)
│  │  └─ review.ts            # orchestrator: draft → ReviewResult (takes an injected LLM port)
│  ├─ llm/                    # provider adapter(s) + prompt templates (implements the LLM port)
│  ├─ server/                 # server-only loaders (fs); never imported by core
│  ├─ app/                    # Next.js App Router: UI pages + /api/v1/review route
│  ├─ components/
│  └─ i18n/                   # UI strings (ar now; keys ready for other languages)
├─ public/                    # manifest.webmanifest, icons, fonts
└─ docs/                      # SOURCES.md, STARTING_POINT.md, ARCHITECTURE.md, API.md (generated), DECISIONS.md,
                              # BACKLOG.md, EVALUATION.md, PRIVACY.md
```

### Extension points (design for them now, build them later)

- **New content kinds** (supplications/adhkar, other hadith books with their grades, athar,
  misattributed sayings): `ContentKind` is an open union. Adding one means a new `SourceAdapter`
  plus a `Matcher`, and nothing else. The UI and the status rules must not branch on specific kinds,
  except through a `kindMeta` registry (label, icon, citation formatter).
- **Grades from other books**: `SourceRecord.grade?: { text: string; by: string; sourceRef: string }`.
  Shown only if present in the data. Reviewed Sahihayn records carry
  `{ text: "صحيح", by: "<collection>", … }` as the package treats them as approved; a pending record
  carries no grade (`docs/DECISIONS.md` D-2, D-5).
- **New clients** (browser extension, Android share target, WordPress plugin, mobile keyboard): all call
  the stable versioned API `POST /api/v1/review`. The response schema is defined once with zod in
  `src/core/types.ts` and exported; `docs/API.md` is generated from it (`npm run docs:api`) and is
  the contract a client builds against. CORS is configured by an env allowlist (empty in the MVP).
- **New LLM provider**: everything goes through `LlmPort` (an interface in core, declared in
  `src/core/review.ts`). Swapping providers touches only `src/llm/`.
- **Other UI languages**: all strings live in `src/i18n/ar.ts`. No hard-coded UI text in components.

### Core data contracts (keep these names)

```ts
type ContentKind = "quran" | "hadith" | (string & {});          // open union
type Status = "MATCH" | "DIFFERS" | "NOT_FOUND" | "NEEDS_SPECIALIST" | "ERROR";
type ContentLevel = "A" | "B" | "C" | "D";

interface SourceRecord {
  id: string;                    // stable: "quran:2:153", "bukhari:1", "bukhari:402.2" (split entry), "muslim:4927" (Muslim: source hadithnumber)
  kind: ContentKind;
  collection: string;            // "quran" | "bukhari" | "muslim" | …
  exactText: string;             // unmodified display text
  searchText: string;            // normalized, for retrieval only
  searchVariants?: Array<{ label: string; text: string }>;  // other normalized spellings, retrieval only (Quran: "uthmani")
  matnText?: string;             // verbatim part of exactText, only when reliably separable
  // number: null = no citation number in the source data. subNumber: full source value (e.g. "1907.01")
  citation: { display: string; surah?: number; ayah?: number; number?: string | null; subNumber?: string; book?: string; chapter?: string };
  sourceName: string;
  sourceUrl?: string;
  edition: string;
  license: string;
  reviewStatus: "reviewed" | "pending";
  grade?: { text: string; by: string; sourceRef: string };
}

// A record as it leaves the API (docs/DECISIONS.md D-17): searchText, searchVariants and matnText
// are retrieval keys and never reach a client. Built by toApiRecord from a list of allowed fields.
type ApiSourceRecord = Omit<SourceRecord, "searchText" | "searchVariants" | "matnText">;

interface ReviewItem {
  id: string;
  span: { start: number; end: number; text: string };          // exact span in the user's draft
  claimedKind: ContentKind | "unclear_attribution" | "interpretive_claim";
  // parsed: ParsedReference from src/core/references (type "quran" | "hadith" | "unknown", `partial?`)
  citedReference?: { raw: string; parsed?: ParsedReference; span?: { start: number; end: number } };
  status: Status;
  contentLevel: ContentLevel;
  reasonCode: string;            // machine-readable reason, e.g. "REF_MISMATCH_AYAH"
  reasonAr: string;              // deterministic Arabic sentence
  // At most REVIEW_LIMITS.MAX_EVIDENCE_PER_ITEM occurrences; reasonAr counts the rest. Empty for ERROR.
  evidence: Array<{ record: ApiSourceRecord; score: number; diff?: DiffOp[]; ayahRange?: [number, number] }>;
  explanation?: { text: string; generated: true };             // optional LLM text, always labeled
  extractedBy: Array<"regex" | "llm" | "manual">;
}

interface ReviewResult {
  apiVersion: "1";
  corpusVersion: string;         // from data/corpus/manifest.json
  // The collections that were searched: those of the corpus whose kind has a registered matcher.
  // ["quran"] until the hadith matcher is registered, then ["quran", "bukhari", "muslim"].
  coverage: string[];
  items: ReviewItem[];
  summary: Record<Status, number>;
  warnings: string[];            // "LLM_UNAVAILABLE_REGEX_ONLY", "ITEM_LIMIT_REACHED"
}
```

**Coverage must be true.** A collection the corpus holds but no matcher searches is never named in
a result, in a reason sentence or in the UI (section 2, rules 1 and 3). The UI reads the covered
sources from the API (`coverage` of a result or of `GET /api/v1/health`); it never hard-codes them.

### Pipeline (the order is fixed)

```
draft
 → extract: regex extractor (always) + LLM extractor (if available), in parallel
 → validate: every extracted span (regex or LLM) must exist verbatim in the draft; drop the rest
 → merge + dedupe spans, then the item limit
 → parse cited references deterministically (no LLM)
 → retrieve candidates across ALL kinds (a "hadith" may actually be a verse)
 → score + align against exactText
 → status rules (pure function, unit-tested)
 → word diff against exactText, for the evidence that is returned (D-17: the rules do not read it)
 → optional grounded explanation (LLM), validated
 → ReviewResult, validated against ReviewResultSchema before it leaves the API
```

## 7. Tech stack

- Next.js (App Router) + TypeScript (strict) + Tailwind CSS. Package manager: npm.
- zod for every schema crossing a boundary (API, LLM output, corpus files).
- An LLM provider with structured output, called only from the server. The provider is configurable
  by env vars (`LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY`). Check the installed SDK's current docs
  before writing calls; do not rely on memory for SDK APIs.
- Search: in-memory index built from `data/corpus` (normalized exact substring + word n-gram
  inverted index for fuzzy candidates). No vector DB, no external DB in the MVP.
- Diff: word-level (e.g., the `diff` package), mapped back to original text through offset maps.
- Tests: vitest. Hosting: Vercel or equivalent (any provider that runs Next.js server routes).
- PWA: web manifest + icons + minimal service worker (cache the app shell only; never cache drafts or API responses).

## 8. UI identity

- RTL Arabic, mobile-first, then desktop. `lang="ar" dir="rtl"`.
- Colors: ink `#0F2A2E` (dominant), vermilion accent `#C8553D`, light tint `#EEF4F2`.
  Status colors: MATCH `#2E7D5B`, DIFFERS `#C98414`, NOT_FOUND `#737D82`, NEEDS_SPECIALIST `#5358C2`.
  Status is never conveyed by color alone (always label + icon).
- Fonts: IBM Plex Sans Arabic (UI), Amiri (quotes and Quran text). The KFGQPC Hafs font is not
  used (decided 2026-10-03, `docs/DECISIONS.md` D-19): it has no glyph for «آ» (U+0622), which our
  everyday-spelling text (section 5) has in 1286 ayat, and its licence forbids modifying the file.
  The Quran font is one CSS token, `--font-quran` in `src/app/globals.css`; do not set it elsewhere.
- Motif: a dashed "trace" line from a quote to its source card.
- Wording: the tool's own sentences and labels never use «صحيح» for a text or a reference, because
  it reads as a judgment on authenticity (`docs/DECISIONS.md` D-12 item 10, D-18). The source's
  text is «نص المصدر», its reference «المرجع في المصدر». Book titles («صحيح البخاري») and a grade
  quoted from a record with its attribution are not the tool's own words.

## 9. Conventions

- Small commits with clear messages. Conventional Commits.
- Every core function has unit tests. The status rules have table-driven tests covering every branch.
- No secrets in the repo. `.env.example` lists the variables. Never commit `.env*`.
- Never silently rewrite the user's draft.
- Never add features outside the current prompt's scope. List ideas in `docs/BACKLOG.md` instead.
- A religious-content decision the prompt leaves open is researched, decided and documented by the
  agent, as set out below. It is never left open for the owner.

### Decisions on religious content (decided by the owner, 2026-10-03, `docs/DECISIONS.md` D-16)

When a task leaves open a question about religious content or about how a source is handled (which
text is shown, how a reference is cited, which records may produce `MATCH`, a spelling or an alias,
a label of an evaluation case), **do not stop and do not hand the question to the owner.** Work as a
specialist in the Islamic sciences works: no decision without first examining the evidence.

1. **Research first.** Read the question in the sources the scientific package approves: the Quran
   text of the King Fahd Complex and quranpedia.net; dorar.net (hadith, tafsir, aqeedah, fiqh,
   history); the editions of the books of the Sunnah on shamela.ws; and the recognised works of the
   discipline concerned (for example Ibn al-Salah's «المقدمة» for hadith terminology, al-Suyuti's
   «الإتقان» for the sciences of the Quran). Fetch the text; never rely on memory for a wording, a
   number, a grade or a scholar's statement (section 2, rule 9).
2. **Test where a test is possible.** Compare with a second edition, measure on the corpus, run the
   check on every record it touches. One digital copy is one witness: before two sources are
   counted as two, check that one does not copy the other.
3. **Decide, implement, and test.** Choose the option the evidence supports. When the evidence is
   not enough to choose, the decision is the conservative one (abstain, keep the record pending,
   `NEEDS_SPECIALIST`), and it is recorded as a decision, not left as a question.
4. **Document it in `docs/DECISIONS.md` as closed**: the question, the options weighed, the
   decision, the sources with links and the words quoted from them, what was measured, and the
   limits of the check. No entry is written as "open", "pending" or "for the owner's review".
5. **Report it** in the summary of the task: one line per decision, with its D-number.

What this does not change:

- Section 2 stays non-negotiable. The agent decides how the tool handles texts and references. It
  never grades a hadith, never interprets a verse, never issues a ruling, never edits a source text,
  and never states a grade that is not quoted from a source with its attribution.
- Honest labels. A decision made this way is an AI tool's documented source check, not a scholar's
  review. An approval is recorded in `data/review/reviewed.json` under the agent's name with its
  evidence, never under the owner's name.
- Decisions the owner has already made stay as they are unless the owner changes them (for example
  D-9: a spelling error never ends `MATCH`; «داود» and «إذن» stay unbridged).
- What only the owner can do stays with the owner: accounts, keys and deployment, the code licence,
  screenshots, and the submission itself.

## 10. Out of scope (MVP)

Fatwas, tafsir, hadith grading by the model, paraphrase-as-quote, OCR, audio/video, translation,
accounts, dashboards, numeric "reliability scores" for a draft, browser extension, keyboard.
(Extension points exist; implementations are future work.)
