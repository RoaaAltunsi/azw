# Azw — hadith review sample

For: the project owner. Corpus `p0-57dc9320685a`, prepared 2026-10-02.

**Sahih al-Bukhari and Sahih Muslim are pending. Nothing here is approved, and this sheet does not approve anything.** It gives you a sample to read. No hadith is graded here; the tool does not judge authenticity.

> Update, later on 2026-10-02: the owner approved both collections on the sample checks
> (reviewer log in `docs/SOURCES.md` section 5, recorded in `data/review/reviewed.json`). The sheet
> is kept as it was when reviewed, so the lines above and below that say "pending" or "no approval
> has been recorded" describe that moment, not the current state.
>
> - Current corpus: `p0-a6d2d36b84e8`. Reviewed: 6940 Bukhari and 7169 Muslim records.
> - Seven records that were eligible here are now held in `data/review/held-records.json` and stay
>   pending: `bukhari:2075`, `muslim:6172`, `muslim:7314`, `muslim:3600`, `muslim:3944`, `muslim:2957`
>   (from this sample; see `docs/HADITH_FLAGGED_INVESTIGATION.md`) and `bukhari:2819` (not in this
>   sample). That is why the eligible counts below (6942 and 7174) are higher than the reviewed counts.
> - Pending now: 640 Bukhari and 191 Muslim records (the 638 and 186 in section 2, plus the held ones).
> - Rerunning `scripts/make-hadith-review-sample.ts` overwrites this file, including this note.

## How to read this sheet

- Each entry shows the text exactly as stored, the hadith number Azw would display, and a link to the same hadith on Dorar (الدرر السنية — الموسوعة الحديثية), which is independent of our source file.
- **Numbering** is checked against the number Dorar prints for the hadith in the same book.
- **Wording** is checked against the book's own text, which Dorar quotes under «أصول الحديث» on the hadith's page (the entry labelled with the same book and the same number). It is **not** checked against the text at the top of a Dorar result: that text is a summary, and its wording can follow another book (see its «التخريج» line).
- Both our text and the book text include the chain of narrators, so the whole record is compared. The comparison ignores diacritics, punctuation, and the alef / ya / ta-marbuta spelling variants. Every other word that is on one side only is listed. Dorar's book text may come from a different printed edition, so a listed difference is something for you to judge, not an error by itself.
- Where the «أصول الحديث» section has no entry for the same book and number, the sheet says the wording was not compared.
- Muslim: the record id uses the source file's running number; the displayed number is the Fuad Abd al-Baqi number.

## Summary

| Book | Eligible records | Sampled | Same number on Dorar | Different number | Number not found / unclear | Book text compared | No word differences | With word differences | Book text not available |
|---|---|---|---|---|---|---|---|---|---|
| صحيح البخاري | 6942 of 7580 | 12 | 12 | 0 | 0 | 12 | 8 | 4 | 0 |
| صحيح مسلم | 7174 of 7360 | 12 | 12 | 0 | 0 | 11 | 6 | 5 | 1 |

Entries that need your attention (a difference in number or wording, or no book text to compare): `bukhari:2075`, `bukhari:7420`, `bukhari:371`, `bukhari:7452`, `muslim:6172`, `muslim:7314`, `muslim:3600`, `muslim:3944`, `muslim:2957`, `muslim:3755`.

## 1. Sample

### صحيح البخاري



6942 of 7580 records are eligible for a collection approval. Sample: 6 short sayings (out of 1008) and 6 long narratives (out of 1379 between 700 and 2500 characters), picked at random with a fixed seed.



#### 1. صحيح البخاري، حديث رقم 2075 — short saying

- Record: `bukhari:2075`
- Displayed hadith number: **2075**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/UCq7ROSV?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D9%84%D8%A3%D9%86%20%D9%8A%D8%A3%D8%AE%D8%B0%20%D8%A3%D8%AD%D8%AF%D9%83%D9%85%20%D8%A3%D8%AD%D8%A8%D9%84%D9%87&s%5B%5D=6216)
- Numbering: **Same.** Dorar lists this text under no. 2075.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» ([صحيح البخاري] (3/ 57)), chain of narrators included: 30 words in common. **Differences:**
  - Words in ours that are not in the book text: خَيْرٌ · لَهُ · مِنْ · أَنْ · يَسْأَلَ · النَّاسَ
  - Words in the book text that are not in ours: none

Text as stored:

> حَدَّثَنَا يَحْيَى بْنُ مُوسَى، حَدَّثَنَا وَكِيعٌ، حَدَّثَنَا هِشَامُ بْنُ عُرْوَةَ، عَنْ أَبِيهِ، عَنِ الزُّبَيْرِ بْنِ الْعَوَّامِ ـ رضى الله عنه ـ قَالَ قَالَ النَّبِيُّ صلى الله عليه وسلم ‏ "‏ لأَنْ يَأْخُذَ أَحَدُكُمْ أَحْبُلَهُ خَيْرٌ لَهُ مِنْ أَنْ يَسْأَلَ النَّاسَ ‏"‏‏.‏

Separated saying (`matnText`):

> لأَنْ يَأْخُذَ أَحَدُكُمْ أَحْبُلَهُ خَيْرٌ لَهُ مِنْ أَنْ يَسْأَلَ النَّاسَ

#### 2. صحيح البخاري، حديث رقم 6183 — short saying

- Record: `bukhari:6183`
- Displayed hadith number: **6183**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/k9KXlwe6?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D9%88%D9%8A%D9%82%D9%88%D9%84%D9%88%D9%86%20%D8%A7%D9%84%D9%83%D8%B1%D9%85%20%D8%A5%D9%86%D9%85%D8%A7%20%D8%A7%D9%84%D9%83%D8%B1%D9%85%20%D9%82%D9%84%D8%A8%20%D8%A7%D9%84%D9%85%D8%A4%D9%85%D9%86&s%5B%5D=6216)
- Numbering: **Same.** Dorar lists this text under no. 6183.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» ([صحيح البخاري] (8/ 42)), chain of narrators included: 33 words in common. **No word differences found.**

Text as stored:

> حَدَّثَنَا عَلِيُّ بْنُ عَبْدِ اللَّهِ، حَدَّثَنَا سُفْيَانُ، عَنِ الزُّهْرِيِّ، عَنْ سَعِيدِ بْنِ الْمُسَيَّبِ، عَنْ أَبِي هُرَيْرَةَ ـ رضى الله عنه ـ قَالَ قَالَ رَسُولُ اللَّهِ صلى الله عليه وسلم ‏ "‏ وَيَقُولُونَ الْكَرْمُ، إِنَّمَا الْكَرْمُ قَلْبُ الْمُؤْمِنِ ‏"‏‏.‏

Separated saying (`matnText`):

> وَيَقُولُونَ الْكَرْمُ، إِنَّمَا الْكَرْمُ قَلْبُ الْمُؤْمِنِ

#### 3. صحيح البخاري، حديث رقم 2830 — short saying

- Record: `bukhari:2830`
- Displayed hadith number: **2830**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/jPVjcFgG?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D8%A7%D9%84%D8%B7%D8%A7%D8%B9%D9%88%D9%86%20%D8%B4%D9%87%D8%A7%D8%AF%D8%A9%20%D9%84%D9%83%D9%84%20%D9%85%D8%B3%D9%84%D9%85&s%5B%5D=6216)
- Numbering: **Same.** Dorar lists this text under no. 2830.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» ([صحيح البخاري] (4/ 24)), chain of narrators included: 31 words in common. **No word differences found.**

Text as stored:

> حَدَّثَنَا بِشْرُ بْنُ مُحَمَّدٍ، أَخْبَرَنَا عَبْدُ اللَّهِ، أَخْبَرَنَا عَاصِمٌ، عَنْ حَفْصَةَ بِنْتِ سِيرِينَ، عَنْ أَنَسِ بْنِ مَالِكٍ ـ رضى الله عنه ـ عَنِ النَّبِيِّ صلى الله عليه وسلم قَالَ ‏ "‏ الطَّاعُونُ شَهَادَةٌ لِكُلِّ مُسْلِمٍ ‏"‏‏.‏

Separated saying (`matnText`):

> الطَّاعُونُ شَهَادَةٌ لِكُلِّ مُسْلِمٍ

#### 4. صحيح البخاري، حديث رقم 6136 — short saying

- Record: `bukhari:6136`
- Displayed hadith number: **6136**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/IIV17Zae?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D9%85%D9%86%20%D9%83%D8%A7%D9%86%20%D9%8A%D8%A4%D9%85%D9%86%20%D8%A8%D8%A7%D9%84%D9%84%D9%87%20%D9%88%D8%A7%D9%84%D9%8A%D9%88%D9%85%20%D8%A7%D9%84%D8%A2%D8%AE%D8%B1%20%D9%81%D9%84%D8%A7%20%D9%8A%D8%A4%D8%B0&s%5B%5D=6216)
- Numbering: **Same.** Dorar lists this text under no. 6136.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» (صحيح البخاري (8/ 32)), chain of narrators included: 53 words in common. **No word differences found.**

Text as stored:

> حَدَّثَنَا عَبْدُ اللَّهِ بْنُ مُحَمَّدٍ، حَدَّثَنَا ابْنُ مَهْدِيٍّ، حَدَّثَنَا سُفْيَانُ، عَنْ أَبِي حَصِينٍ، عَنْ أَبِي صَالِحٍ، عَنْ أَبِي هُرَيْرَةَ، عَنِ النَّبِيِّ صلى الله عليه وسلم قَالَ ‏ "‏ مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلاَ يُؤْذِ جَارَهُ، وَمَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيُكْرِمْ ضَيْفَهُ، وَمَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ ‏"‏‏.‏

Separated saying (`matnText`):

> مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلاَ يُؤْذِ جَارَهُ، وَمَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيُكْرِمْ ضَيْفَهُ، وَمَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ

#### 5. صحيح البخاري، حديث رقم 3202 — short saying

- Record: `bukhari:3202`
- Displayed hadith number: **3202**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/WQvGN5M1?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D8%A5%D9%86%20%D8%A7%D9%84%D8%B4%D9%85%D8%B3%20%D9%88%D8%A7%D9%84%D9%82%D9%85%D8%B1%20%D8%A2%D9%8A%D8%AA%D8%A7%D9%86%20%D9%85%D9%86%20%D8%A2%D9%8A%D8%A7%D8%AA%20%D8%A7%D9%84%D9%84%D9%87%20%D9%84%D8%A7&s%5B%5D=6216)
- Numbering: **Same.** Dorar lists this text under no. 3202.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» (صحيح البخاري (4/ 108)), chain of narrators included: 49 words in common. **No word differences found.**

Text as stored:

> حَدَّثَنَا إِسْمَاعِيلُ بْنُ أَبِي أُوَيْسٍ، قَالَ حَدَّثَنِي مَالِكٌ، عَنْ زَيْدِ بْنِ أَسْلَمَ، عَنْ عَطَاءِ بْنِ يَسَارٍ، عَنْ عَبْدِ اللَّهِ بْنِ عَبَّاسٍ ـ رضى الله عنهما ـ قَالَ قَالَ النَّبِيُّ صلى الله عليه وسلم ‏ "‏ إِنَّ الشَّمْسَ وَالْقَمَرَ آيَتَانِ مِنْ آيَاتِ اللَّهِ، لاَ يَخْسِفَانِ لِمَوْتِ أَحَدٍ وَلاَ لِحَيَاتِهِ، فَإِذَا رَأَيْتُمْ ذَلِكَ فَاذْكُرُوا اللَّهَ ‏"‏‏.‏

Separated saying (`matnText`):

> إِنَّ الشَّمْسَ وَالْقَمَرَ آيَتَانِ مِنْ آيَاتِ اللَّهِ، لاَ يَخْسِفَانِ لِمَوْتِ أَحَدٍ وَلاَ لِحَيَاتِهِ، فَإِذَا رَأَيْتُمْ ذَلِكَ فَاذْكُرُوا اللَّهَ

#### 6. صحيح البخاري، حديث رقم 6768 — short saying

- Record: `bukhari:6768`
- Displayed hadith number: **6768**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/PJHLcQTA?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D9%84%D8%A7%20%D8%AA%D8%B1%D8%BA%D8%A8%D9%88%D8%A7%20%D8%B9%D9%86%20%D8%A2%D8%A8%D8%A7%D8%A6%D9%83%D9%85%20%D9%81%D9%85%D9%86%20%D8%B1%D8%BA%D8%A8%20%D8%B9%D9%86%20%D8%A3%D8%A8%D9%8A%D9%87&s%5B%5D=6216)
- Numbering: **Same.** Dorar lists this text under no. 6768.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» (صحيح البخاري (8/ 156)), chain of narrators included: 35 words in common. **No word differences found.**

Text as stored:

> حَدَّثَنَا أَصْبَغُ بْنُ الْفَرَجِ، حَدَّثَنَا ابْنُ وَهْبٍ، أَخْبَرَنِي عَمْرٌو، عَنْ جَعْفَرِ بْنِ رَبِيعَةَ، عَنْ عِرَاكٍ، عَنْ أَبِي هُرَيْرَةَ، عَنِ النَّبِيِّ صلى الله عليه وسلم قَالَ ‏ "‏ لاَ تَرْغَبُوا عَنْ آبَائِكُمْ، فَمَنْ رَغِبَ عَنْ أَبِيهِ فَهُوَ كُفْرٌ ‏"‏‏.‏

Separated saying (`matnText`):

> لاَ تَرْغَبُوا عَنْ آبَائِكُمْ، فَمَنْ رَغِبَ عَنْ أَبِيهِ فَهُوَ كُفْرٌ

#### 7. صحيح البخاري، حديث رقم 2764 — long narrative

- Record: `bukhari:2764`
- Displayed hadith number: **2764**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/cB5I6JCb?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D8%A3%D9%86%20%D8%A3%D8%AA%D8%B5%D8%AF%D9%82%20%D8%A8%D9%87%20%D9%81%D9%82%D8%A7%D9%84%20%D8%A7%D9%84%D9%86%D8%A8%D9%8A%20%D8%B5%D9%84%D9%89&s%5B%5D=6216)
- Numbering: **Same.** Dorar lists this text under no. 2764.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» (صحيح البخاري (4/ 10)), chain of narrators included: 102 words in common. **No word differences found.**

Text as stored:

> حَدَّثَنَا هَارُونُ، حَدَّثَنَا أَبُو سَعِيدٍ، مَوْلَى بَنِي هَاشِمٍ حَدَّثَنَا صَخْرُ بْنُ جُوَيْرِيَةَ، عَنْ نَافِعٍ، عَنِ ابْنِ عُمَرَ ـ رضى الله عنهما ـ أَنَّ عُمَرَ، تَصَدَّقَ بِمَالٍ لَهُ عَلَى عَهْدِ رَسُولِ اللَّهِ صلى الله عليه وسلم وَكَانَ يُقَالُ لَهُ ثَمْغٌ، وَكَانَ نَخْلاً، فَقَالَ عُمَرُ يَا رَسُولَ اللَّهِ إِنِّي اسْتَفَدْتُ مَالاً وَهُوَ عِنْدِي نَفِيسٌ فَأَرَدْتُ أَنْ أَتَصَدَّقَ بِهِ‏.‏ فَقَالَ النَّبِيُّ صلى الله عليه وسلم ‏ "‏ تَصَدَّقْ بِأَصْلِهِ، لاَ يُبَاعُ وَلاَ يُوهَبُ وَلاَ يُورَثُ، وَلَكِنْ يُنْفَقُ ثَمَرُهُ ‏"‏‏.‏ فَتَصَدَّقَ بِهِ عُمَرُ، فَصَدَقَتُهُ ذَلِكَ فِي سَبِيلِ اللَّهِ وَفِي الرِّقَابِ وَالْمَسَاكِينِ وَالضَّيْفِ وَابْنِ السَّبِيلِ وَلِذِي الْقُرْبَى، وَلاَ جُنَاحَ عَلَى مَنْ وَلِيَهُ أَنْ يَأْكُلَ مِنْهُ بِالْمَعْرُوفِ، أَوْ يُوكِلَ صَدِيقَهُ غَيْرَ مُتَمَوِّلٍ بِهِ‏.‏

#### 8. صحيح البخاري، حديث رقم 46 — long narrative

- Record: `bukhari:46`
- Displayed hadith number: **46**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/wHxLv3Vm?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D8%BA%D9%8A%D8%B1%D9%87%D8%A7%20%D9%82%D8%A7%D9%84%20%D9%84%D8%A7%20%D8%A5%D9%84%D8%A7%20%D8%A3%D9%86%20%D8%AA%D8%B7%D9%88%D8%B9&s%5B%5D=6216)
- Numbering: **Same.** Dorar lists this text under no. 46.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» ([صحيح البخاري] (1/ 18)), chain of narrators included: 130 words in common. **No word differences found.**

Text as stored:

> حَدَّثَنَا إِسْمَاعِيلُ، قَالَ حَدَّثَنِي مَالِكُ بْنُ أَنَسٍ، عَنْ عَمِّهِ أَبِي سُهَيْلِ بْنِ مَالِكٍ، عَنْ أَبِيهِ، أَنَّهُ سَمِعَ طَلْحَةَ بْنَ عُبَيْدِ اللَّهِ، يَقُولُ جَاءَ رَجُلٌ إِلَى رَسُولِ اللَّهِ صلى الله عليه وسلم مِنْ أَهْلِ نَجْدٍ، ثَائِرُ الرَّأْسِ، يُسْمَعُ دَوِيُّ صَوْتِهِ، وَلاَ يُفْقَهُ مَا يَقُولُ حَتَّى دَنَا، فَإِذَا هُوَ يَسْأَلُ عَنِ الإِسْلاَمِ فَقَالَ رَسُولُ اللَّهِ ـ صلى الله عليه وسلم ‏"‏ خَمْسُ صَلَوَاتٍ فِي الْيَوْمِ وَاللَّيْلَةِ ‏"‏‏.‏ فَقَالَ هَلْ عَلَىَّ غَيْرُهَا قَالَ ‏"‏ لاَ، إِلاَّ أَنْ تَطَوَّعَ ‏"‏‏.‏ قَالَ رَسُولُ اللَّهِ صلى الله عليه وسلم ‏"‏ وَصِيَامُ رَمَضَانَ ‏"‏‏.‏ قَالَ هَلْ عَلَىَّ غَيْرُهُ قَالَ ‏"‏ لاَ، إِلاَّ أَنْ تَطَوَّعَ ‏"‏‏.‏ قَالَ وَذَكَرَ لَهُ رَسُولُ اللَّهِ صلى الله عليه وسلم الزَّكَاةَ‏.‏ قَالَ هَلْ عَلَىَّ غَيْرُهَا قَالَ ‏"‏ لاَ، إِلاَّ أَنْ تَطَوَّعَ ‏"‏‏.‏ قَالَ فَأَدْبَرَ الرَّجُلُ وَهُوَ يَقُولُ وَاللَّهِ لاَ أَزِيدُ عَلَى هَذَا وَلاَ أَنْقُصُ‏.‏ قَالَ رَسُولُ اللَّهِ صلى الله عليه وسلم ‏"‏ أَفْلَحَ إِنْ صَدَقَ ‏"‏‏.‏

#### 9. صحيح البخاري، حديث رقم 7420 — long narrative

- Record: `bukhari:7420`
- Displayed hadith number: **7420**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/OTMkz3YO?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D9%88%D8%B3%D9%84%D9%85%20%D9%83%D8%A7%D8%AA%D9%85%D8%A7%20%D8%B4%D9%8A%D8%A6%D8%A7%20%D9%84%D9%83%D8%AA%D9%85%20%D9%87%D8%B0%D9%87%20%D9%82%D8%A7%D9%84&s%5B%5D=6216)
- Numbering: **Same.** Dorar lists this text under no. 7420.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» (صحيح البخاري (9/ 124)), chain of narrators included: 85 words in common. **Differences:**
  - Words in ours that are not in the book text: سَمَوَاتٍ
  - Words in the book text that are not in ours: سماوات

Text as stored:

> حَدَّثَنَا أَحْمَدُ، حَدَّثَنَا مُحَمَّدُ بْنُ أَبِي بَكْرٍ الْمُقَدَّمِيُّ، حَدَّثَنَا حَمَّادُ بْنُ زَيْدٍ، عَنْ ثَابِتٍ، عَنْ أَنَسٍ، قَالَ جَاءَ زَيْدُ بْنُ حَارِثَةَ يَشْكُو فَجَعَلَ النَّبِيُّ صلى الله عليه وسلم يَقُولُ ‏"‏ اتَّقِ اللَّهَ، وَأَمْسِكْ عَلَيْكَ زَوْجَكَ ‏"‏‏.‏ قَالَتْ عَائِشَةُ لَوْ كَانَ رَسُولُ اللَّهِ صلى الله عليه وسلم كَاتِمًا شَيْئًا لَكَتَمَ هَذِهِ‏.‏ قَالَ فَكَانَتْ زَيْنَبُ تَفْخَرُ عَلَى أَزْوَاجِ النَّبِيِّ صلى الله عليه وسلم تَقُولُ زَوَّجَكُنَّ أَهَالِيكُنَّ، وَزَوَّجَنِي اللَّهُ تَعَالَى مِنْ فَوْقِ سَبْعِ سَمَوَاتٍ‏.‏ وَعَنْ ثَابِتٍ ‏{‏وَتُخْفِي فِي نَفْسِكَ مَا اللَّهُ مُبْدِيهِ وَتَخْشَى النَّاسَ‏}‏ نَزَلَتْ فِي شَأْنِ زَيْنَبَ وَزَيْدِ بْنِ حَارِثَةَ‏.‏

#### 10. صحيح البخاري، حديث رقم 7310 — long narrative

- Record: `bukhari:7310`
- Displayed hadith number: **7310**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/yd7bpD0o?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D9%88%D9%83%D8%B0%D8%A7%20%D9%81%D9%8A%20%D9%85%D9%83%D8%A7%D9%86%20%D9%83%D8%B0%D8%A7%20%D9%88%D9%83%D8%B0%D8%A7%20%D9%81%D8%A7%D8%AC%D8%AA%D9%85%D8%B9%D9%86&s%5B%5D=6216)
- Numbering: **Same.** Dorar lists this text under no. 7310.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» ([صحيح البخاري] (9/ 101)), chain of narrators included: 98 words in common. **No word differences found.**

Text as stored:

> حَدَّثَنَا مُسَدَّدٌ، حَدَّثَنَا أَبُو عَوَانَةَ، عَنْ عَبْدِ الرَّحْمَنِ بْنِ الأَصْبَهَانِيِّ، عَنْ أَبِي صَالِحٍ، ذَكْوَانَ عَنْ أَبِي سَعِيدٍ، جَاءَتِ امْرَأَةٌ إِلَى رَسُولِ اللَّهِ صلى الله عليه وسلم فَقَالَتْ يَا رَسُولَ اللَّهِ ذَهَبَ الرِّجَالُ بِحَدِيثِكَ، فَاجْعَلْ لَنَا مِنْ نَفْسِكَ، يَوْمًا نَأْتِيكَ فِيهِ تُعَلِّمُنَا مِمَّا عَلَّمَكَ اللَّهُ‏.‏ فَقَالَ ‏"‏ اجْتَمِعْنَ فِي يَوْمِ كَذَا وَكَذَا فِي مَكَانِ كَذَا وَكَذَا ‏"‏‏.‏ فَاجْتَمَعْنَ فَأَتَاهُنَّ رَسُولُ اللَّهِ صلى الله عليه وسلم فَعَلَّمَهُنَّ مِمَّا عَلَّمَهُ اللَّهُ ثُمَّ قَالَ ‏"‏ مَا مِنْكُنَّ امْرَأَةٌ تُقَدِّمُ بَيْنَ يَدَيْهَا مِنْ وَلَدِهَا ثَلاَثَةً، إِلاَّ كَانَ لَهَا حِجَابًا مِنَ النَّارِ ‏"‏‏.‏ فَقَالَتِ امْرَأَةٌ مِنْهُنَّ يَا رَسُولَ اللَّهِ اثْنَيْنِ قَالَ فَأَعَادَتْهَا مَرَّتَيْنِ ثُمَّ قَالَ ‏"‏ وَاثْنَيْنِ وَاثْنَيْنِ وَاثْنَيْنِ ‏"‏‏.‏

#### 11. صحيح البخاري، حديث رقم 371 — long narrative

- Record: `bukhari:371`
- Displayed hadith number: **371**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/ZFogUWiT?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D8%A3%D8%B9%D8%B7%D9%86%D9%8A%20%D8%AC%D8%A7%D8%B1%D9%8A%D8%A9%20%D9%85%D9%86%20%D8%A7%D9%84%D8%B3%D8%A8%D9%89%20%D9%82%D8%A7%D9%84%20%D8%A7%D8%B0%D9%87%D8%A8&s%5B%5D=6216)
- Numbering: **Same.** Dorar lists this text under no. 371.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» (صحيح البخاري (1/ 83)), chain of narrators included: 253 words in common. **Differences:**
  - Words in ours that are not in the book text: ابْنُ
  - Words in the book text that are not in ours: بن

Text as stored:

> حَدَّثَنَا يَعْقُوبُ بْنُ إِبْرَاهِيمَ، قَالَ حَدَّثَنَا إِسْمَاعِيلُ ابْنُ عُلَيَّةَ، قَالَ حَدَّثَنَا عَبْدُ الْعَزِيزِ بْنُ صُهَيْبٍ، عَنْ أَنَسٍ، أَنَّ رَسُولَ اللَّهِ صلى الله عليه وسلم غَزَا خَيْبَرَ، فَصَلَّيْنَا عِنْدَهَا صَلاَةَ الْغَدَاةِ بِغَلَسٍ، فَرَكِبَ نَبِيُّ اللَّهِ صلى الله عليه وسلم وَرَكِبَ أَبُو طَلْحَةَ، وَأَنَا رَدِيفُ أَبِي طَلْحَةَ، فَأَجْرَى نَبِيُّ اللَّهِ صلى الله عليه وسلم فِي زُقَاقِ خَيْبَرَ، وَإِنَّ رُكْبَتِي لَتَمَسُّ فَخِذَ نَبِيِّ اللَّهِ صلى الله عليه وسلم، ثُمَّ حَسَرَ الإِزَارَ عَنْ فَخِذِهِ حَتَّى إِنِّي أَنْظُرُ إِلَى بَيَاضِ فَخِذِ نَبِيِّ اللَّهِ صلى الله عليه وسلم، فَلَمَّا دَخَلَ الْقَرْيَةَ قَالَ ‏"‏ اللَّهُ أَكْبَرُ، خَرِبَتْ خَيْبَرُ، إِنَّا إِذَا نَزَلْنَا بِسَاحَةِ قَوْمٍ فَسَاءَ صَبَاحُ الْمُنْذَرِينَ ‏"‏‏.‏ قَالَهَا ثَلاَثًا‏.‏ قَالَ وَخَرَجَ الْقَوْمُ إِلَى أَعْمَالِهِمْ فَقَالُوا مُحَمَّدٌ ـ قَالَ عَبْدُ الْعَزِيزِ وَقَالَ بَعْضُ أَصْحَابِنَا ـ وَالْخَمِيسُ‏.‏ يَعْنِي الْجَيْشَ، قَالَ فَأَصَبْنَاهَا عَنْوَةً، فَجُمِعَ السَّبْىُ، فَجَاءَ دِحْيَةُ فَقَالَ يَا نَبِيَّ اللَّهِ، أَعْطِنِي جَارِيَةً مِنَ السَّبْىِ‏.‏ قَالَ ‏"‏ اذْهَبْ فَخُذْ جَارِيَةً ‏"‏‏.‏ فَأَخَذَ صَفِيَّةَ بِنْتَ حُيَىٍّ، فَجَاءَ رَجُلٌ إِلَى النَّبِيِّ صلى الله عليه وسلم فَقَالَ يَا نَبِيَّ اللَّهِ، أَعْطَيْتَ دِحْيَةَ صَفِيَّةَ بِنْتَ حُيَىٍّ سَيِّدَةَ قُرَيْظَةَ وَالنَّضِيرِ، لاَ تَصْلُحُ إِلاَّ لَكَ‏.‏ قَالَ ‏"‏ ادْعُوهُ بِهَا ‏"‏‏.‏ فَجَاءَ بِهَا، فَلَمَّا نَظَرَ إِلَيْهَا النَّبِيُّ صلى الله عليه وسلم قَالَ ‏"‏ خُذْ جَارِيَةً مِنَ السَّبْىِ غَيْرَهَا ‏"‏‏.‏ قَالَ فَأَعْتَقَهَا النَّبِيُّ صلى الله عليه وسلم وَتَزَوَّجَهَا‏.‏ فَقَالَ لَهُ ثَابِتٌ يَا أَبَا حَمْزَةَ، مَا أَصْدَقَهَا قَالَ نَفْسَهَا، أَعْتَقَهَا وَتَزَوَّجَهَا، حَتَّى إِذَا كَانَ بِالطَّرِيقِ جَهَّزَتْهَا لَهُ أُمُّ سُلَيْمٍ فَأَهْدَتْهَا لَهُ مِنَ اللَّيْلِ، فَأَصْبَحَ النَّبِيُّ صلى الله عليه وسلم عَرُوسًا فَقَالَ ‏"‏ مَنْ كَانَ عِنْدَهُ شَىْءٌ فَلْيَجِئْ بِهِ ‏"‏‏.‏ وَبَسَطَ نِطَعًا، فَجَعَلَ الرَّجُلُ يَجِيءُ بِالتَّمْرِ، وَجَعَلَ الرَّجُلُ يَجِيءُ بِالسَّمْنِ ـ قَالَ وَأَحْسِبُهُ قَدْ ذَكَرَ السَّوِيقَ ـ قَالَ فَحَاسُوا حَيْسًا، فَكَانَتْ وَلِيمَةَ رَسُولِ اللَّهِ صلى الله عليه وسلم‏.‏

#### 12. صحيح البخاري، حديث رقم 7452 — long narrative

- Record: `bukhari:7452`
- Displayed hadith number: **7452**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/udpPT8zT?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D8%A7%D9%84%D9%84%D9%87%20%D8%B9%D9%84%D9%8A%D9%87%20%D9%88%D8%B3%D9%84%D9%85%20%D9%85%D8%B9%20%D8%A3%D9%87%D9%84%D9%87%20%D8%B3%D8%A7%D8%B9%D8%A9&s%5B%5D=6216)
- Numbering: **Same.** Dorar lists this text under no. 7452.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» (صحيح البخاري (9/ 135)), chain of narrators included: 96 words in common. **Differences:**
  - Words in ours that are not in the book text: السَّمَوَاتِ
  - Words in the book text that are not in ours: السماوات

Text as stored:

> حَدَّثَنَا سَعِيدُ بْنُ أَبِي مَرْيَمَ، أَخْبَرَنَا مُحَمَّدُ بْنُ جَعْفَرٍ، أَخْبَرَنِي شَرِيكُ بْنُ عَبْدِ اللَّهِ بْنِ أَبِي نَمِرٍ، عَنْ كُرَيْبٍ، عَنِ ابْنِ عَبَّاسٍ، قَالَ بِتُّ فِي بَيْتِ مَيْمُونَةَ لَيْلَةً وَالنَّبِيُّ صلى الله عليه وسلم عِنْدَهَا لأَنْظُرَ كَيْفَ صَلاَةُ رَسُولِ اللَّهِ صلى الله عليه وسلم بِاللَّيْلِ، فَتَحَدَّثَ رَسُولُ اللَّهِ صلى الله عليه وسلم مَعَ أَهْلِهِ سَاعَةً ثُمَّ رَقَدَ، فَلَمَّا كَانَ ثُلُثُ اللَّيْلِ الآخِرُ أَوْ بَعْضُهُ قَعَدَ فَنَظَرَ إِلَى السَّمَاءِ فَقَرَأَ ‏{‏إِنَّ فِي خَلْقِ السَّمَوَاتِ وَالأَرْضِ‏}‏ إِلَى قَوْلِهِ ‏{‏لأُولِي الأَلْبَابِ‏}‏ ثُمَّ قَامَ فَتَوَضَّأَ وَاسْتَنَّ، ثُمَّ صَلَّى إِحْدَى عَشْرَةَ رَكْعَةً، ثُمَّ أَذَّنَ بِلاَلٌ بِالصَّلاَةِ فَصَلَّى رَكْعَتَيْنِ، ثُمَّ خَرَجَ فَصَلَّى لِلنَّاسِ الصُّبْحَ‏.‏

### صحيح مسلم



7174 of 7360 records are eligible for a collection approval. Sample: 6 short sayings (out of 1103) and 6 long narratives (out of 1125 between 700 and 2500 characters), picked at random with a fixed seed.



#### 1. صحيح مسلم، حديث رقم 2561 — short saying

- Record: `muslim:6534`
- Displayed hadith number: **2561**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/HewPHRTk?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D9%84%D8%A7%20%D9%8A%D8%AD%D9%84%20%D9%84%D9%84%D9%85%D8%A4%D9%85%D9%86%20%D8%A3%D9%86%20%D9%8A%D9%87%D8%AC%D8%B1%20%D8%A3%D8%AE%D8%A7%D9%87%20%D9%81%D9%88%D9%82%20%D8%AB%D9%84%D8%A7%D8%AB%D8%A9&s%5B%5D=3088)
- Numbering: **Same.** Dorar lists this text under no. 2561.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» (صحيح مسلم (4/ 1984 ت عبد الباقي)), chain of narrators included: 38 words in common. **No word differences found.**

Text as stored:

> حَدَّثَنَا مُحَمَّدُ بْنُ رَافِعٍ، حَدَّثَنَا مُحَمَّدُ بْنُ أَبِي فُدَيْكٍ، أَخْبَرَنَا الضَّحَّاكُ، - وَهُوَ ابْنُ عُثْمَانَ - عَنْ نَافِعٍ، عَنْ عَبْدِ اللَّهِ بْنِ عُمَرَ، أَنَّ رَسُولَ اللَّهِ صلى الله عليه وسلم قَالَ ‏ "‏ لاَ يَحِلُّ لِلْمُؤْمِنِ أَنْ يَهْجُرَ أَخَاهُ فَوْقَ ثَلاَثَةِ أَيَّامٍ ‏"‏ ‏.‏

Separated saying (`matnText`):

> لاَ يَحِلُّ لِلْمُؤْمِنِ أَنْ يَهْجُرَ أَخَاهُ فَوْقَ ثَلاَثَةِ أَيَّامٍ

#### 2. صحيح مسلم، حديث رقم 2383 — short saying

- Record: `muslim:6172` · number in the source file: 2383.01
- Displayed hadith number: **2383**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/pFmtgGPG?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D9%84%D9%88%20%D9%83%D9%86%D8%AA%20%D9%85%D8%AA%D8%AE%D8%B0%D8%A7%20%D8%AE%D9%84%D9%8A%D9%84%D8%A7%20%D9%84%D8%A7%D8%AA%D8%AE%D8%B0%D8%AA%20%D8%A3%D8%A8%D8%A7%20%D8%A8%D9%83%D8%B1%20%D8%AE%D9%84%D9%8A%D9%84%D8%A7&s%5B%5D=3088)
- Numbering: **Same.** Dorar lists this text under no. 2383.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» (صحيح مسلم (4/ 1855 ت عبد الباقي)), chain of narrators included: 58 words in common. **Differences:**
  - Words in ours that are not in the book text: لاَتَّخَذْتُ
  - Words in the book text that are not in ours: لتخذت

Text as stored:

> حَدَّثَنَا مُحَمَّدُ بْنُ بَشَّارٍ الْعَبْدِيُّ، حَدَّثَنَا مُحَمَّدُ بْنُ جَعْفَرٍ، حَدَّثَنَا شُعْبَةُ، عَنْ إِسْمَاعِيلَ، بْنِ رَجَاءٍ قَالَ سَمِعْتُ عَبْدَ اللَّهِ بْنَ أَبِي الْهُذَيْلِ، يُحَدِّثُ عَنْ أَبِي الأَحْوَصِ، قَالَ سَمِعْتُ عَبْدَ، اللَّهِ بْنَ مَسْعُودٍ يُحَدِّثُ عَنِ النَّبِيِّ صلى الله عليه وسلم أَنَّهُ قَالَ ‏ "‏ لَوْ كُنْتُ مُتَّخِذًا خَلِيلاً لاَتَّخَذْتُ أَبَا بَكْرٍ خَلِيلاً وَلَكِنَّهُ أَخِي وَصَاحِبِي وَقَدِ اتَّخَذَ اللَّهُ عَزَّ وَجَلَّ صَاحِبَكُمْ خَلِيلاً ‏"‏ ‏.‏

Separated saying (`matnText`):

> لَوْ كُنْتُ مُتَّخِذًا خَلِيلاً لاَتَّخَذْتُ أَبَا بَكْرٍ خَلِيلاً وَلَكِنَّهُ أَخِي وَصَاحِبِي وَقَدِ اتَّخَذَ اللَّهُ عَزَّ وَجَلَّ صَاحِبَكُمْ خَلِيلاً

#### 3. صحيح مسلم، حديث رقم 982 — short saying

- Record: `muslim:2276` · number in the source file: 982.04
- Displayed hadith number: **982**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/4gNqMhf0?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D9%84%D9%8A%D8%B3%20%D9%81%D9%8A%20%D8%A7%D9%84%D8%B9%D8%A8%D8%AF%20%D8%B5%D8%AF%D9%82%D8%A9%20%D8%A5%D9%84%D8%A7%20%D8%B5%D8%AF%D9%82%D8%A9%20%D8%A7%D9%84%D9%81%D8%B7%D8%B1&s%5B%5D=3088)
- Numbering: **Same.** Dorar lists this text under no. 982.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» (صحيح مسلم (2/ 676 ت عبد الباقي)), chain of narrators included: 42 words in common. **No word differences found.**

Text as stored:

> وَحَدَّثَنِي أَبُو الطَّاهِرِ، وَهَارُونُ بْنُ سَعِيدٍ الأَيْلِيُّ، وَأَحْمَدُ بْنُ عِيسَى، قَالُوا حَدَّثَنَا ابْنُ وَهْبٍ، أَخْبَرَنِي مَخْرَمَةُ، عَنْ أَبِيهِ، عَنْ عِرَاكِ بْنِ مَالِكٍ، قَالَ سَمِعْتُ أَبَا هُرَيْرَةَ، يُحَدِّثُ عَنْ رَسُولِ اللَّهِ صلى الله عليه وسلم قَالَ ‏ "‏ لَيْسَ فِي الْعَبْدِ صَدَقَةٌ إِلاَّ صَدَقَةُ الْفِطْرِ ‏"‏ ‏.‏

Separated saying (`matnText`):

> لَيْسَ فِي الْعَبْدِ صَدَقَةٌ إِلاَّ صَدَقَةُ الْفِطْرِ

#### 4. صحيح مسلم، حديث رقم 1011 — short saying

- Record: `muslim:2337`
- Displayed hadith number: **1011**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/C3sW5HJl?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D8%AA%D8%B5%D8%AF%D9%82%D9%88%D8%A7%20%D9%81%D9%8A%D9%88%D8%B4%D9%83%20%D8%A7%D9%84%D8%B1%D8%AC%D9%84%20%D9%8A%D9%85%D8%B4%D9%8A%20%D8%A8%D8%B5%D8%AF%D9%82%D8%AA%D9%87%20%D9%81%D9%8A%D9%82%D9%88%D9%84%20%D8%A7%D9%84%D8%B0%D9%8A%20%D8%A3%D8%B9%D8%B7%D9%8A%D9%87%D8%A7&s%5B%5D=3088)
- Numbering: **Same.** Dorar lists this text under no. 1011.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» (صحيح مسلم (2/ 700)), chain of narrators included: 67 words in common. **No word differences found.**

Text as stored:

> حَدَّثَنَا أَبُو بَكْرِ بْنُ أَبِي شَيْبَةَ، وَابْنُ، نُمَيْرٍ قَالاَ حَدَّثَنَا وَكِيعٌ، حَدَّثَنَا شُعْبَةُ، ح وَحَدَّثَنَا مُحَمَّدُ بْنُ الْمُثَنَّى، - وَاللَّفْظُ لَهُ - حَدَّثَنَا مُحَمَّدُ بْنُ جَعْفَرٍ، حَدَّثَنَا شُعْبَةُ، عَنْ مَعْبَدِ بْنِ خَالِدٍ، قَالَ سَمِعْتُ حَارِثَةَ بْنَ وَهْبٍ، يَقُولُ سَمِعْتُ رَسُولَ اللَّهِ صلى الله عليه وسلم يَقُولُ ‏ "‏ تَصَدَّقُوا فَيُوشِكُ الرَّجُلُ يَمْشِي بِصَدَقَتِهِ فَيَقُولُ الَّذِي أُعْطِيَهَا لَوْ جِئْتَنَا بِهَا بِالأَمْسِ قَبِلْتُهَا فَأَمَّا الآنَ فَلاَ حَاجَةَ لِي بِهَا ‏.‏ فَلاَ يَجِدُ مَنْ يَقْبَلُهَا ‏"‏ ‏.‏

Separated saying (`matnText`):

> تَصَدَّقُوا فَيُوشِكُ الرَّجُلُ يَمْشِي بِصَدَقَتِهِ فَيَقُولُ الَّذِي أُعْطِيَهَا لَوْ جِئْتَنَا بِهَا بِالأَمْسِ قَبِلْتُهَا فَأَمَّا الآنَ فَلاَ حَاجَةَ لِي بِهَا ‏.‏ فَلاَ يَجِدُ مَنْ يَقْبَلُهَا

#### 5. صحيح مسلم، حديث رقم 2912 — short saying

- Record: `muslim:7314` · number in the source file: 2912.05
- Displayed hadith number: **2912**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/dcECBTLK?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D8%AA%D9%82%D8%A7%D8%AA%D9%84%D9%88%D9%86%20%D8%A8%D9%8A%D9%86%20%D9%8A%D8%AF%D9%89%20%D8%A7%D9%84%D8%B3%D8%A7%D8%B9%D8%A9%20%D9%82%D9%88%D9%85%D8%A7%20%D9%86%D8%B9%D8%A7%D9%84%D9%87%D9%85%20%D8%A7%D9%84%D8%B4%D8%B9%D8%B1%20%D9%83%D8%A3%D9%86&s%5B%5D=3088)
- Numbering: **Same.** Dorar lists this text under no. 2912.
- Wording: **NOT COMPARED** — Dorar's «أصول الحديث» for this hadith has no صحيح مسلم entry.

Text as stored:

> حَدَّثَنَا أَبُو كُرَيْبٍ، حَدَّثَنَا وَكِيعٌ، وَأَبُو أُسَامَةَ عَنْ إِسْمَاعِيلَ بْنِ أَبِي خَالِدٍ، عَنْ قَيْسِ، بْنِ أَبِي حَازِمٍ عَنْ أَبِي هُرَيْرَةَ، قَالَ قَالَ رَسُولُ اللَّهِ صلى الله عليه وسلم ‏ "‏ تُقَاتِلُونَ بَيْنَ يَدَىِ السَّاعَةِ قَوْمًا نِعَالُهُمُ الشَّعَرُ كَأَنَّ وُجُوهَهُمُ الْمَجَانُّ الْمُطْرَقَةُ حُمْرُ الْوُجُوهِ صِغَارُ الأَعْيُنِ ‏"‏ ‏.‏

Separated saying (`matnText`):

> تُقَاتِلُونَ بَيْنَ يَدَىِ السَّاعَةِ قَوْمًا نِعَالُهُمُ الشَّعَرُ كَأَنَّ وُجُوهَهُمُ الْمَجَانُّ الْمُطْرَقَةُ حُمْرُ الْوُجُوهِ صِغَارُ الأَعْيُنِ

#### 6. صحيح مسلم، حديث رقم 1384 — short saying

- Record: `muslim:3356`
- Displayed hadith number: **1384**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/ZDr81gEh?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D8%A5%D9%86%D9%87%D8%A7%20%D8%B7%D9%8A%D8%A8%D8%A9%20%D9%8A%D8%B9%D9%86%D9%8A%20%D8%A7%D9%84%D9%85%D8%AF%D9%8A%D9%86%D8%A9%20%D9%88%D8%A5%D9%86%D9%87%D8%A7%20%D8%AA%D9%86%D9%81%D9%8A%20%D8%A7%D9%84%D8%AE%D8%A8%D8%AB%20%D9%83%D9%85%D8%A7&s%5B%5D=3088)
- Numbering: **Same.** Dorar lists this text under no. 1384.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» (صحيح مسلم (2/ 1006 ت عبد الباقي)), chain of narrators included: 44 words in common. **No word differences found.**

Text as stored:

> وَحَدَّثَنَا عُبَيْدُ اللَّهِ بْنُ مُعَاذٍ، - وَهُوَ الْعَنْبَرِيُّ - حَدَّثَنَا أَبِي، حَدَّثَنَا شُعْبَةُ، عَنْ عَدِيٍّ، - وَهُوَ ابْنُ ثَابِتٍ - سَمِعَ عَبْدَ اللَّهِ بْنَ يَزِيدَ، عَنْ زَيْدِ بْنِ ثَابِتٍ، عَنِ النَّبِيِّ صلى الله عليه وسلم قَالَ ‏ "‏ إِنَّهَا طَيْبَةُ - يَعْنِي الْمَدِينَةَ - وَإِنَّهَا تَنْفِي الْخَبَثَ كَمَا تَنْفِي النَّارُ خَبَثَ الْفِضَّةِ‏"‏ ‏.‏

Separated saying (`matnText`):

> إِنَّهَا طَيْبَةُ - يَعْنِي الْمَدِينَةَ - وَإِنَّهَا تَنْفِي الْخَبَثَ كَمَا تَنْفِي النَّارُ خَبَثَ الْفِضَّةِ

#### 7. صحيح مسلم، حديث رقم 1453 — long narrative

- Record: `muslim:3600` · number in the source file: 1453.01
- Displayed hadith number: **1453**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/wOwMOktW?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D8%B9%D9%84%D9%8A%D9%87%20%D9%88%D8%B3%D9%84%D9%85%20%D9%88%D9%82%D8%A7%D9%84%20%D9%82%D8%AF%20%D8%B9%D9%84%D9%85%D8%AA%20%D8%A3%D9%86%D9%87&s%5B%5D=3088)
- Numbering: **Same.** Dorar lists this text under no. 1453.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» ([صحيح مسلم] (2/ 1076 ت عبد الباقي)), chain of narrators included: 91 words in common. **Differences:**
  - Words in ours that are not in the book text: أُرْضِعُهُ
  - Words in the book text that are not in ours: أرضع

Text as stored:

> حَدَّثَنَا عَمْرٌو النَّاقِدُ، وَابْنُ أَبِي عُمَرَ، قَالاَ حَدَّثَنَا سُفْيَانُ بْنُ عُيَيْنَةَ، عَنْ عَبْدِ الرَّحْمَنِ، بْنِ الْقَاسِمِ عَنْ أَبِيهِ، عَنْ عَائِشَةَ، قَالَتْ جَاءَتْ سَهْلَةُ بِنْتُ سُهَيْلٍ إِلَى النَّبِيِّ صلى الله عليه وسلم فَقَالَتْ يَا رَسُولَ اللَّهِ إِنِّي أَرَى فِي وَجْهِ أَبِي حُذَيْفَةَ مِنْ دُخُولِ سَالِمٍ - وَهُوَ حَلِيفُهُ ‏.‏ فَقَالَ النَّبِيُّ صلى الله عليه وسلم ‏"‏ أَرْضِعِيهِ ‏"‏ ‏.‏ قَالَتْ وَكَيْفَ أُرْضِعُهُ وَهُوَ رَجُلٌ كَبِيرٌ فَتَبَسَّمَ رَسُولُ اللَّهِ صلى الله عليه وسلم وَقَالَ ‏"‏ قَدْ عَلِمْتُ أَنَّهُ رَجُلٌ كَبِيرٌ ‏"‏ ‏.‏ زَادَ عَمْرٌو فِي حَدِيثِهِ وَكَانَ قَدْ شَهِدَ بَدْرًا ‏.‏ وَفِي رِوَايَةِ ابْنِ أَبِي عُمَرَ فَضَحِكَ رَسُولُ اللَّهِ صلى الله عليه وسلم ‏.‏

#### 8. صحيح مسلم، حديث رقم 1547 — long narrative

- Record: `muslim:3944` · number in the source file: 1547.10
- Displayed hadith number: **1547**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/KKVK36NX?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D8%A7%D9%84%D8%A3%D8%B1%D8%B6%20%D9%82%D8%A7%D9%84%20%D8%B1%D8%A7%D9%81%D8%B9%20%D8%A8%D9%86%20%D8%AE%D8%AF%D9%8A%D8%AC%20%D9%84%D8%B9%D8%A8%D8%AF&s%5B%5D=3088)
- Numbering: **Same.** Dorar lists this text under no. 1547.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» (صحيح مسلم (3/ 1181 ت عبد الباقي)), chain of narrators included: 128 words in common. **Differences:**
  - Words in ours that are not in the book text: أَرَضِيهِ · وَكَانَا · شَهِدَا
  - Words in the book text that are not in ours: أرضه · وكان · شهد

Text as stored:

> وَحَدَّثَنِي عَبْدُ الْمَلِكِ بْنُ شُعَيْبِ بْنِ اللَّيْثِ بْنِ سَعْدٍ، حَدَّثَنِي أَبِي، عَنْ جَدِّي، حَدَّثَنِي عُقَيْلُ بْنُ خَالِدٍ، عَنِ ابْنِ شِهَابٍ، أَنَّهُ قَالَ أَخْبَرَنِي سَالِمُ بْنُ عَبْدِ اللَّهِ، أَنَّ عَبْدَ اللَّهِ بْنَ عُمَرَ، كَانَ يُكْرِي أَرَضِيهِ حَتَّى بَلَغَهُ أَنَّ رَافِعَ بْنَ خَدِيجٍ الأَنْصَارِيَّ كَانَ يَنْهَى عَنْ كِرَاءِ الأَرْضِ فَلَقِيَهُ عَبْدُ اللَّهِ فَقَالَ يَا ابْنَ خَدِيجٍ مَاذَا تُحَدِّثُ عَنْ رَسُولِ اللَّهِ صلى الله عليه وسلم فِي كِرَاءِ الأَرْضِ قَالَ رَافِعُ بْنُ خَدِيجٍ لِعَبْدِ اللَّهِ سَمِعْتُ عَمَّىَّ - وَكَانَا قَدْ شَهِدَا بَدْرًا - يُحَدِّثَانِ أَهْلَ الدَّارِ أَنَّ رَسُولَ اللَّهِ صلى الله عليه وسلم نَهَى عَنْ كِرَاءِ الأَرْضِ ‏.‏ قَالَ عَبْدُ اللَّهِ لَقَدْ كُنْتُ أَعْلَمُ فِي عَهْدِ رَسُولِ اللَّهِ صلى الله عليه وسلم أَنَّ الأَرْضَ تُكْرَى ثُمَّ خَشِيَ عَبْدُ اللَّهِ أَنْ يَكُونَ رَسُولُ اللَّهِ صلى الله عليه وسلم أَحْدَثَ فِي ذَلِكَ شَيْئًا لَمْ يَكُنْ عَلِمَهُ فَتَرَكَ كِرَاءَ الأَرْضِ ‏.‏

#### 9. صحيح مسلم، حديث رقم 615 — long narrative

- Record: `muslim:1397` · number in the source file: 615.03
- Displayed hadith number: **615**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/FqXXeywW?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D8%A3%D8%A8%D8%B1%D8%AF%D9%88%D8%A7%20%D8%B9%D9%86%20%D8%A7%D9%84%D8%B5%D9%84%D8%A7%D8%A9%20%D9%81%D8%A5%D9%86%20%D8%B4%D8%AF%D8%A9%20%D8%A7%D9%84%D8%AD%D8%B1&s%5B%5D=3088)
- Numbering: **Same.** Dorar lists this text under no. 615.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» (صحيح مسلم (1/ 430)), chain of narrators included: 101 words in common. **No word differences found.**

Text as stored:

> وَحَدَّثَنِي هَارُونُ بْنُ سَعِيدٍ الأَيْلِيُّ، وَعَمْرُو بْنُ سَوَّادٍ، وَأَحْمَدُ بْنُ عِيسَى، قَالَ عَمْرٌو أَخْبَرَنَا وَقَالَ الآخَرَانِ، حَدَّثَنَا ابْنُ وَهْبٍ، قَالَ أَخْبَرَنِي عَمْرٌو، أَنَّ بُكَيْرًا، حَدَّثَهُ عَنْ بُسْرِ بْنِ سَعِيدٍ، وَسَلْمَانَ الأَغَرِّ، عَنْ أَبِي هُرَيْرَةَ، أَنَّ رَسُولَ اللَّهِ صلى الله عليه وسلم قَالَ ‏"‏ إِذَا كَانَ الْيَوْمُ الْحَارُّ فَأَبْرِدُوا بِالصَّلاَةِ فَإِنَّ شِدَّةَ الْحَرِّ مِنْ فَيْحِ جَهَنَّمَ ‏"‏ ‏. قَالَ عَمْرٌو وَحَدَّثَنِي أَبُو يُونُسَ عَنْ أَبِي هُرَيْرَةَ أَنَّ رَسُولَ اللَّهِ صلى الله عليه وسلم قَالَ ‏"‏ أَبْرِدُوا عَنِ الصَّلاَةِ فَإِنَّ شِدَّةَ الْحَرِّ مِنْ فَيْحِ جَهَنَّمَ ‏"‏ ‏. قَالَ عَمْرٌو وَحَدَّثَنِي ابْنُ شِهَابٍ عَنِ ابْنِ الْمُسَيَّبِ وَأَبِي سَلَمَةَ عَنْ أَبِي هُرَيْرَةَ عَنْ رَسُولِ اللَّهِ صلى الله عليه وسلم بِنَحْوِ ذَلِكَ

#### 10. صحيح مسلم، حديث رقم 1929 — long narrative

- Record: `muslim:4974` · number in the source file: 1929.03
- Displayed hadith number: **1929**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/ek2qlAcR?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D9%81%D9%84%D8%A7%20%D8%AA%D8%A3%D9%83%D9%84%20%D9%81%D8%A5%D9%86%D9%87%20%D8%A5%D9%86%D9%85%D8%A7%20%D8%A3%D9%85%D8%B3%D9%83%20%D8%B9%D9%84%D9%89&s%5B%5D=3088)
- Numbering: **Same.** Dorar lists this text under no. 1929.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» (صحيح مسلم (3/ 1529 ت عبد الباقي)), chain of narrators included: 94 words in common. **No word differences found.**

Text as stored:

> وَحَدَّثَنَا عُبَيْدُ اللَّهِ بْنُ مُعَاذٍ الْعَنْبَرِيُّ، حَدَّثَنَا أَبِي، حَدَّثَنَا شُعْبَةُ، عَنْ عَبْدِ اللَّهِ بْنِ، أَبِي السَّفَرِ عَنِ الشَّعْبِيِّ، عَنْ عَدِيِّ بْنِ حَاتِمٍ، قَالَ سَأَلْتُ رَسُولَ اللَّهِ صلى الله عليه وسلم عَنِ الْمِعْرَاضِ فَقَالَ ‏"‏ إِذَا أَصَابَ بِحَدِّهِ فَكُلْ وَإِذَا أَصَابَ بِعَرْضِهِ فَقَتَلَ فَإِنَّهُ وَقِيذٌ فَلاَ تَأْكُلْ ‏"‏ ‏.‏ وَسَأَلْتُ رَسُولَ اللَّهِ صلى الله عليه وسلم عَنِ الْكَلْبِ فَقَالَ ‏"‏ إِذَا أَرْسَلْتَ كَلْبَكَ وَذَكَرْتَ اسْمَ اللَّهِ فَكُلْ فَإِنْ أَكَلَ مِنْهُ فَلاَ تَأْكُلْ فَإِنَّهُ إِنَّمَا أَمْسَكَ عَلَى نَفْسِهِ ‏"‏ ‏.‏ قُلْتُ فَإِنْ وَجَدْتُ مَعَ كَلْبِي كَلْبًا آخَرَ فَلاَ أَدْرِي أَيُّهُمَا أَخَذَهُ قَالَ ‏"‏ فَلاَ تَأْكُلْ فَإِنَّمَا سَمَّيْتَ عَلَى كَلْبِكَ وَلَمْ تُسَمِّ عَلَى غَيْرِهِ ‏"‏ ‏.‏

#### 11. صحيح مسلم، حديث رقم 1221 — long narrative

- Record: `muslim:2957` · number in the source file: 1221.01
- Displayed hadith number: **1221**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/UAMyt1Pm?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D9%81%D9%8A%20%D8%AE%D9%84%D8%A7%D9%81%D8%A9%20%D8%B9%D9%85%D8%B1%20%D8%B1%D8%B6%D9%89%20%D8%A7%D9%84%D9%84%D9%87%20%D8%B9%D9%86%D9%87&s%5B%5D=3088)
- Numbering: **Same.** Dorar lists this text under no. 1221.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» ([صحيح مسلم] (2/ 894 )), chain of narrators included: 172 words in common. **Differences:**
  - Words in ours that are not in the book text: يَا · عَبْدَ · عنه
  - Words in the book text that are not in ours: ياعبد · عليه · وسلم

Text as stored:

> حَدَّثَنَا مُحَمَّدُ بْنُ الْمُثَنَّى، وَابْنُ، بَشَّارٍ قَالَ ابْنُ الْمُثَنَّى حَدَّثَنَا مُحَمَّدُ بْنُ جَعْفَرٍ، أَخْبَرَنَا شُعْبَةُ، عَنْ قَيْسِ بْنِ مُسْلِمٍ، عَنْ طَارِقِ بْنِ شِهَابٍ، عَنْ أَبِي مُوسَى، قَالَ قَدِمْتُ عَلَى رَسُولِ اللَّهِ صلى الله عليه وسلم وَهُوَ مُنِيخٌ بِالْبَطْحَاءِ فَقَالَ لِي ‏"‏ أَحَجَجْتَ ‏"‏ ‏.‏ فَقُلْتُ نَعَمْ ‏.‏ فَقَالَ ‏"‏ بِمَ أَهْلَلْتَ ‏"‏ ‏.‏ قَالَ قُلْتُ لَبَّيْكَ بِإِهْلاَلٍ كَإِهْلاَلِ النَّبِيِّ صلى الله عليه وسلم ‏.‏ قَالَ ‏"‏ فَقَدْ أَحْسَنْتَ طُفْ بِالْبَيْتِ وَبِالصَّفَا وَالْمَرْوَةِ وَأَحِلَّ ‏"‏ ‏.‏ قَالَ فَطُفْتُ بِالْبَيْتِ وَبِالصَّفَا وَالْمَرْوَةِ ثُمَّ أَتَيْتُ امْرَأَةً مِنْ بَنِي قَيْسٍ فَفَلَتْ رَأْسِي ثُمَّ أَهْلَلْتُ بِالْحَجِّ ‏.‏ قَالَ فَكُنْتُ أُفْتِي بِهِ النَّاسَ حَتَّى كَانَ فِي خِلاَفَةِ عُمَرَ - رضى الله عنه - فَقَالَ لَهُ رَجُلٌ يَا أَبَا مُوسَى - أَوْ يَا عَبْدَ اللَّهِ بْنَ قَيْسٍ - رُوَيْدَكَ بَعْضَ فُتْيَاكَ فَإِنَّكَ لاَ تَدْرِي مَا أَحْدَثَ أَمِيرُ الْمُؤْمِنِينَ فِي النُّسُكِ بَعْدَكَ ‏.‏ فَقَالَ يَا أَيُّهَا النَّاسُ مَنْ كُنَّا أَفْتَيْنَاهُ فُتْيَا فَلْيَتَّئِدْ فَإِنَّ أَمِيرَ الْمُؤْمِنِينَ قَادِمٌ عَلَيْكُمْ فَبِهِ فَائْتَمُّوا ‏.‏ قَالَ فَقَدِمَ عُمَرُ - رضى الله عنه - فَذَكَرْتُ ذَلِكَ لَهُ فَقَالَ إِنْ نَأْخُذْ بِكِتَابِ اللَّهِ فَإِنَّ كِتَابَ اللَّهِ يَأْمُرُ بِالتَّمَامِ وَإِنْ نَأْخُذْ بِسُنَّةِ رَسُولِ اللَّهِ صلى الله عليه وسلم فَإِنَّ رَسُولَ اللَّهِ صلى الله عليه وسلم لَمْ يَحِلَّ حَتَّى بَلَغَ الْهَدْىُ مَحِلَّهُ ‏.‏

#### 12. صحيح مسلم، حديث رقم 1495 — long narrative

- Record: `muslim:3755` · number in the source file: 1495.01
- Displayed hadith number: **1495**
- Independent reference: [this hadith on Dorar, with «أصول الحديث»](https://dorar.net/h/OYJJrj6P?osoul=1) · [Dorar search used](https://dorar.net/hadith/search?q=%D8%A3%D9%88%20%D9%82%D8%AA%D9%84%20%D9%82%D8%AA%D9%84%D8%AA%D9%85%D9%88%D9%87%20%D8%A3%D9%88%20%D8%B3%D9%83%D8%AA%20%D8%B3%D9%83%D8%AA&s%5B%5D=3088)
- Numbering: **Same.** Dorar lists this text under no. 1495.
- Wording, compared with the book text Dorar quotes under «أصول الحديث» ([صحيح مسلم] (2/ 1133 )), chain of narrators included: 177 words in common. **Differences:**
  - Words in ours that are not in the book text: رَجُلاً · رَجُلاً
  - Words in the book text that are not in ours: رجل · رجل

Text as stored:

> حَدَّثَنَا زُهَيْرُ بْنُ حَرْبٍ، وَعُثْمَانُ بْنُ أَبِي شَيْبَةَ، وَإِسْحَاقُ بْنُ إِبْرَاهِيمَ، - وَاللَّفْظُ لِزُهَيْرٍ - قَالَ إِسْحَاقُ أَخْبَرَنَا وَقَالَ الآخَرَانِ، حَدَّثَنَا جَرِيرٌ، عَنِ الأَعْمَشِ، عَنْ إِبْرَاهِيمَ، عَنْ عَلْقَمَةَ، عَنْ عَبْدِ اللَّهِ، قَالَ إِنَّا لَيْلَةَ الْجُمُعَةِ فِي الْمَسْجِدِ إِذْ جَاءَ رَجُلٌ مِنَ الأَنْصَارِ فَقَالَ لَوْ أَنَّ رَجُلاً وَجَدَ مَعَ امْرَأَتِهِ رَجُلاً فَتَكَلَّمَ جَلَدْتُمُوهُ أَوْ قَتَلَ قَتَلْتُمُوهُ وَإِنْ سَكَتَ سَكَتَ عَلَى غَيْظٍ وَاللَّهِ لأَسْأَلَنَّ عَنْهُ رَسُولَ اللَّهِ صلى الله عليه وسلم ‏.‏ فَلَمَّا كَانَ مِنَ الْغَدِ أَتَى رَسُولَ اللَّهِ صلى الله عليه وسلم فَسَأَلَهُ فَقَالَ لَوْ أَنَّ رَجُلاً وَجَدَ مَعَ امْرَأَتِهِ رَجُلاً فَتَكَلَّمَ جَلَدْتُمُوهُ أَوْ قَتَلَ قَتَلْتُمُوهُ أَوْ سَكَتَ سَكَتَ عَلَى غَيْظٍ ‏.‏ فَقَالَ ‏"‏ اللَّهُمَّ افْتَحْ ‏"‏ ‏.‏ وَجَعَلَ يَدْعُو فَنَزَلَتْ آيَةُ اللِّعَانِ ‏{‏ وَالَّذِينَ يَرْمُونَ أَزْوَاجَهُمْ وَلَمْ يَكُنْ لَهُمْ شُهَدَاءُ إِلاَّ أَنْفُسُهُمْ‏}‏ هَذِهِ الآيَاتُ فَابْتُلِيَ بِهِ ذَلِكَ الرَّجُلُ مِنْ بَيْنِ النَّاسِ فَجَاءَ هُوَ وَامْرَأَتُهُ إِلَى رَسُولِ اللَّهِ صلى الله عليه وسلم فَتَلاَعَنَا فَشَهِدَ الرَّجُلُ أَرْبَعَ شَهَادَاتٍ بِاللَّهِ إِنَّهُ لَمِنَ الصَّادِقِينَ ثُمَّ لَعَنَ الْخَامِسَةَ أَنَّ لَعْنَةَ اللَّهِ عَلَيْهِ إِنْ كَانَ مِنَ الْكَاذِبِينَ فَذَهَبَتْ لِتَلْعَنَ فَقَالَ لَهَا رَسُولُ اللَّهِ صلى الله عليه وسلم ‏"‏ مَهْ ‏"‏ ‏.‏ فَأَبَتْ فَلَعَنَتْ فَلَمَّا أَدْبَرَا قَالَ ‏"‏ لَعَلَّهَا أَنْ تَجِيءَ بِهِ أَسْوَدَ جَعْدًا ‏"‏ ‏.‏ فَجَاءَتْ بِهِ أَسْوَدَ جَعْدًا‏.‏

## 2. Records kept outside this approval

These records are in the corpus, unmodified and pending. A collection approval, if you give one later, will not cover them; each would need its own decision. None of them is in the sample above.

### صحيح البخاري — outside this approval (638 records)

- **Damaged text** (16): bukhari:834, bukhari:1748, bukhari:2898, bukhari:3007, bukhari:3304, bukhari:3733, bukhari:4214, bukhari:4323, bukhari:4569, bukhari:4669, bukhari:4822, bukhari:4913, bukhari:5167, bukhari:6522, bukhari:7370, bukhari:7555
- **No hadith number in the source** (0): none
- **Decimal entries** (26): bukhari:402.2, bukhari:690.2, bukhari:774.2, bukhari:1132.2, bukhari:1199.2, bukhari:1228.2, bukhari:1390.2, bukhari:1390.3, bukhari:2214.2, bukhari:2239.2, bukhari:2240.2, bukhari:2437.2, bukhari:3562.2, bukhari:3595.2, bukhari:3756.2, bukhari:3963.2, bukhari:4931.2, bukhari:4945.2, bukhari:5032.2, bukhari:5037.2, bukhari:5051.2, bukhari:5441.2, bukhari:5470.2, bukhari:5944.2, bukhari:6895.2, bukhari:6908.2
- **Repeated-text groups** (291 groups, 596 records) — numbers that carry the same text: 272=273, 299=300=301, 329=330, 395=396, 408=409, 410=411, 435=436, 454=455, 478=479, 521=522, 533=534, 536=537, 570=571, 582=583, 622=623, 652=653=654, 655=656, 720=721, 818=819, 832=833, 839=840, 849=850, 896=897, 949=950, 958=959=960=961, 987=988, 1008=1009, 1049=1050, 1055=1056, 1065=1066, 1091=1092, 1121=1122, 1156=1157=1158, 1172=1173, 1180=1181, 1185=1186, 1191=1192, 1241=1242, 1249=1250, 1258=1259, 1281=1282, 1286=1287=1288, 1312=1313, 1323=1324, 1327=1328, 1347=1348, 1354=1355, 1363=1364, 1399=1400, 1407=1408, 1427=1428, 1456=1457, 1474=1475, 1481=1482, 1537=1538, 1543=1544, 1614=1615, 1623=1624, 1630=1631, 1641=1642, 1645=1646, 1669=1670, 1686=1687, 1694=1695, 1758=1759, 1760=1761, 1771=1772, 1775=1776, 1791=1792, 1793=1794, 1918=1919, 1925=1926, 1931=1932, 1991=1992, 1997=1998, 2030=2031, 2060=2061, 2123=2124, 2153=2154, 2172=2173, 2178=2179, 2180=2181, 2183=2184, 2201=2202, 2221=5531, 2232=2233, 2242=2243, 2247=2248, 2249=2250, 2254=2255, 2265=2266, 2285=2286, 2302=2303, 2307=2308, 2314=2315, 2340=2341, 2343=2344, 2346=2347, 2356=2357, 2359=2360, 2383=2384, 2405=2406, 2416=2417, 2497=2498, 2501=2502, 2505=2506, 2515=2516, 2539=2540, 2555=2556, 2583=2584, 2607=2608, 2615=2616, 2666=2667, 2669=2670, 2676=2677, 2695=2696, 2711=2712, 2724=2725, 2731=2732, 2788=2789, 2799=2800, 2805=2806, 2877=2878, 2894=2895, 2906=2907, 2940=2941, 2956=2957, 2962=2963, 2965=2966, 3024=3025, 3027=3028, 3035=3036, 3056=3057, 3078=3079, 3092=3093, 3131=3132, 3156=3157, 3159=3160, 3164=3165, 3186=3187, 3252=3253, 3272=3273, 3297=3298, 3310=3311, 3312=3313, 3362=3363, 3395=3396, 3414=3415, 3426=3427, 3439=3440, 3450=3451=3452, 3453=3454, 3486=3487, 3493=3494, 3495=3496, 3529=3530, 3567=3568, 3587=3588=3589, 3601=3602, 3620=3621, 3623=3624, 3625=3626, 3642=3643, 3667=3668, 3669=3670, 3711=3712, 3715=3716, 3722=3723, 3738=3739, 3740=3741, 3759=3760, 3939=3940, 3978=3979, 3980=3981, 4012=4013, 4016=4017, 4033=4034, 4035=4036, 4043=4044, 4060=4061, 4079=4080, 4157=4158, 4160=4161, 4178=4179, 4180=4181, 4221=4222, 4223=4224, 4240=4241, 4244=4245, 4246=4247, 4253=4254, 4282=4283, 4305=4306, 4307=4308, 4318=4319, 4326=4327, 4341=4342, 4344=4345, 4353=4354, 4373=4374, 4376=4377, 4378=4379, 4402=4403, 4433=4434, 4443=4444, 4452=4453=4454, 4455=4456=4457, 4464=4465, 4513=4514=4515, 4524=4525, 4526=4527, 4549=4550, 4828=4829, 4879=4880, 4978=4979, 5110=5111, 5117=5118, 5143=5144, 5185=5186, 5208=5209, 5271=5272, 5321=5322, 5323=5324, 5325=5326, 5327=5328, 5525=5526, 5614=5682, 5641=5642, 5692=5693, 5698=5699, 5700=5701, 5719=5720=5721, 5759=5760, 5780=5781, 5815=5816, 5908=5909, 5911=5912, 6026=6027, 6089=6090, 6142=6143, 6282=6283, 6285=6286, 6378=6379, 6380=6381, 6567=6568, 6599=6600, 6633=6634, 6659=6660, 6676=6677, 6725=6726, 6766=6767, 6815=6816, 6825=6826, 6827=6828, 6831=6832, 6835=6836, 6837=6838, 6842=6843, 6859=6860, 6865=6866, 6887=6888, 6905=6906, 6907=6908, 6924=6925, 6957=6958, 7001=7002, 7015=7016, 7028=7029, 7030=7031, 7036=7037, 7055=7056, 7062=7063, 7102=7103=7104, 7105=7106=7107, 7176=7177, 7183=7184, 7193=7194, 7199=7200, 7222=7223, 7258=7259, 7278=7279, 7284=7285, 7317=7318, 7327=7328, 7340=7341, 7350=7351, 7387=7388, 7412=7413, 7427=7428, 7437=7438, 7495=7496

### صحيح مسلم — outside this approval (186 records)

- **Damaged text** (16): muslim:305, muslim:403, muslim:1522, muslim:2363, muslim:2626, muslim:2990, muslim:4087, muslim:4607, muslim:5519, muslim:5520, muslim:5770, muslim:6165, muslim:6270, muslim:6364, muslim:6459, muslim:7512
- **No hadith number in the source** (148): muslim:3, muslim:4, muslim:15, muslim:1220, muslim:1350, muslim:1354, muslim:1365, muslim:1718, muslim:2045, muslim:2046, muslim:2057, muslim:2058, muslim:2093, muslim:2100, muslim:2101, muslim:2104, muslim:2105, muslim:2149, muslim:2150, muslim:2225, muslim:2232, muslim:2243, muslim:2892, muslim:2893, muslim:2978, muslim:2979, muslim:3023, muslim:3028, muslim:3029, muslim:3087, muslim:3092, muslim:3093, muslim:3108, muslim:3109, muslim:3222, muslim:3223, muslim:3224, muslim:3225, muslim:3226, muslim:3227, muslim:3228, muslim:3229, muslim:3499, muslim:3695, muslim:3725, muslim:3726, muslim:3727, muslim:3730, muslim:3792, muslim:3842, muslim:4251, muslim:4252, muslim:4435, muslim:4504, muslim:4505, muslim:4521, muslim:4522, muslim:4680, muslim:4681, muslim:4725, muslim:4726, muslim:4747, muslim:4748, muslim:4780, muslim:4781, muslim:4819, muslim:4820, muslim:4905, muslim:4906, muslim:4968, muslim:4969, muslim:4970, muslim:4971, muslim:5112, muslim:5113, muslim:5204, muslim:5207, muslim:5208, muslim:5519, muslim:5521, muslim:5522, muslim:5539, muslim:5540, muslim:5556, muslim:5557, muslim:5569, muslim:5570, muslim:5571, muslim:5572, muslim:5669, muslim:5670, muslim:5762, muslim:5764, muslim:5826, muslim:5827, muslim:5885, muslim:5886, muslim:5935, muslim:5968, muslim:5971, muslim:5990, muslim:5991, muslim:6015, muslim:6179, muslim:6180, muslim:6200, muslim:6201, muslim:6410, muslim:6414, muslim:6415, muslim:6505, muslim:6506, muslim:6544, muslim:6545, muslim:6625, muslim:6626, muslim:6711, muslim:6712, muslim:6855, muslim:6856, muslim:6879, muslim:6918, muslim:6919, muslim:6929, muslim:6961, muslim:6962, muslim:6981, muslim:6989, muslim:6990, muslim:7017, muslim:7018, muslim:7076, muslim:7077, muslim:7080, muslim:7081, muslim:7111, muslim:7112, muslim:7138, muslim:7141, muslim:7302, muslim:7319, muslim:7354, muslim:7355, muslim:7368, muslim:7498, muslim:7499, muslim:7512, muslim:7555
- **Decimal entries** (0): none
- **Repeated-text groups** (67 groups, 137 records) — numbers that carry the same text: 919=931, 2045=2046, 2057=2058, 2093=2094, 2100=2101, 2104=2105, 2225=2226, 2232=2233, 2243=2244, 2892=2893, 2978=2979, 3028=3029, 3092=3093, 3108=3109, 3695=3696, 3725=3726=3727=3728, 3730=3731, 3792=3793, 4251=4252, 4504=4505, 4521=4522, 4680=4681, 4725=4726, 4747=4748, 4780=4781, 4819=4820, 4905=4906, 5112=5113, 5519=5520, 5521=5522, 5539=5540, 5556=5557, 5569=5570, 5571=5572, 5669=5670, 5762=5763, 5764=5765, 5826=5827, 5885=5886, 5968=5969, 5971=5972, 5990=5991, 6015=6016, 6179=6180, 6200=6201, 6410=6411, 6414=6415, 6505=6506, 6544=6545, 6625=6626, 6682=7190, 6711=6712, 6855=6856, 6879=6880, 6918=6919, 6929=6930, 6961=6962, 6981=6982, 6989=6990, 7017=7018, 7076=7077, 7080=7081, 7111=7112, 7138=7139, 7141=7142, 7354=7355=7356, 7498=7499

Empty entries in the source file were never imported and are listed in `docs/SOURCES.md`.

## 3. What this sample does and does not show

- It covers 24 records out of 14116 eligible. It cannot show that the other records are correct.
- The Dorar comparison was done by a script. Read the texts yourself before deciding.
- No approval has been recorded. To approve a book, tell me so explicitly.
