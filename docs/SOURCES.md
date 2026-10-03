# Azw — source register

Status of this document: **data preparation phase.** The Quran, Bukhari and Muslim collections were
approved by the project owner on 2026-10-02 (reviewer log in section 5). The hadith approvals cover
only records with no reported issue; the excluded and held records, and every other decision, are
**not** approved and keep `reviewStatus: "pending"` until the owner records an approval in
`data/review/reviewed.json` (see [Human review](#5-human-review--awaiting-approval)).

Authoritative machine-readable register: `data/corpus/manifest.json` (URLs, versions, licenses,
numbering, counts, checksums, review status). This file explains it and logs what was checked.

## 1. Sources

### 1.1 Quran — Quranpedia.net, mushaf 1 (Hafs)

| | |
|---|---|
| Source | Quranpedia.net — «مصحف حفص», mushaf id 1. Source description: «القرآن الكريم برواية حفص عن عاصم، موافق لطبعة مجمع الملك فهد لطباعة المصحف الشريف» |
| URL | <https://quranpedia.net> — dumps: <https://api.quranpedia.net/dumps> — field docs: <https://api.quranpedia.net/> |
| File | `mushafs-1.json.gz` → `data/raw/quranpedia/mushafs-1.json` (schema `/v1/mushafs/1`) |
| Version | Dump manifest `2026-10-02`; version stated inside the JSON file `2026-09-30`; `LICENSE.md` version `2026-10-01` |
| License | Quranpedia.net Data License (`data/raw/quranpedia/LICENSE.md`) |
| Numbering | `quran:<surah>:<ayah>`, Hafs (Kufan) count: 114 surahs, 6236 ayat. Bismillah is not part of the ayah text except al-Fatiha 1 |
| Corpus file | `data/corpus/quran.json` |
| Used fields | `surahs[].id`, `surahs[].name`, `ayahs[].number`, `ayahs[].text`. Other fields (page, juz, hizb, markers, options) are not imported |

**Terms as stated by the source** (LICENSE.md, verified against the copy inside the JSON file):
free to use inside apps, websites and research tools with no attribution required; republishing the
data, in full or in part, as a downloadable database or dataset requires (1) crediting
Quranpedia.net as the source with a link and (2) stating the dump version. The text is continuously
corrected; whoever redistributes a copy is responsible for keeping it current
(`https://quranpedia.net/api/v1/changes?since=<version>`). The third-party licenses listed in
LICENSE.md (Quranic Arabic Corpus — GPL; Quranic Treebank — MIT) cover morphology and i'rab fields,
which are **not** in the mushaf file and are not used here.

**Attribution used by this repository** (the repo is public and contains the data, so the
republishing condition applies):

> Quran text: Quranpedia.net (<https://quranpedia.net>), mushaf 1 «مصحف حفص», dump version 2026-10-02
> (file version 2026-09-30).

**Redistribution:** permitted with the credit above → raw and derived Quran files are tracked in Git.

#### Second text, for search only — Quranpedia.net, mushaf 2 (Hafs, Uthmani script)

| | |
|---|---|
| Source | Quranpedia.net — «مصحف حفص نسخة نصية», mushaf id 2. Source description: «المصحف الكريم برواية حفص عن عاصم بالخط العثماني من إصدار مجمع الملك فهد لطباعة المصحف الشريف، غير موافق للمطبوع» |
| File | `mushafs-2.json.gz` → `data/raw/quranpedia/mushafs-2.json` (schema `/v1/mushafs/2`), downloaded 2026-10-03 |
| Version | Dump manifest `2026-10-02` (the same manifest as mushaf 1); version stated inside the JSON file `2026-10-03` |
| License | The same Quranpedia.net Data License; the license text inside the file equals the one in `mushafs-1.json` |
| Used fields | `surahs[].id`, `ayahs[].number`, `ayahs[].text` |
| Use | Builds `searchVariants` (label "uthmani") of each Quran record, so that an ayah pasted in Uthmani script is found. **Never displayed, never diffed, never cited.** The displayed text stays mushaf 1 |
| Package basis | «المرجعية والحزمة العلمية», Quran row: «النص القرآني بالرسم والنص المعتمد … (طبعة مجمع الملك فهد أو ترجماته أو الواردة في: quranpedia.net)» |

- Same riwayah and ayah numbering as mushaf 1: 114 surahs, 6236 ayat, the same `<surah>:<ayah>` keys
  (the build stops otherwise).
- «غير موافق للمطبوع» is the source's wording. Which differences from the printed mushaf it means is
  not stated in the files used here.
- The upstream checksum problem of mushaf 1 (section 3.1) applies to this file too.
- The credit above covers it; when republishing, name mushaf 2 and its file version as well.

### 1.2 Hadith — fawazahmed0/hadith-api (Sahih al-Bukhari, Sahih Muslim)

| | |
|---|---|
| Source | <https://github.com/fawazahmed0/hadith-api>, editions `ara-bukhari`, `ara-muslim` |
| Version | Commit `df57907be35291c91ad6a6691180e22ca9920784` (committed 2026-06-03, per the GitHub API) |
| Files | `editions/ara-bukhari.min.json`, `editions/ara-muslim.min.json` → `data/raw/hadith-api/` |
| License | The Unlicense (public-domain dedication) — LICENSE file read at that commit |
| Attribution | Not required by the license. Credited here and in the manifest |
| Corpus files | `data/corpus/bukhari.json`, `data/corpus/muslim.json` |
| Import | Through `HadithSourceAdapter` (`scripts/lib/hadith-adapter.ts`); replacing the source means writing another adapter |

**Numbering**

- **Bukhari:** `id = bukhari:<hadithnumber>`. `citation.number` = integer part of `hadithnumber`
  (1–7563). In this edition `hadithnumber` and `arabicnumber` are always equal. 26 source entries
  have a decimal number (e.g. `402.2`); they keep the id `bukhari:402.2`, cite number `402`, and
  store `402.2` in `citation.subNumber`.
- **Muslim:** `id = muslim:<hadithnumber>` (the source's running number 1–7563, **not** a citation
  number). `citation.number` = integer part of `arabicnumber` (Fuad Abd al-Baqi, 1–3033);
  `citation.subNumber` = the full `arabicnumber` string as in the source (e.g. `1907.01`).
  Entries without `arabicnumber` have `citation.number = null`, no grade, and always stay pending.
- `citation.book` = the source's section number, only where the source names that section. Section
  names in the source are English only; no Arabic book titles were added.

**Grade policy (AGENTS.md §6):** every record with a citation number carries
`grade = { text: "صحيح", by: "صحيح البخاري" | "صحيح مسلم", sourceRef: <citation> }`. This states the
collection, not a judgment by the tool. The source's own `grades` arrays are empty for both editions.

**Redistribution:** permitted → raw and derived hadith files are tracked in Git.

**Caveat for the reviewer:** the Unlicense is the repository's license. The repository does not say,
in the files used here, which printed edition or upstream site the Arabic text was digitized from.

### 1.3 Dorar hadith API — verification only

| | |
|---|---|
| Source | الدرر السنية — الموسوعة الحديثية, <https://dorar.net> |
| Documentation | <https://dorar.net/article/389> |
| Endpoint | `https://dorar.net/dorar_api.json?skey=<query>` |
| Terms | The documentation offers the service to site owners for showing search results; the site footer states «جميع الحقوق محفوظة لمؤسسة الدرر السنية» |
| Use here | Spot-check of sampled Sahihayn records only. Not a corpus, not a runtime dependency |
| Storage | Responses cached in `data/raw/dorar-cache/`, **gitignored**. Tracked files hold no Dorar hadith text beyond short quoted evidence: the grade line per sampled record (`data/review/dorar-verification.json`) and the few differing words quoted in `data/review/held-records.json` |

The verification script adds `&s[]=<book id>` (6216 = صحيح البخاري, 3088 = صحيح مسلم) to restrict
results to one book. That parameter is the Dorar site-search filter; article 389 documents only `skey`.

## 2. Text handling

- `exactText` is the source text. The only change made anywhere is stripping leading U+FEFF (BOM)
  characters from Quran ayat, as AGENTS.md §5 requires. Raw files are never modified.
- Quran `exactText` keeps the pause marks (U+06D6–U+06DC), the rub‘ al-hizb sign ۞ (U+06DE) and the
  sajdah sign ۩ (U+06E9) that the source embeds in the ayah text.
- Hadith `exactText` keeps the source's direction marks (U+200F), punctuation, and the `{ }` braces
  the source puts around Quran quotations.
- `searchText` is `exactText` at normalization level "search" (`src/core/normalize`; rules in
  `docs/ARCHITECTURE.md`, "Normalization"). It is for retrieval only and is never displayed.
- `searchVariants` (Quran records only, label "uthmani") is the same ayah from mushaf 2, normalized
  with `UTHMANI_VARIANT_OPTIONS`. For retrieval only; never displayed.
- `matnText` (optional) is stored only for records that are a single directly quoted prophetic
  saying; the rule is in `scripts/lib/matn.ts`. It is always a verbatim substring of `exactText`.
  It is a heuristic for locating the quoted speech and is listed for review below.
- Empty source texts are skipped and reported by number (section 3).

## 3. Automated findings — corpus build

<!-- AUTO:BUILD:START -->
_Generated by `scripts/build-corpus.ts` — corpus version `p2-0790f19e4c07`. Do not edit by hand._

| Collection | Raw entries | Records | Skipped (empty) | Null citation no. | With matnText | Reviewed | Pending |
|---|---|---|---|---|---|---|---|
| quran | 6236 ayat / 114 surahs | 6236 | 0 | — | — | 6236 | 0 |
| bukhari | 7589 | 7580 | 9 | 0 | 1016 | 6940 | 640 |
| muslim | 7563 | 7360 | 203 | 148 | 1110 | 7169 | 191 |

**Quran**
- 6124 ayat started with U+FEFF (BOM); 6125 such characters were stripped (leading only). No other change to the text.
- `searchText` = `exactText` at normalization level "search" (`src/core/normalize`), filled for every record. Quran records keep honorific phrases (`docs/DECISIONS.md` D-7).
- `searchVariants` label "uthmani" = the same ayah in Quranpedia mushaf 2 (`data/raw/quranpedia/mushafs-2.json`, file version `2026-10-03`), normalized with `UTHMANI_VARIANT_OPTIONS`. Filled for 6236 ayat; for search only, never displayed. Equal to `searchText` in 3137 ayat.
- Mushaf 2 against mushaf 1, leaving out ا و ي ء and spaces: the remaining letters differ in 81 ayat (e.g. 2:164, 2:187, 2:245, 2:274, 3:27, 3:113, 3:190, 4:15). Full list: `data/corpus/build-report.json`.
- Mushaf 2 upstream sha256 `a5ff0980d2182f2f12d631523fad279de0bf2728cb664607dda75988cb619362` covers `mushafs-2.json.gz`. Local `.gz`: matches manifest sha256 = **false**; decompressed content identical to local JSON = **true**.
- Marks embedded in the ayah text (kept in `exactText`): U+0670×3215, U+06DB×12, U+06D6×1682, U+06D7×603, U+06DA×1972, U+06D9×68, U+06DE×199, U+06D8×22, U+06E9×15, U+06DC×5.
- Upstream sha256 `abbd7ada76a50fd02fd9b49043aa8a0428d30408c5065d5d4fed39bb8f9af368` covers `mushafs-1.json.gz` (403040 bytes), not the local JSON.
- Local `.gz` (sha256 `b857c58206d219d1af333fc3eb8359c30e8b07c7386f88692efcb0744dd98fe8`, 403040 bytes): matches manifest sha256 = **false**; decompressed content identical to local JSON = **true**.
- Version labels: dump manifest `2026-10-02`, inside the JSON file `2026-09-30`, LICENSE.md `2026-10-01`.

**bukhari** (ara-bukhari @ df57907)
- Skipped empty texts (9), source hadithnumber: 5710–5712, 5774–5775, 6074–6075, 6174–6175.
- Records without a citation number (0), kept pending, no grade: none.
- Split (decimal) source entries (26): 402.2, 690.2, 774.2, 1132.2, 1199.2, 1228.2, 1390.2, 1390.3, 2214.2, 2239.2, 2240.2, 2437.2, 3562.2, 3595.2, 3756.2, 3963.2, 4931.2, 4945.2, 5032.2, 5037.2, 5051.2, 5441.2, 5470.2, 5944.2, 6895.2, 6908.2.
- Records containing U+FFFD/U+FFFC (text damaged upstream) (16): 834, 1748, 2898, 3007, 3304, 3733, 4214, 4323, 4569, 4669, 4822, 4913, 5167, 6522, 7370, 7555.
- Same text block repeated under several numbers: 291 groups covering 596 records (e.g. bukhari:272 = bukhari:273; bukhari:299 = bukhari:300 = bukhari:301; bukhari:329 = bukhari:330; bukhari:395 = bukhari:396; bukhari:408 = bukhari:409). Full list: `data/corpus/build-report.json`.
- Held outside a collection approval after the sample check (2): bukhari:2075, bukhari:2819 — reasons in `data/review/held-records.json`.
- Distinct citation numbers: 7554. matnText stored for 1016 records (qala-qala-rasul: 264, an-al-nabi-qala: 374, anna-rasul-qala: 241, samitu-yaqul: 137).

**muslim** (ara-muslim @ df57907)
- Skipped empty texts (203), source hadithnumber: 1–2, 5–14, 16–92, 128, 209, 248, 384, 388, 637–638, 794, 852–853, 881, 1221–1222, 1251, 1332, 1351, 1355, 1366, 1428–1429, 1648, 1719, 1778, 2295, 2339, 2381, 2810, 3038–3039, 3262, 3463, 3525, 3836, 3845–3846, 4436, 5114–5115, 5214, 5384, 5393, 5541–5545, 5637, 5995–6003, 6144, 6527–6529, 6701–6702, 6792, 6844–6845, 7016, 7020, 7144, 7256, 7301, 7317, 7325, 7329–7343, 7371, 7447–7463, 7513–7520, 7557.
- Records without a citation number (148), kept pending, no grade: 3–4, 15, 1220, 1350, 1354, 1365, 1718, 2045–2046, 2057–2058, 2093, 2100–2101, 2104–2105, 2149–2150, 2225, 2232, 2243, 2892–2893, 2978–2979, 3023, 3028–3029, 3087, 3092–3093, 3108–3109, 3222–3229, 3499, 3695, 3725–3727, 3730, 3792, 3842, 4251–4252, 4435, 4504–4505, 4521–4522, 4680–4681, 4725–4726, 4747–4748, 4780–4781, 4819–4820, 4905–4906, 4968–4971, 5112–5113, 5204, 5207–5208, 5519, 5521–5522, 5539–5540, 5556–5557, 5569–5572, 5669–5670, 5762, 5764, 5826–5827, 5885–5886, 5935, 5968, 5971, 5990–5991, 6015, 6179–6180, 6200–6201, 6410, 6414–6415, 6505–6506, 6544–6545, 6625–6626, 6711–6712, 6855–6856, 6879, 6918–6919, 6929, 6961–6962, 6981, 6989–6990, 7017–7018, 7076–7077, 7080–7081, 7111–7112, 7138, 7141, 7302, 7319, 7354–7355, 7368, 7498–7499, 7512, 7555.
- Split (decimal) source entries (0): none.
- Records containing U+FFFD/U+FFFC (text damaged upstream) (16): 305, 403, 1522, 2363, 2626, 2990, 4087, 4607, 5519, 5520, 5770, 6165, 6270, 6364, 6459, 7512.
- Same text block repeated under several numbers: 67 groups covering 137 records (e.g. muslim:919 = muslim:931; muslim:2045 = muslim:2046; muslim:2057 = muslim:2058; muslim:2093 = muslim:2094; muslim:2100 = muslim:2101). Full list: `data/corpus/build-report.json`.
- Held outside a collection approval after the sample check (5): muslim:2957, muslim:3600, muslim:3944, muslim:6172, muslim:7314 — reasons in `data/review/held-records.json`.
- Distinct citation numbers: 2962. matnText stored for 1110 records (anna-rasul-qala: 325, qala-qala-rasul: 399, an-al-nabi-qala: 237, samitu-yaqul: 149).
<!-- AUTO:BUILD:END -->

### 3.1 Raw-file provenance (`scripts/verify-raw.ts`, run 2026-10-02)

| Check | Result |
|---|---|
| `ara-bukhari.min.json` byte-identical to the file at commit `df57907` | OK — sha256 `f887d8724f75fb6e1d5d29342a173af5346ad9b933173c85e6e3cb570063ea33` |
| `ara-muslim.min.json` byte-identical to the file at commit `df57907` | OK — sha256 `2cb296f3455ff8a3da9f6a0ca3de75da675788b2fb446ad316df297838e48217` |
| `LICENSE` at commit `df57907` is the Unlicense | OK |
| Quranpedia live manifest still lists the same version and sha256 as the local manifest | OK |
| Downloaded `mushafs-1.json.gz` byte size equals manifest (403040) | OK |
| Decompressed `mushafs-1.json.gz` byte-identical to local `mushafs-1.json` | OK — sha256 `242df6d3636981d22fb3661a7ed4c58d5ec7c726c27ef9085328696ecd780f54` |
| Downloaded `mushafs-1.json.gz` sha256 equals manifest sha256 | **FAIL** — manifest `abbd7ada76a50fd02fd9b49043aa8a0428d30408c5065d5d4fed39bb8f9af368`, downloaded file `b857c58206d219d1af333fc3eb8359c30e8b07c7386f88692efcb0744dd98fe8` |

The checksum supplied in the Quranpedia manifest covers the **compressed** `.gz`, not the local JSON,
so it cannot be compared with `mushafs-1.json` directly. The `.gz` served on 2026-10-02 has the
manifest's byte size and decompresses to exactly the local JSON, but its sha256 is not the one in
the manifest. Cause not established. **Unresolved — see section 5.**

`mushafs-2.json.gz` (added 2026-10-03) shows the same pattern: byte size equals the manifest (414537),
the decompressed file is byte-identical to the local `mushafs-2.json` (sha256
`69f46eb4c3f8b8c23f237c7c0ba926e1faa069ff79e5054c7e5bd2452e0b2473`), but the `.gz` sha256 served
(`cc9da99d6683de55bfebebc0cd7cd9c824982c7d3c8fd962203e9391c9458df1`) is not the manifest's
(`a5ff0980d2182f2f12d631523fad279de0bf2728cb664607dda75988cb619362`). `npm run verify:raw` therefore
reports two failed checks, one per mushaf file.

### 3.2 Quran spelling probe (`scripts/probe-quran-spelling.ts`)

The text is in everyday (imla'i) spelling with full diacritics — e.g. «الصَّلَاةَ», «الزَّكَاةَ»,
«السَّمَاوَاتِ», «يَا أَيُّهَا». Removing diacritics and the dagger alif (U+0670, present in 2352
ayat) gives the usual written form for «الرحمن», «ذلك», «هذا», «على». But the text also keeps some
mushaf spellings that removing diacritics will **not** bridge:

| Feature in the source text | Distinct forms / occurrences | Examples (first reference) |
|---|---|---|
| Open ta where everyday spelling writes ة | 11 / 36 | رحمت (2:218), نعمت (2:231), امرأت (3:35), فطرت (30:30), سنت (8:38) |
| Hamza on the line before waw | 31 / 74 | رءوف (2:207), رءوسكم (2:196), برءوسكم (5:6) — the list also includes forms that are ordinary spelling, e.g. جاءوا |
| Hamza on ya seat before waw | 30 / 47 | مسئولا (17:34), يئوسا (17:83) — the list also includes ordinary forms, e.g. يستهزئون |
| Hamza under final alif | 11 / 18 | الملإ (2:246), نبإ (6:34) |
| داوود with two waws | 3 / 16 | داوود (2:251) |
| مائة / مائتين | 2 / 10 | مائة (2:259) |
| Pause / section signs as separate tokens | 9 / 4578 | ۚ ۖ ۗ ۞ ۩ |

AGENTS.md §5 assumed «no second text is needed». That holds for most of the text but not for these
forms. No normalization rule was added for them: `searchText` (filled since corpus `p1-…`) uses the
general normalization only, which bridges «الملإ» / «نبإ» as a side effect and none of the other
forms (`docs/ARCHITECTURE.md`, "What normalization does not bridge").

**Decided 2026-10-03** (section 5 item 3, `docs/DECISIONS.md` D-9). A wider scan made for the
owner's review (`docs/QURAN_SPELLING_REVIEW.md`) found more forms than the table above: open-ta
words with a prefix (بنعمت، لسنت، ومعصيت …), «مرضات», «غيابت», «بينت», «جمالت», and «أَيُّهَ» for
«أيها». The approved pairs are in `data/aliases/quran-spelling-variants.json` (66 word forms, each
bound to its ayat). The scan looked for known patterns only; it was not a word-by-word comparison
with a second text, and it did not check words the mushaf joins or splits differently.

## 4. Automated findings — Dorar spot-check

Method (`scripts/verify-hadith-dorar.ts`): 30 records per collection, drawn with a fixed seed from
the records that have a citation number and a `matnText` of at least 5 words. The first 8 words of
the matn (diacritics removed) are sent as the query, restricted to the collection's book. A record is
**CONFIRMED** when a result from the same collection has the same number and at least 80% of our matn
words appear, in order, in its text. `NUMBER_DIFFERS`, `TEXT_DIFFERS`, `INCONCLUSIVE` and `ERROR` are
flags for human review; a missing search result is not treated as proof of wrong data.

Limits of this check: the sample covers only short, directly quoted sayings (the records with
`matnText`). It does not exercise narratives, records without a citation number, the split
Bukhari entries, or the shared-text groups. Dorar often lists the same matn under several numbers
of the same book; CONFIRMED means our number is one of them.

<!-- AUTO:DORAR:START -->
_Generated by `scripts/verify-hadith-dorar.ts` on 2026-10-02T18:12:46.903Z — corpus `p0-a6d2d36b84e8`, seed 20261002, 30 records per collection. Do not edit by hand._

| Collection | Eligible pool | Sampled | CONFIRMED | NUMBER_DIFFERS | TEXT_DIFFERS | INCONCLUSIVE | ERROR |
|---|---|---|---|---|---|---|---|
| bukhari | 986 of 7580 | 30 | 30 | 0 | 0 | 0 | 0 |
| muslim | 1076 of 7360 | 30 | 30 | 0 | 0 | 0 | 0 |

**bukhari — confirmed (30):** bukhari:5026 (no. 5026), bukhari:6577 (no. 6577), bukhari:73 (no. 73), bukhari:7117 (no. 7117), bukhari:6429 (no. 6429), bukhari:2972 (no. 2972), bukhari:7079 (no. 7079), bukhari:703 (no. 703), bukhari:4991 (no. 4991), bukhari:7053 (no. 7053), bukhari:5178 (no. 5178), bukhari:2682 (no. 2682), bukhari:3841 (no. 3841), bukhari:3433 (no. 3433), bukhari:80 (no. 80), bukhari:1035 (no. 1035), bukhari:6439 (no. 6439), bukhari:3244 (no. 3244), bukhari:4919 (no. 4919), bukhari:2271 (no. 2271), bukhari:2840 (no. 2840), bukhari:3501 (no. 3501), bukhari:6498 (no. 6498), bukhari:2288 (no. 2288), bukhari:3770 (no. 3770), bukhari:756 (no. 756), bukhari:3343 (no. 3343), bukhari:2819 (no. 2819), bukhari:4478 (no. 4478), bukhari:586 (no. 586)

**bukhari — flagged for review (0):** none

**bukhari — confirmed, but Dorar's grade line is not our record's grade (1):**
- `bukhari:2819` (citation no. 2819) — Dorar: «[معلق]». Needs the owner's review.

**muslim — confirmed (30):** muslim:4875 (no. 1881), muslim:6619 (no. 2601), muslim:7211 (no. 2866), muslim:6623 (no. 2601), muslim:5377 (no. 2062), muslim:6682 (no. 2622), muslim:850 (no. 385), muslim:6654 (no. 2612), muslim:1820 (no. 777), muslim:4468 (no. 1710), muslim:6141 (no. 2370), muslim:6299 (no. 2446), muslim:283 (no. 101), muslim:6814 (no. 2680), muslim:6973 (no. 2752), muslim:2472 (no. 1068), muslim:361 (no. 141), muslim:2273 (no. 982), muslim:1779 (no. 759), muslim:7130 (no. 2822), muslim:5755 (no. 2210), muslim:5642 (no. 2158), muslim:1242 (no. 557), muslim:6131 (no. 2365), muslim:1835 (no. 786), muslim:1417 (no. 626), muslim:2495 (no. 1079), muslim:7471 (no. 533), muslim:1491 (no. 656), muslim:6979 (no. 2755)

**muslim — flagged for review (0):** none

**muslim — confirmed, but Dorar's grade line is not our record's grade (0):** none
<!-- AUTO:DORAR:END -->

## 5. Human review — awaiting approval

The Quran, Bukhari and Muslim collections are approved (items 1, 5, 7). To approve, the owner states it explicitly; the approval is
then written to `data/review/reviewed.json` (who, when, scope) and the corpus is rebuilt.

| # | Item | What to look at | Decision |
|---|---|---|---|
| 1 | Quran collection | Counts and checksums above; spot-read ayat in `data/corpus/quran.json` against a printed mushaf | ☑ approved for text matching, 2026-10-02 (see reviewer log) |
| 2 | Quran checksum mismatch | Section 3.1: the `.gz` sha256 differs from the manifest although the content equals the local JSON. Accept as is, or ask Quranpedia (quranpedia.help@gmail.com) | ☐ pending — **unresolved**, cause not established; not closed by the Quran approval |
| 3 | Quran search spelling | Section 3.2: how to bridge mushaf spellings (رحمت، رءوف، مسئولا، الملإ) — folding rules in normalization, a reviewed variant list, or a second text | ☑ decided 2026-10-03: a reviewed variant list bound to ayat (done, `data/aliases/quran-spelling-variants.json`) **and** a second, Uthmani-script search text (done, Quranpedia mushaf 2 → `searchVariants`). No folding rules in the main search text. See reviewer log |
| 4 | Signs inside Quran `exactText` | ۞ (199 ayat) and ۩ (15 ayat) are in the source text and are kept. Keep them in the displayed text, or strip them for display | ☐ pending |
| 5 | Bukhari collection | Section 3 and the Dorar results; the Sahihayn grade policy | ☑ approved for text matching, 2026-10-02, on the sample checks; excluded and held records stay pending (see reviewer log) |
| 6 | Bukhari split entries (26) | Cited by the integer part (e.g. `402.2` → no. 402). The task said `citation.number` uses `hadithnumber`; the integer part was used so that no decimal is shown as a hadith number. Excluded from a collection-level approval | ☐ pending |
| 7 | Muslim collection | Section 3 and the Dorar results; numbering by `arabicnumber` | ☑ approved for text matching, 2026-10-02, on the sample checks; excluded and held records stay pending (see reviewer log) |
| 8 | Muslim records without a citation number (148) | Includes 3 from the introduction (source numbers 3, 4, 15). Kept, pending, no grade, cannot be approved until a number exists. Note: Muslim's introduction is outside the Sahih proper | ☐ pending |
| 9 | Damaged text (16 Bukhari, 16 Muslim) | Records containing U+FFFD/U+FFFC where the upstream file lost a character. Kept unmodified; excluded from a collection-level approval; no `matnText` | ☐ pending |
| 10 | Shared-text groups | The source repeats one text block under several, mostly consecutive, numbers (e.g. `bukhari:299` = `300` = `301`), so the block cannot be pinned to one number. Excluded from a collection-level approval | ☐ pending |
| 11 | Skipped empty entries | 9 Bukhari and 203 Muslim source entries have no text, so those numbers are absent from the corpus (listed in section 3) | ☐ pending |
| 12 | `matnText` rule | `scripts/lib/matn.ts`: quoted speech only, 4 attribution patterns. 1016 Bukhari / 1110 Muslim records | ☐ pending |
| 13 | Grade withheld without a number | `docs/DECISIONS.md` D-2 | ☐ pending |
| 14 | Surah alternate names | `data/aliases/surahs.json`: `spellingVariants` and `alternateNames` are editorial, not from the source (`scripts/lib/surah-alternates.ts`) | ☐ pending |
| 15 | Dorar flagged records | Any record listed as flagged in section 4, and the 6 records held in `data/review/held-records.json` after the word-for-word comparison (`docs/HADITH_FLAGGED_INVESTIGATION.md`) | ☐ pending — the 6 held records are unresolved |
| 16 | Grade of records Dorar does not grade «صحيح» | `bukhari:2819`: confirmed by number and matn, but Dorar's grade line is «[معلق]» while the record carries the collection grade «صحيح». Held on 2026-10-02 (7th held record), after the collection approval; text and grade unchanged. Also the wider question of the blanket Sahihayn grade — `docs/DECISIONS.md` D-5 | ☐ pending |

### Reviewer log

Recorded from the owner's statements; the machine-readable copy is `data/review/reviewed.json`.

**2026-10-02 — Quran collection approved for Azw's text matching — by the project owner.**

- Method: the owner personally compared the 10 ayat shown in `docs/REVIEW_SHEET.md` with
  «مصحف المدينة النبوية» on 2026-10-02. All 10 matched.
- References compared: الفاتحة 1 (`quran:1:1`), البقرة 26 (`quran:2:26`), البقرة 153
  (`quran:2:153`), البقرة 255 (`quran:2:255`), الأعراف 206 (`quran:7:206`), الإسراء 36
  (`quran:17:36`), الروم 30 (`quran:30:30`), ص 17 (`quran:38:17`), التحريم 10 (`quran:66:10`),
  الإخلاص 1 (`quran:112:1`).
- Extent: the approval covers the collection (6236 records). The hand comparison covered these 10
  ayat; the other 6226 were checked only by the automated counts and consistency checks in section 3.
- Not covered and still pending: the checksum mismatch (item 2, unresolved), search spelling
  (item 3), the ۞/۩ signs (item 4), surah alternate names (item 14), and everything about Bukhari
  and Muslim (items 5–13, 15). (Items 5 and 7 were approved later the same day; see below.)

**2026-10-02 — Bukhari and Muslim collections approved for Azw's text matching — by the project owner.**

- Method: approved on the automated sample checks. The owner did not compare records with a printed
  edition by hand.
- Evidence relied on: raw files byte-identical to hadith-api commit `df57907` (section 3.1); 30 of 30
  sampled records per collection confirmed on Dorar by number and matn (section 4); 12 records per
  collection compared with Dorar word for word (`docs/HADITH_REVIEW_SAMPLE.md`,
  `docs/HADITH_FLAGGED_INVESTIGATION.md`): all 24 numbers agree; Bukhari 8 no word difference, 3
  spelling only, 1 held; Muslim 6 no word difference, 1 spelling only, 5 held.
- Extent: 6941 of 7580 Bukhari records and 7169 of 7360 Muslim records are now reviewed. Still
  pending: 639 Bukhari and 191 Muslim records — damaged text (item 9), Bukhari split entries (item 6),
  shared-text groups (item 10), Muslim records without a citation number (item 8), and the 6 held
  records (item 15).
- Limits: the approval rests on a sample; the other records were not compared with a second text.
  5 of the 12 Muslim records compared word for word are unresolved, and how common such differences
  are in the rest of the collection is unknown. The source does not state which printed edition the
  Arabic text was digitized from.
- Not covered and still pending: items 2–4, 6, 8–15.

**2026-10-02 — after the approval: `bukhari:2819` held (not an owner decision; recorded by the review of P0.1).**

- The Bukhari approval covers «records with no reported issue». A later review found that Dorar's
  grade line for `bukhari:2819` is «[معلق]» (item 16, `docs/DECISIONS.md` D-5), so the record was added
  to `data/review/held-records.json` and is pending again. Reviewed Bukhari records: 6941 → 6940.
- The same review added `.gitattributes` (`data/** -text`): without it Git converted line endings
  of the checksummed files on checkout (`data/raw/quranpedia/LICENSE.md` and the corpus files), which
  breaks the sha256 values in `data/corpus/manifest.json`. The stored blobs were never altered.

**2026-10-03 — Quran search spelling decided (item 3) — by the project owner.**

- Method: the owner marked `docs/QURAN_SPELLING_REVIEW.md` row by row. The source forms and ayah
  numbers in that sheet come from `data/corpus/quran.json`; the everyday forms were proposed by the
  AI assistant from ordinary spelling rules and accepted or rejected by the owner.
- Accepted: all open-ta words (A1, including «جمالت»); all words where everyday spelling writes the
  hamza on a waw (A2); «جاءوا / جاؤوا», «يشاءون / يشاؤون», «باءوا / باؤوا» and their group (A3 rows
  1–3); «مائة / مئة», «مائتين / مئتين»; «أيه / أيها» (24:31, 43:49, 55:31).
- Rejected: «داوود / داود» (the owner writes it as the source does); «إِذًا / إذن»; the forms with
  ئو after a kasra such as «يستهزئون / يستهزؤون» (A3 rows 4–5).
- Result: `data/aliases/quran-spelling-variants.json`, 66 word forms over 150 form–ayah pairs. A pair
  applies only in its listed ayat («لعنت» in 7:38 is a verb and is not listed).
  `scripts/verify-corpus.ts` checks that every source form is a word of each listed ayah.
- Also approved: a second, Uthmani-script search text for Quran records, used for search only and
  never displayed. **Not built yet.** Candidate source found on 2026-10-03: Quranpedia mushaf 2
  «مصحف حفص نسخة نصية» — «برواية حفص عن عاصم بالخط العثماني من إصدار مجمع الملك فهد»، «غير موافق
  للمطبوع» — same publisher and licence as mushaf 1, 114 surahs / 6236 ayat. The owner has not yet
  approved this file as the source.
- Limits: the list is not yet used by any code (no matcher exists). `searchText` and the corpus
  version are unchanged. The scan behind the sheet searched for known patterns only.

**2026-10-03 — Uthmani search text added (item 3) — approved by the project owner.**

- The owner's condition: add it only if it does not go against the approved sources in
  «المرجعية والحزمة العلمية». Checked by the AI assistant against the package's Quran row, which
  accepts «طبعة مجمع الملك فهد» and what is on quranpedia.net and asks for «الرسم … المعتمد».
  Mushaf 2 is from quranpedia.net, issued by the King Fahd Complex, in Uthmani script. The owner did
  not compare the file with a printed mushaf.
- Result: every Quran record has `searchVariants: [{ label: "uthmani", … }]`; corpus version
  `p2-…`. `exactText`, `searchText` and the review status of every record are unchanged.
- Automated checks: 6236 ayat with the same keys as mushaf 1; leaving out ا و ي ء, the letters of
  the two texts are equal in 6155 ayat and differ in 81 (script differences such as «اليل» / «الليل»,
  «التي» / «اللاتي», «يبصط» / «يبسط»; listed in `data/corpus/build-report.json`). No person has read
  these 81.
- Measured on whole-ayah pastes: 6234 of 6236 ayat of quran.com's Uthmani text and 6230 of 6236 of
  the Tanzil Uthmani text are found (`docs/ARCHITECTURE.md`, "The Quran uthmani search variant").
  Other Uthmani encodings were not measured.
- Two normalization options were added for this variant only: `foldHamzaAlef` («ءا» → «ا») and
  `superscriptAlefAsAlef` (U+0670 → «ا», added in review so that «الكتب» is not taken for
  «ٱلۡكِتَٰبُ»). Neither is applied to `searchText`.
- Limits: no matcher uses the variant yet. The checksum mismatch (item 2) now covers both files.
