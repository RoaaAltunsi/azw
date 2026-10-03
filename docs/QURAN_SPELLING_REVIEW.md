# Quran spelling — review sheet for the owner

Status: **reviewed by the owner on 2026-10-03.** The accepted rows are in
`data/aliases/quran-spelling-variants.json`; the decision is recorded in `docs/SOURCES.md`
section 5 item 3 and `docs/DECISIONS.md` D-9.

- Part 1 is the list of words for **Problem A** (you review it row by row).
- Part 2 explains **Problem B** (Uthmani paste) with an example.

How the list was made: a read-only scan of `data/corpus/quran.json` on 2026-10-03.
The "source form" and the ayah numbers come from our Quran text.
The "everyday form" is **my suggestion** from ordinary Arabic spelling rules. It does not come from
a source, so it is the part you need to check.

---

## Part 1 — Problem A: words to review

### What you are approving

Each row says: "when the writer types the **everyday form** in this ayah, treat it as the same word
as the **source form**". The app still shows the source text exactly as it is.

Mark each row: ✅ accept, ❌ reject, or ✏️ and write the correct form.

### One important rule: each pair is tied to its ayat

A pair must work only in the listed ayat, not in the whole Quran. Example:

| Ayah | Source word | What it is |
|---|---|---|
| 3:61 | لَعْنَتَ اللَّهِ | noun, everyday spelling «لعنة» → should be bridged |
| 7:38 | لَعَنَتْ أُخْتَهَا | verb, everyday spelling is also «لعنت» → must **not** be bridged |

Without diacritics both are «لعنت». A pair that worked everywhere would make «لعنة أختها» look
correct in 7:38, and it is not.

### A1. Open ta (ت) where everyday spelling writes ة

17 words, 53 places.

| # | Source form | Everyday form | Places | Ayat | Your decision |
|---|---|---|---|---|---|
| 1 | نعمت، بنعمت، وبنعمت | نعمة، بنعمة، وبنعمة | 11 | 2:231، 3:103، 5:11، 14:28، 14:34، 16:72، 16:83، 16:114، 31:31، 35:3، 52:29 | ✅ |
| 2 | رحمت، ورحمت | رحمة، ورحمة | 7 | 2:218، 7:56، 11:73، 19:2، 30:50، 43:32 (twice) | ✅ |
| 3 | امرأت، وامرأت | امرأة، وامرأة | 7 | 3:35، 12:30، 12:51، 28:9، 66:10 (twice)، 66:11 | ✅ |
| 4 | كلمت | كلمة | 5 | 6:115، 7:137، 10:33، 10:96، 40:6 | ✅ |
| 5 | سنت، لسنت | سنة، لسنة | 5 | 8:38، 35:43 (three times)، 40:85 | ✅ |
| 6 | مرضات | مرضاة | 4 | 2:207، 2:265، 4:114، 66:1 | ✅ |
| 7 | لعنت | لعنة | 2 | 3:61، 24:7 (not 7:38, see above) | ✅ |
| 8 | ومعصيت | ومعصية | 2 | 58:8، 58:9 | ✅ |
| 9 | غيابت | غيابة | 2 | 12:10، 12:15 | ✅ |
| 10 | بقيت | بقية | 1 | 11:86 | ✅ |
| 11 | قرت | قرة | 1 | 28:9 | ✅ |
| 12 | فطرت | فطرة | 1 | 30:30 | ✅ |
| 13 | بينت | بينة | 1 | 35:40 | ✅ |
| 14 | شجرت | شجرة | 1 | 44:43 | ✅ |
| 15 | وجنت | وجنة | 1 | 56:89 | ✅ |
| 16 | ابنت | ابنة | 1 | 66:12 | ✅ |
| 17 | جمالت | جمالة | 1 | 77:33 — I am not sure writers type this one with ة | ✅ |

### A2. Hamza that everyday spelling writes on a waw (ؤ)

Here ordinary spelling is clearly different from the source. 17 word groups, 49 places.

| # | Source form | Everyday form | Places | Ayat | Your decision |
|---|---|---|---|---|---|
| 1 | رءوف، لرءوف | رؤوف، لرؤوف | 11 | 2:143، 2:207، 3:30، 9:117، 9:128، 16:7، 16:47، 22:65، 24:20، 57:9، 59:10 | ✅ |
| 2 | رءوس، رءوسكم، رءوسهم، برءوسكم | رؤوس، رؤوسكم، رؤوسهم، برؤوسكم | 11 | 2:196، 2:279، 5:6، 14:43، 17:51، 21:65، 22:19، 32:12، 37:65، 48:27، 63:5 | ✅ |
| 3 | مسئولا، مسئولون | مسؤولا، مسؤولون | 5 | 17:34، 17:36، 25:16، 33:15، 37:24 | ✅ |
| 4 | يئوسا، ليئوس، فيئوس | يؤوسا، ليؤوس، فيؤوس | 3 | 17:83، 11:9، 41:49 | ✅ |
| 5 | اقرءوا، فاقرءوا | اقرؤوا، فاقرؤوا | 3 | 69:19، 73:20 (twice) | ✅ |
| 6 | يطئون، تطئوها، تطئوهم | يطؤون، تطؤوها، تطؤوهم | 3 | 9:120، 33:27، 48:25 | ✅ |
| 7 | يقرءون | يقرؤون | 2 | 10:94، 17:71 | ✅ |
| 8 | ويدرءون | ويدرؤون | 2 | 13:22، 28:54 | ✅ |
| 9 | فادرءوا | فادرؤوا | 1 | 3:168 | ✅ |
| 10 | تبرءوا | تبرؤوا | 1 | 2:167 | ✅ |
| 11 | بدءوكم | بدؤوكم | 1 | 9:13 | ✅ |
| 12 | مبرءون | مبرؤون | 1 | 24:26 | ✅ |
| 13 | تبوءوا | تبوؤوا | 1 | 59:9 | ✅ |
| 14 | مذءوما | مذؤوما | 1 | 7:18 | ✅ |
| 15 | الموءودة | الموؤودة | 1 | 81:8 | ✅ |
| 16 | يئوده | يؤوده | 1 | 2:255 | ✅ |
| 17 | اخسئوا | اخسؤوا | 1 | 23:108 | ✅ |

### A3. Optional: the source form is already ordinary spelling, but many people type ؤ

For these words the source spelling is also a correct everyday spelling. Some writers type a
different form. You decide per group whether to bridge it.

| # | Source forms | Form some writers type | Places | My suggestion | Your decision |
|---|---|---|---|---|---|
| 1 | جاءوا، وجاءوا، جاءوك، جاءوكم، جاءوها، فجاءوهم | جاؤوا، وجاؤوا، جاؤوك … | 22 | Accept: «جاؤوا» is very common | ✅ |
| 2 | يشاءون، تشاءون، يراءون | يشاؤون، تشاؤون، يراؤون | 9 | Accept | ✅ |
| 3 | وباءوا، فباءوا، فاءوا، أساءوا، ليسوءوا | وباؤوا، فباؤوا، فاؤوا، أساؤوا، ليسوؤوا | 7 | Accept | ✅ |
| 4 | يستهزئون، مستهزئون، تستهزئون، استهزئوا | يستهزؤون، مستهزؤون … | 17 | Skip: less common | ❌ (I mean follow your suggestion of skipping them) |
| 5 | أنبئوني، نبئوني، أتنبئون، تنبئونه، ويستنبئونك، والصابئون، يضاهئون، يطفئوا، ليطفئوا، ليواطئوا، بريئون، فمالئون، متكئون، يتكئون، المنشئون، الخاطئون | the same words with ؤ | 17 | Skip: less common | ❌ (I mean follow your suggestion of skipping them) |

If you accept a group, I will list its ayat one by one, as in A1 and A2.

### A4. داوود and مائة

| # | Source form | Everyday form | Places | Ayat | Your decision |
|---|---|---|---|---|---|
| 1 | داوود، وداوود، لداوود | داود، وداود، لداود | 16 | 2:251، 4:163، 5:78، 6:84، 17:55، 21:78، 21:79، 27:15، 27:16، 34:10، 34:13، 38:17، 38:22، 38:24، 38:26، 38:30 | ✏️ No actually we write it as the source in our everyday |
| 2 | مائة | مئة | 8 | 2:259 (twice)، 2:261، 8:65، 8:66، 18:25، 24:2، 37:147 | ✅ |
| 3 | مائتين | مئتين | 2 | 8:65، 8:66 | ✅ |

### A5. Two more that the first scan did not look for

I found these while preparing this sheet.

| # | Source form | Everyday form | Places | Ayat | Your decision |
|---|---|---|---|---|---|
| 1 | إِذًا (written «إذا») | إذن | 26 | 2:145، 4:140، 5:106، 5:107، 6:56، 7:90، 10:106، 11:31، 12:14، 12:79، 15:8، 17:42، 17:75، 17:100، 18:14، 18:20، 18:57، 23:34، 23:91، 26:20، 26:42، 29:48، 36:24، 53:22، 54:24، 79:12 | ❌ |
| 2 | أَيُّهَ (written «أيه») | أيها | 3 | 24:31، 43:49، 55:31 | ✅ |

Row 1 shows again why pairs must be tied to ayat: «إذا» meaning "when" is in hundreds of other ayat
and must never be treated as «إذن».

### No action needed

«الملإ، نبإ، حمإ، يشإ، سبإ، ملجإ» (hamza under a final alif, 18 places). The normal cleaning already
makes them equal to «الملأ، نبأ …».

### What this sheet does not cover

- I searched for known patterns. I did **not** compare the whole text word by word with an
  everyday-spelling Quran, so other mushaf spellings may still exist.
- I did not check words that the mushaf joins or splits differently from everyday writing
  (for example «فيما» / «في ما»).

A full check needs a second Quran text to compare against. That is also what Problem B needs.

---

## Part 2 — Problem B: pasting Uthmani script

### The idea in one line

Many writers do not type the ayah. They copy it from a mushaf website or app. Those sites often use
**Uthmani script** (الرسم العثماني), which spells many words differently from the text we store.

### A real example (surah al-Asr, ayah 2)

This is our eval case `T-007`. The pasted text is the real Uthmani text of the ayah.

| | Text |
|---|---|
| What the writer pastes (Uthmani) | إِنَّ ٱلْإِنسَٰنَ لَفِى خُسْرٍ |
| What our source has | إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ |

Look at the second word:

- Our source writes the letter alif: الإنس**ا**ن.
- Uthmani script does not write that alif as a letter. It writes a small mark above the line: الإنسٰن.

Now the app "cleans" both texts (removes marks and tashkeel). I ran our real code on both:

| | After cleaning |
|---|---|
| Pasted text | ان **الانسن** لفي خسر |
| Our source | ان **الانسان** لفي خسر |

The small alif was a mark, so it was removed. The pasted word lost its alif, and the two words are
no longer equal.

**Result today:** the app says «مختلف في اللفظ» for an ayah that was copied correctly from a mushaf.
That is a false alarm, and it would happen often.

A second example of the same kind: «ٱلْعَٰلَمِينَ» (Uthmani) becomes «العلمين», while our
«الْعَالَمِينَ» becomes «العالمين».

### Why a simple rule does not fix it

You may think: "turn the small alif into a real alif instead of removing it". That breaks our own text:

| Word | Small alif is… | Right action |
|---|---|---|
| الإنسٰن (Uthmani paste) | a real alif that everyday spelling writes | turn it into ا |
| الرَّحْمَٰن (in our source) | an alif that everyday spelling does **not** write («الرحمن») | remove it |

The same mark needs opposite actions in the two cases. One rule cannot do both.

### Why the word list from Part 1 does not fix it

Part 1 is about 100 words. Uthmani script differs in a very large number of words across the whole
Quran (I have not counted them). A hand-reviewed list of that size is not realistic.

### The fix: a second text, for search only

Store **two** search copies for each ayah:

1. the cleaned everyday text (what we have now),
2. the cleaned Uthmani text of the same ayah (new).

The writer's quote is compared with both. If it equals either one, it is the same ayah.
The app still **shows** only our current source text, with its reference.

| Good | Cost |
|---|---|
| Uthmani pastes match, with no hand-made rules | A new source: we must pick it, check its licence, and add it to `docs/SOURCES.md` |
| The same second text can find the spellings Part 1 may have missed | We must check that both texts have the same 6236 ayat in the same order |

First thing to check: whether Quranpedia's dump (the source we already use) has an Uthmani mushaf.
If yes, the source and the credit stay the same.

### If there is no time for it

Then the honest choice is:

- change the label of eval case `T-007` (it cannot stay MATCH), and
- say in the docs and in the UI help that Uthmani-script pastes may be shown as «مختلف» because of
  spelling only.

### Your decision for Problem B

- ✅ Add a second (Uthmani) search text
- ☐ Do not add it now; relabel `T-007` and document the limit
