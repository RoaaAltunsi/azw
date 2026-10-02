# Azw — data review sheet

For: the project owner. Corpus version `p0-a6d2d36b84e8`.

**Review status:** approved by the owner: quran (2026-10-02), bukhari (2026-10-02), muslim (2026-10-02) — 20345 records marked reviewed. Everything else is pending (831 records) and no other decision has been made. The checks below were run by scripts. They show that the files are complete and consistent; they do not show that the texts are correct. Only a person reading them can do that.

Details and full lists: `docs/SOURCES.md`, `data/corpus/build-report.json`.

## 1. Quran

**Source file:** `data/raw/quranpedia/mushafs-1.json` — Quranpedia.net, mushaf 1 «مصحف حفص», from their official dump (manifest version 2026-10-02).

**Checked on every record (passed):**
- 114 surahs and 6236 ayat, numbered without gaps.
- No empty text, no duplicate ids.
- The only change to the text: a hidden BOM character was removed from the start of 6124 ayat.
- The file Quranpedia serves today unpacks to exactly the file you downloaded.

**Checked by sampling:** 10 ayat compared by the owner (2026-10-02). The owner personally compared the 10 ayat listed in docs/REVIEW_SHEET.md with مصحف المدينة النبوية on 2026-10-02; all 10 matched. The other 6226 ayat were checked only by the automated checks above.

**Problems that remain:**
- Quranpedia's published checksum does not match the compressed file they serve (same size, same content after unpacking, different checksum). Unresolved; cause not established.
- Some words keep mushaf spelling that differs from how people type (رحمت، فطرت، امرأت، مسئولا، رءوف، الملإ، داوود). Search will miss them unless this is handled.
- The signs ۞ (199 ayat) and ۩ (15 ayat) are inside the ayah text.
- Three different version dates appear in the source: 2026-10-02 (manifest), 2026-09-30 (inside the file), 2026-10-01 (license).

## 2. Sahih al-Bukhari

**Source file:** `data/raw/hadith-api/ara-bukhari.min.json` — fawazahmed0/hadith-api, edition ara-bukhari, commit df57907.

**Checked on every record (passed):**
- 7589 source entries → 7580 records; 9 entries had no text and were left out.
- No empty text, no duplicate ids, every number within 1–7563.
- Your file is byte-for-byte the file at that commit; the license there is the Unlicense.

**Checked by sampling:** 30 records compared with Dorar; 30 matched in book, number and wording. The sample was taken only from the 986 short quoted sayings, so long narratives and the problem records below were not tested.

**Problems that remain:**
- 596 records share their text with a neighbouring number (291 groups), so the text cannot be tied to one hadith number.
- 26 entries have decimal numbers such as 402.2.
- 16 records have a damaged character.
- 9 hadith numbers are missing because the source text is empty.
- The source does not say which printed edition the text was taken from.

## 3. Sahih Muslim

**Source file:** `data/raw/hadith-api/ara-muslim.min.json` — fawazahmed0/hadith-api, edition ara-muslim, commit df57907.

**Checked on every record (passed):**
- 7563 source entries → 7360 records; 203 entries had no text and were left out (most are the introduction).
- No empty text, no duplicate ids, every citation number within 1–3033 (Fuad Abd al-Baqi numbering).
- Your file is byte-for-byte the file at that commit.

**Checked by sampling:** 30 records compared with Dorar; 30 matched in book, number and wording. Same limit as Bukhari: only the 1076 short quoted sayings were eligible.

**Problems that remain:**
- 148 records have no citation number in the source. They cannot be cited.
- 137 records share their text with another number (67 groups).
- 16 records have a damaged character.
- 71 of the 3033 citation numbers do not appear in the corpus.

## 4. Examples to inspect

### 4.1 Quran — 10 ayat

Source file for all: `data/raw/quranpedia/mushafs-1.json`.

| Record | Reference | Text as stored | Why this one |
|---|---|---|---|
| `quran:1:1` | سورة الفاتحة، الآية 1 | بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ | first ayah; the source had two BOM characters here |
| `quran:2:26` | سورة البقرة، الآية 26 | ۞ إِنَّ اللَّهَ لَا يَسْتَحْيِي أَنْ يَضْرِبَ مَثَلًا مَا بَعُوضَةً فَمَا فَوْقَهَا ۚ فَأَمَّا الَّذِينَ آمَنُوا فَيَعْلَمُونَ أَنَّهُ الْحَقُّ مِنْ رَبِّهِمْ ۖ وَأَمَّا الَّذِينَ كَفَرُوا فَيَقُولُونَ مَاذَا أَرَادَ اللَّهُ بِهَٰذَا مَثَلًا ۘ يُضِلُّ بِهِ كَثِيرًا وَيَهْدِي بِهِ كَثِيرًا ۚ وَمَا يُضِلُّ بِهِ إِلَّا الْفَاسِقِينَ | starts with the ۞ sign that the source embeds in the text |
| `quran:2:153` | سورة البقرة، الآية 153 | يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ | the example ayah named in AGENTS.md |
| `quran:2:255` | سورة البقرة، الآية 255 | اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ | long, well-known ayah with several pause marks |
| `quran:7:206` | سورة الأعراف، الآية 206 | إِنَّ الَّذِينَ عِنْدَ رَبِّكَ لَا يَسْتَكْبِرُونَ عَنْ عِبَادَتِهِ وَيُسَبِّحُونَهُ وَلَهُ يَسْجُدُونَ ۩ | ends with the sajdah sign ۩ |
| `quran:17:36` | سورة الإسراء، الآية 36 | وَلَا تَقْفُ مَا لَيْسَ لَكَ بِهِ عِلْمٌ ۚ إِنَّ السَّمْعَ وَالْبَصَرَ وَالْفُؤَادَ كُلُّ أُولَٰئِكَ كَانَ عَنْهُ مَسْئُولًا | contains «مسئولا» (hamza spelling differs from everyday «مسؤولا») |
| `quran:30:30` | سورة الروم، الآية 30 | فَأَقِمْ وَجْهَكَ لِلدِّينِ حَنِيفًا ۚ فِطْرَتَ اللَّهِ الَّتِي فَطَرَ النَّاسَ عَلَيْهَا ۚ لَا تَبْدِيلَ لِخَلْقِ اللَّهِ ۚ ذَٰلِكَ الدِّينُ الْقَيِّمُ وَلَٰكِنَّ أَكْثَرَ النَّاسِ لَا يَعْلَمُونَ | contains «فطرت» with open ta |
| `quran:38:17` | سورة ص، الآية 17 | اصْبِرْ عَلَىٰ مَا يَقُولُونَ وَاذْكُرْ عَبْدَنَا دَاوُودَ ذَا الْأَيْدِ ۖ إِنَّهُ أَوَّابٌ | contains «داوود» and a dagger alif in «علىٰ» |
| `quran:66:10` | سورة التحريم، الآية 10 | ضَرَبَ اللَّهُ مَثَلًا لِلَّذِينَ كَفَرُوا امْرَأَتَ نُوحٍ وَامْرَأَتَ لُوطٍ ۖ كَانَتَا تَحْتَ عَبْدَيْنِ مِنْ عِبَادِنَا صَالِحَيْنِ فَخَانَتَاهُمَا فَلَمْ يُغْنِيَا عَنْهُمَا مِنَ اللَّهِ شَيْئًا وَقِيلَ ادْخُلَا النَّارَ مَعَ الدَّاخِلِينَ | contains «امرأت» with open ta |
| `quran:112:1` | سورة الإخلاص، الآية 1 | قُلْ هُوَ اللَّهُ أَحَدٌ | short ayah with no marks |

### 4.2 Sahih al-Bukhari — 3 hadith

**`bukhari:1`** — صحيح البخاري، حديث رقم 1
Why this one: first hadith of the book. Note the source text has an opening quote mark and no closing one.

> حَدَّثَنَا الْحُمَيْدِيُّ عَبْدُ اللَّهِ بْنُ الزُّبَيْرِ ، قَالَ : حَدَّثَنَا سُفْيَانُ ، قَالَ : حَدَّثَنَا يَحْيَى بْنُ سَعِيدٍ الْأَنْصَارِيُّ ، قَالَ : أَخْبَرَنِي مُحَمَّدُ بْنُ إِبْرَاهِيمَ التَّيْمِيُّ ، أَنَّهُ سَمِعَ عَلْقَمَةَ بْنَ وَقَّاصٍ اللَّيْثِيَّ ، يَقُولُ : سَمِعْتُ عُمَرَ بْنَ الْخَطَّابِ رَضِيَ اللَّهُ عَنْهُ عَلَى الْمِنْبَرِ، قَالَ : سَمِعْتُ رَسُولَ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ، يَقُولُ : " إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى، فَمَنْ كَانَتْ هِجْرَتُهُ إِلَى دُنْيَا يُصِيبُهَا أَوْ إِلَى امْرَأَةٍ يَنْكِحُهَا، فَهِجْرَتُهُ إِلَى مَا هَاجَرَ إِلَيْهِ

No `matnText` stored for this record.

Source file: `data/raw/hadith-api/ara-bukhari.min.json` · ara-bukhari @ df57907

---

**`bukhari:1035`** — صحيح البخاري، حديث رقم 1035
Why this one: confirmed in the Dorar spot-check; has a separated matn.

> حَدَّثَنَا مُسْلِمٌ، قَالَ حَدَّثَنَا شُعْبَةُ، عَنِ الْحَكَمِ، عَنْ مُجَاهِدٍ، عَنِ ابْنِ عَبَّاسٍ، أَنَّ النَّبِيَّ صلى الله عليه وسلم قَالَ ‏ "‏ نُصِرْتُ بِالصَّبَا، وَأُهْلِكَتْ عَادٌ بِالدَّبُورِ ‏"‏‏.‏

Separated matn (`matnText`):

> نُصِرْتُ بِالصَّبَا، وَأُهْلِكَتْ عَادٌ بِالدَّبُورِ

Source file: `data/raw/hadith-api/ara-bukhari.min.json` · ara-bukhari @ df57907

---

**`bukhari:1493`** — صحيح البخاري، حديث رقم 1493
Why this one: a narrative with two quoted sayings, so no matn was separated.

> حَدَّثَنَا آدَمُ، حَدَّثَنَا شُعْبَةُ، حَدَّثَنَا الْحَكَمُ، عَنْ إِبْرَاهِيمَ، عَنِ الأَسْوَدِ، عَنْ عَائِشَةَ ـ رضى الله عنها ـ أَنَّهَا أَرَادَتْ أَنْ تَشْتَرِيَ بَرِيرَةَ لِلْعِتْقِ، وَأَرَادَ مَوَالِيهَا أَنْ يَشْتَرِطُوا وَلاَءَهَا، فَذَكَرَتْ عَائِشَةُ لِلنَّبِيِّ صلى الله عليه وسلم فَقَالَ لَهَا النَّبِيُّ صلى الله عليه وسلم ‏"‏ اشْتَرِيهَا، فَإِنَّمَا الْوَلاَءُ لِمَنْ أَعْتَقَ ‏"‏‏.‏ قَالَتْ وَأُتِيَ النَّبِيُّ صلى الله عليه وسلم بِلَحْمٍ فَقُلْتُ هَذَا مَا تُصُدِّقَ بِهِ عَلَى بَرِيرَةَ فَقَالَ ‏"‏ هُوَ لَهَا صَدَقَةٌ، وَلَنَا هَدِيَّةٌ ‏"‏‏.‏

No `matnText` stored for this record.

Source file: `data/raw/hadith-api/ara-bukhari.min.json` · ara-bukhari @ df57907

### 4.3 Sahih Muslim — 3 hadith

**`muslim:4927`** — صحيح مسلم، حديث رقم 1907 (source number 1907.01)
Why this one: shows the numbering: id uses the source running number 4927, the citation uses 1907.

> حَدَّثَنَا عَبْدُ اللَّهِ بْنُ مَسْلَمَةَ بْنِ قَعْنَبٍ، حَدَّثَنَا مَالِكٌ، عَنْ يَحْيَى بْنِ سَعِيدٍ، عَنْ مُحَمَّدِ، بْنِ إِبْرَاهِيمَ عَنْ عَلْقَمَةَ بْنِ وَقَّاصٍ، عَنْ عُمَرَ بْنِ الْخَطَّابِ، قَالَ قَالَ رَسُولُ اللَّهِ صلى الله عليه وسلم ‏ "‏ إِنَّمَا الأَعْمَالُ بِالنِّيَّةِ وَإِنَّمَا لاِمْرِئٍ مَا نَوَى فَمَنْ كَانَتْ هِجْرَتُهُ إِلَى اللَّهِ وَرَسُولِهِ فَهِجْرَتُهُ إِلَى اللَّهِ وَرَسُولِهِ وَمَنْ كَانَتْ هِجْرَتُهُ لِدُنْيَا يُصِيبُهَا أَوِ امْرَأَةٍ يَتَزَوَّجُهَا فَهِجْرَتُهُ إِلَى مَا هَاجَرَ إِلَيْهِ ‏"‏ ‏.‏

Separated matn (`matnText`):

> إِنَّمَا الأَعْمَالُ بِالنِّيَّةِ وَإِنَّمَا لاِمْرِئٍ مَا نَوَى فَمَنْ كَانَتْ هِجْرَتُهُ إِلَى اللَّهِ وَرَسُولِهِ فَهِجْرَتُهُ إِلَى اللَّهِ وَرَسُولِهِ وَمَنْ كَانَتْ هِجْرَتُهُ لِدُنْيَا يُصِيبُهَا أَوِ امْرَأَةٍ يَتَزَوَّجُهَا فَهِجْرَتُهُ إِلَى مَا هَاجَرَ إِلَيْهِ

Source file: `data/raw/hadith-api/ara-muslim.min.json` · ara-muslim @ df57907

---

**`muslim:1417`** — صحيح مسلم، حديث رقم 626 (source number 626.01)
Why this one: confirmed in the Dorar spot-check; has a separated matn.

> وَحَدَّثَنَا يَحْيَى بْنُ يَحْيَى، قَالَ قَرَأْتُ عَلَى مَالِكٍ عَنْ نَافِعٍ، عَنِ ابْنِ عُمَرَ، أَنَّ رَسُولَ اللَّهِ صلى الله عليه وسلم قَالَ ‏ "‏ الَّذِي تَفُوتُهُ صَلاَةُ الْعَصْرِ كَأَنَّمَا وُتِرَ أَهْلَهُ وَمَالَهُ ‏"‏ ‏.‏

Separated matn (`matnText`):

> الَّذِي تَفُوتُهُ صَلاَةُ الْعَصْرِ كَأَنَّمَا وُتِرَ أَهْلَهُ وَمَالَهُ

Source file: `data/raw/hadith-api/ara-muslim.min.json` · ara-muslim @ df57907

---

**`muslim:1501`** — صحيح مسلم، حديث رقم 660 (source number 660.01)
Why this one: a narrative with two quoted sayings, so no matn was separated.

> حَدَّثَنِي زُهَيْرُ بْنُ حَرْبٍ، حَدَّثَنَا هَاشِمُ بْنُ الْقَاسِمِ، حَدَّثَنَا سُلَيْمَانُ، عَنْ ثَابِتٍ، عَنْ أَنَسٍ، قَالَ دَخَلَ النَّبِيُّ صلى الله عليه وسلم عَلَيْنَا وَمَا هُوَ إِلاَّ أَنَا وَأُمِّي وَأُمُّ حَرَامٍ خَالَتِي فَقَالَ ‏"‏ قُومُوا فَلأُصَلِّيَ بِكُمْ ‏"‏ ‏.‏ فِي غَيْرِ وَقْتِ صَلاَةٍ فَصَلَّى بِنَا ‏.‏ فَقَالَ رَجُلٌ لِثَابِتٍ أَيْنَ جَعَلَ أَنَسًا مِنْهُ قَالَ جَعَلَهُ عَلَى يَمِينِهِ ‏.‏ ثُمَّ دَعَا لَنَا أَهْلَ الْبَيْتِ بِكُلِّ خَيْرٍ مِنْ خَيْرِ الدُّنْيَا وَالآخِرَةِ فَقَالَتْ أُمِّي يَا رَسُولَ اللَّهِ خُوَيْدِمُكَ ادْعُ اللَّهَ لَهُ ‏.‏ قَالَ فَدَعَا لِي بِكُلِّ خَيْرٍ وَكَانَ فِي آخِرِ مَا دَعَا لِي بِهِ أَنْ قَالَ ‏"‏ اللَّهُمَّ أَكْثِرْ مَالَهُ وَوَلَدَهُ وَبَارِكْ لَهُ فِيهِ ‏"‏ ‏.‏

No `matnText` stored for this record.

Source file: `data/raw/hadith-api/ara-muslim.min.json` · ara-muslim @ df57907

## 5. Unusual or damaged records

All of these are in the corpus unmodified and pending. Full lists are in `data/corpus/build-report.json`.

| Kind | Bukhari | Muslim | Example |
|---|---|---|---|
| Damaged character (the source lost a letter, shown as �) | 16 | 16 | `bukhari:834`: …مَّ إِنِّي ظَلَمْتُ نَفْسِي ظُلْمًا كَثِيرًا ��َلاَ يَغْفِرُ الذُّنُوبَ إِلاَّ أَنْتَ، فَا… |
| Same text under several numbers | 596 records | 137 records | `bukhari:272` = `bukhari:273`; `muslim:919` = `muslim:931` |
| Decimal (split) number | 26 | 0 | `bukhari:402.2`, cited as no. 402 |
| No citation number | 0 | 148 | `muslim:3` (from the introduction) |
| Empty in the source, left out | 9 | 203 | Bukhari no. 5710, 5711, 5712 |

Damaged records — Bukhari: 834, 1748, 2898, 3007, 3304, 3733, 4214, 4323, 4569, 4669, 4822, 4913, 5167, 6522, 7370, 7555.
Damaged records — Muslim (source running numbers): 305, 403, 1522, 2363, 2626, 2990, 4087, 4607, 5519, 5520, 5770, 6165, 6270, 6364, 6459, 7512.
Bukhari split entries: 402.2, 690.2, 774.2, 1132.2, 1199.2, 1228.2, 1390.2, 1390.3, 2214.2, 2239.2, 2240.2, 2437.2, 3562.2, 3595.2, 3756.2, 3963.2, 4931.2, 4945.2, 5032.2, 5037.2, 5051.2, 5441.2, 5470.2, 5944.2, 6895.2, 6908.2.

Second damaged example, `muslim:305`: … " إِنَّهُ لاَ يَدْخُلُ الْجَنَّةَ إِلاَّ ن��فْسٌ مُسْلِمَةٌ وَإِنَّ اللَّهَ يُؤَيِّدُ ه…

## 6. Decisions you need to make

| # | Decision | Recommendation | Consequence |
|---|---|---|---|
| 1 | Approve the Quran text? | **Decided: approved by the owner on 2026-10-02** for text matching, after comparing the 10 ayat above with مصحف المدينة النبوية. | Quran records are marked reviewed. Decisions 2–4 are not covered by this approval. |
| 2 | Quran checksum mismatch | Email Quranpedia (quranpedia.help@gmail.com) and continue meanwhile; the content matches what they serve. | If they confirm a stale manifest, nothing changes. If the file changed, re-download and rebuild. |
| 3 | Mushaf spellings in search (رحمت، مسئولا، الملإ …) | Use a small reviewed list of these word forms for search only. | Correct quotes typed in everyday spelling are found. Without it they show as «مختلف» or not found. The displayed text is never changed. |
| 4 | The ۞ and ۩ signs in displayed ayat | Keep them in the stored text; hide them only when showing a quote. | The stored text stays identical to the source; the writer sees a clean ayah. |
| 5 | Approve Bukhari and Muslim? | **Decided: approved by the owner** for text matching — bukhari (2026-10-02), muslim (2026-10-02) — on the sample checks. | Records with no reported issue are marked reviewed. Still pending: 640 Bukhari and 191 Muslim records (decisions 6–9 and the held records in `data/review/held-records.json`). |
| 6 | Records sharing one text under several numbers | Keep them out of any approval for now; later show them with a number range. | 733 records cannot give a match status. Approving them as they are risks citing the wrong number. |
| 7 | Damaged records (32) | Leave them out of approval. Do not repair the text by hand. | 32 hadith stay unverifiable until a clean source is found. |
| 8 | Bukhari decimal entries cited by the whole number (402.2 → 402) | Accept. | The reader sees a real hadith number. This differs from your instruction to use `hadithnumber` as is; say so if you want the decimal shown. |
| 9 | Muslim records without a number: no grade, never approved | Accept. | 148 records stay in the data but can never produce a match status. |
| 10 | The rule that separates the matn | Accept after reading the two examples with a separated matn above. | 2126 records get a matn. The rest are matched on the full text including the chain of narrators. |
| 11 | Alternate surah names (براءة، الدهر، الانشراح …) | Read the list in `data/aliases/surahs.json` and strike any you do not accept. | They only help recognise a surah a writer names; they are never shown as source text. |

To approve anything, tell me which collection or which records. I will then record your name and the date in `data/review/reviewed.json`. Whatever is not approved there stays pending.
