How the corups built in the first place?

one script, scripts/build-corpus.ts (npm run build:corpus), reads the raw files and writes one clean JSON file per source in data/corpus/. It never edits the raw files and never changes a source text. It only adds things around the text: an id, a search copy, a citation, and a review status.

Every raw entry becomes a record with the same shape, in six steps.

Step 1: Read and check the shape

Each raw file is validated against a schema. A wrong shape stops the build.

Step 2: Keep the display text (exactText)

The text is copied as it is. The only cleanup is on the Quran: an invisible character (BOM) at the
start of 6,124 ayat is removed.

raw:       "\uFEFFارًسْيُ رِسْعُلْا عَمَ نَّإِ"
exactText: "ارًسْيُ رِسْعُلْا عَمَ نَّإِ"

Hadith entries with empty text are skipped: 9 in Bukhari, 203 in Muslim.

Step 3: Make a search copy (searchText)

This is a simplified copy used only to find matches and is never shown. It removes diacritics and
punctuation and unifies letters (ه→lso removes honorific phrases like.»ملسو هيلع هللا ىلص«

exactText:  رِبَنْمِلْا ىلَعَ هُنْعَ هُلَّلا يَضِرَ بِاطَّخَلْا نَبْ رَمَعُ تُعْمِسَ
searchText: ربنملا يلع باطخلا نب رم

So a writer who types without diacr

Step 4: Add extra search helpers

- Quran: a Uthmani variant. The sammushafs-2.json) is normalized andstored in searchVariants. It lets a paste in mushaf script, such as «رِسۡعُلۡٱ», still find the ayah.
  It is for search only.
- Hadith: matnText. This is the Prophet's ﷺ words without the chain of narrators. It is stored only
  when the text has exactly one cler phrase like «ﷺ هللا لوسر لاق». That is 1,016 Bukhari and 1,110 Muslim records. bukhari:1 gets none because its quote is never closed
  in the source.

Step 5: Build the id and the citati

┌─────────┬─────────────────────────────────────────────────┐
│ Source  │                 Raw                  │     id     │      Shown citation      │
├─────────┼─────────────────────────────────────────────────┤
│ Quran   │ surah 94, ayah 6                     │ quran:94:6 │ 6 ةيآلا ،حرشلا ةروس      │
├─────────┼─────────────────────────────────────────────────┤
│ Bukhari │ hadithnumber: 1                      │ bukhari:1  │ 1 مقر ثيدح ،يراخبلا حيحص │
├─────────┼─────────────────────────────────────────────────┤
│ Muslim  │ hadithnumber: 93, arabicnumber: 8.01 │ muslim:93  │ 8 مقر ثيدح ،ملسم حيحص    │
└─────────┴─────────────────────────────────────────────────┘

For Muslim, the id uses the file's  number is the Abd al-Baqi numberthat people actually cite.

Step 6: Set the review status and the grade

Every record starts as pending. It becomes reviewed only if data/review/reviewed.json approves its
collection and the record has none

- no citation number (148 Muslim re
- damaged characters in the text (16 in each book)
- a split entry such as bukhari:402
- the same text repeated under several numbers (596 Bukhari records, 137 Muslim)
- text that does not open with «تعمhari, 30 Muslim)
- listed in held-records.json (2 Bukhari)

Only a reviewed hadith gets the grade حيحص, attributed to its book. A pending record has no grade and
can never produce a MATCH.

bukhari:1 → opens with «انثدح», cle: )يراخبلا حيحص( حيحص
bukhari:4 → opens with «باهش نبا لاق…»         → pending, no grade

What comes out

┌──────────────┬─────────┬──────────┬─────────┐
│     File     │ Records │ Reviewed
├──────────────┼─────────┼──────────┼─────────┤
│ quran.json   │ 6,236   │ 6,236
├──────────────┼─────────┼──────────┼─────────┤
│ bukhari.json │ 7,580   │ 6,701
├──────────────┼─────────┼──────────┼─────────┤
│ muslim.json  │ 7,360   │ 7,145
└──────────────┴─────────┴──────────┴─────────┘

The build also writes:
- manifest.json: sources, licences, corpus version (p2-e2bfaf5a3ad2).
- build-report.json: the lists of skipped and flagged records.
- data/aliases/surahs.json: surah n

A separate script, npm run verify:cult, for example 114 surahs, 6,236ayat, unique ids, and that each searchText still equals its normalized exactText.

A natural next step is how the app loads these files and searches them at runtime (the in-memory index).


- - - -


Short answer: when the first request arrives, the server reads the corpus files once, checks them, and builds a search index in memory. After that, every quote is searched in that index in two ways: "is it there word for word?" and "which records are closest?". There is no database.

I ran the real loader to get the examples below: it loaded 21,176 records in about 0.7 seconds.

Part 1: Loading (src/server/corpus-loader.ts)

Three steps, and any failure stops the app (a half-loaded corpus must never answer).

1. read      manifest.json → the 3 cles
2. validate  each file's checksum and record count must equal the manifest
3. build     one adapter per file →

Example. If someone edits one letterchecksum no longer equals the one inthe manifest, and the loader refuses to start. This is why the corpus is only ever rebuilt by script.

The result is kept in memory and reused for all later requests.

Part 2: Adapters and layers (src/core/corpus/adapter.ts)

An adapter tells the index two things about a collection.

a) Its layers. A layer is one searchable copy of the text.

┌─────────────────┬──────────┬────────────────────────────────────────────────────────┐
│   Collection    │  Layer   │                            │
├─────────────────┼──────────┼────────────────────────────────────────────────────────┤
│ quran           │ default  │ searc                      │
├─────────────────┼──────────┼────────────────────────────────────────────────────────┤
│ quran           │ uthmani  │ the Ud                     │
├─────────────────┼──────────┼────────────────────────────────────────────────────────┤
│ quran           │ everyday │ searcling pairs swapped in │
├─────────────────┼──────────┼────────────────────────────────────────────────────────┤
│ bukhari, muslim │ default  │ searc                      │
└─────────────────┴──────────┴────────────────────────────────────────────────────────┘

The everyday layer is built at load time from data/aliases/quran-spelling-variants.json; it is not
stored in the corpus. For example, a

default:  ... نينسحملا نم بيرق هللا
everyday: ... نينسحملا نم بيرق هللا همحر نا

b) Its units. A unit is a group of records that may be joined.
- Quran: one unit per surah, so a qut.
- Hadith: one unit per hadith, so a quote never crosses two hadiths.

Part 3: The index (src/core/corpus/corpus-index.ts)

For each layer the index holds one long text plus a table of word pairs. It answers two questions.

Question 1: findExact — is the quote there word for word?
The quote is normalized the same way as whole words.

draft quote: ارسي رسعُلا عم نَّإ
normalized:  ارسي رسعلا عم نا
result:      found in quran:94:6

A quote over two ayat is one hit, be

quran:112:1 + quran:112:2  →  دمصلا

It works inside a long hadith too:

bukhari:1 (characters 203–245 of itsا لكل امنإو تاينلاب لامعألا امنإ

Question 2: candidates — which recor
This is used when the wording is not exact. The quote is cut into word pairs, and the score is the
share of those pairs that a record c

draft quote: اريبك ارسي رسعلا عم نإ يبك»)
exact:       none
pairs:       "اريبك ارسي" ,"ارسي رسع
quran:94:6   has 3 of 4 → score 0.75   ← best candidate
quran:94:5   has 2 of 4 → score 0.50

Why three Quran layers: one example

The writer types «ةمحر», but the mus

quote: نينسحملا نم بيرق هللا ةمحر نإ
default layer   → no exact hit (best candidate 7:56, score 0.60)
everyday layer  → exact hit in quran

In the same way, a paste in mushaf sd through the uthmani layer.

What the index does not do

It only finds. It does not decide a og the quote. Those belong to thematchers and the status rules, which read exactText for display and diff.                    
A natural next step is how a matcher uses these hits and candidates to reach MATCH, DIFFERS, NOT_FOUND or NEEDS_SPECIALIST.

A natural next step is how a matcher uses these hits and candidates to reach MATCH, DIFFERS, NOT_FOUND or NEEDS_SPECIALIST.


- - - -


Short answer: two parts work one after the other. A matcher finds where the quote stands in the corpus and reports facts. Then the /decide.ts), a single pure function,read those facts and choose the status. The matcher never decides, and the LLM never decides.

All the examples below are real results: I ran each draft through the pipeline.

Part 1: What a matcher reports

There is one matcher per kind (quran, hadith), and every quote goes to both, because a "hadith" may
really be a verse. For each place icandidate with these facts:

┌───────────┬───────────────────────────┬───────────────────────────┐
│   Fact    │                        Meaning                         │          Example          │
├───────────┼───────────────────────────┼───────────────────────────┤
│ hit       │ exact = word for word; fuzzy = close only              │ exact                     │
├───────────┼───────────────────────────┼───────────────────────────┤
│ score     │ matching quote words ÷ all quote words                 │ 4 of 5 → 0.80             │
├───────────┼───────────────────────────┼───────────────────────────┤
│ spelling  │ same, bridged (an approved spelling), or error         │ «ةمحر» for «تمحر» in 7:56 │
│           │                           │  → bridged                │
├───────────┼────────────────────────────────────────────────────────┼───────────────────────────┤
│ reference │ the cited reference a     │ cites ayah 7, found in 6  │
│           │ consistent, mismatch, unchecked                        │ → mismatch                │
├───────────┼───────────────────────────┼───────────────────────────┤
│ records   │ the source records, each with its reviewStatus         │ quran:94:6, reviewed      │
└───────────┴───────────────────────────┴───────────────────────────┘

This score is not the index score fs word-pair score only picks thenearest records; the matcher then lines the quote up against each one, word by word, and counts the
equal words.

Part 2: The rules, in order

The first rule that fits wins.

0. Is it a claim, not a quote (inte   → NEEDS_SPECIALIST
1. Found word for word?
     a. only in another kind (a ver   → DIFFERS  / KIND_MISMATCH
     b. reference agrees                                           → MATCH    / MATCH_REF_OK
     c. reference could not be comp   → NEEDS_SPECIALIST /REF_NOT_CHECKED
     d. reference contradicts         → DIFFERS  / REF_MISMATCH_…
     e. no reference given                                         → MATCH    / MATCH_NO_REFERENCE
2. Found only through a spelling er   → DIFFERS  / WORDING_DIFF
3. Close candidates only:
     best score < 0.5                 → NOT_FOUND
     two different texts within 0.05 of each other                 → NEEDS_SPECIALIST /
AMBIGUOUS_CANDIDATES
     score < 0.8 (and the reference does not name this place)      → NEEDS_SPECIALIST /
LOW_CONFIDENCE_MATCH
     otherwise                                                     → DIFFERS  / WORDING_DIFF

One guard sits on top of every MATCH and DIFFERS: the result must rest on a reviewed record. If only
pending records were found, the resRCE_NOT_REVIEWED. This is where thepending flag from the build step takes effect.

Examples, one per status

MATCH
draft:  ]6 :حرشلا[ ﴾ارسي رسعلا عم ن
 1. match   → exact in quran:94:6, reference consistent
 2. rule 1b → MATCH / MATCH_REF_OK
Without the [6 :حرشلا] it is still MATCH (MATCH_NO_REFERENCE), and the sentence suggests adding the
reference.

DIFFERS, wrong reference
draft:  ]7 :حرشلا[ ﴾ارسي رسعلا عم نإ﴿ :ىلاعت لاق
 1. match   → exact in quran:94:6,
 2. rule 1d → DIFFERS / REF_MISMATCH_AYAH

DIFFERS, wrong wording
draft:  ]6 :حرشلا[ ﴾اميظع ارسي رسعل
 1. match   → no exact hit; closest is quran:94:6, score 0.80 (4 of 5 words)
 2. rule 3  → 0.80 reaches the 0.8

DIFFERS, wrong kind
draft:  ارسي رسعلا عم نإ« :ﷺ هللا لوسر لاق»
 1. match   → exact, but only in th in the hadith books
 2. rule 1a → DIFFERS / KIND_MISMATCH

NEEDS_SPECIALIST
draft:  ادج اريبك ارسي رسعلا عم نإ﴿
 1. match   → closest is quran:94:6, score 0.67 (4 of 6 words)
 2. rule 3  → between 0.5 and 0.8, ST / LOW_CONFIDENCE_MATCH
The tool is not sure enough to say "you meant this ayah", so it does not correct.

NOT_FOUND
draft:  نيصلا يف ولو ملعلا اوبلطا«
 1. match   → nothing reaches 0.5
 2. rule 3  → NOT_FOUND / NO_RECORD
The sentence says it was not found in the covered sources and that this is not a judgment on the
text.

Two cases worth knowing

- Approved spelling still matches. إ» is MATCH on quran:7:56, becausethe «تمحر/ةمحر» pair is on the approved list for that ayah (bridged).
- A repeated verse is one result. «TCH: it shows the first 5 places(55:13, 16, 18, 21, 23) and the sentence counts the rest («ىرخألا عضاوملا نم 30 يفو»). Same wording
  in many places is not ambiguity.

After the decision

The orchestrator (src/core/review.tainst exactText, the Arabic reasonsentence for the reason code, and the optional correction the writer may apply.                 
A natural next step is how the quotes are pulled out of the draft in the first place (the regex extractor and the LLM extractor).


- - - -


Short answer: two extractors read the draft side by side: a regex extractor (rules, always runs) and an LLM extractor (optional). Each proposes pieces of the draft as quotes. Then the code checks that every piece really exists in the draft, merges the two lists, and attaches the cited references. An extractor only proposes: it never decides a status.

The examples below are real runs, with one caveat: for the LLM part I plugged in a fake LLM that returns a fixed answer, so I could show the checks without calling a provider.

The example draft

.]6 :حرشلا[ ﴾ارسي رسعلا عم نإ﴿ :ىلاعت لاق .جرفلا حاتفم ربصلا
.يراخبلا هاور »تاينلاب لامعألا امنإ« :ﷺ هللا لوسر لاقو
.هقزر قاض اذإ هلمع كرت ملسم لك ىلع أ كلذ نمو


- - - -


before proceeding, are you sure this simple usage of LLM is enough to parcticipate in the challenge that ask to use LLM? c:\Users\roaaa\ROWI\Projects\azw\docs\reference\challenge-guide.md

Short answer: the simple use is acceptable, and even fits the guide. What is not enough yet is the proof: nothing in the repo measures what the LLM adds, and the top scores ask for exactly that.

Why simple is fine

The guide does not ask for a lot of AI. It says: «هديقعتب ال ةتبثملا هتميقب يعانطصالا ءاكذلا ميَّقيُ»,
so AI is judged by its proven value

For the 25% criterion (technical qun is: "does AI do a real job with aclear method?" In Azw it does two real jobs:

┌─────────────┬─────────────────────────────────────────┬────────────────────────────────────────┐
│     Job     │        What only th         Example                 │
├─────────────┼─────────────────────────────────────────┼────────────────────────────────────────┤
│ Extraction  │ Find claims and oddكرت ملسم لك ىلع بجي…» →          │
│             │ that rules miss                         │ interpretive_claim → referral          │
├─────────────┼─────────────────────────────────────────────────────┤
│ Explanation │ Describe a wording difference in plain  │ only for DIFFERS items                 │
│             │ words, labeled «اًيل                                 │
└─────────────┴─────────────────────────────────────────┴────────────────────────────────────────┘

Keeping the LLM away from the status decision is also a strength. The reliability criterion (15%) gives score 1 for one proven seriou and the scientific package demandsabstaining instead of generating. A tool that lets the model judge texts would be weaker here.


- - - -


Short answer: every record starts as pending. It becomes reviewed only when data/review/reviewed.json says so, with a name and the evidenat file and stamps each record. Only reviewed records can produce MATCH or DIFFERS, and only they carry a grade.

The four files in data/review/

┌───────────────────────────┬─────────────────────────────────────────────┬──────────────────────┐
│           File            │                │ Does the build read  │
│                           │                                             │         it?          │
├───────────────────────────┼────────────────┼──────────────────────┤
│ reviewed.json             │ Approvals: 3 collections and 5 single       │ Yes                  │
│                           │ recor          │                      │
├───────────────────────────┼─────────────────────────────────────────────┼──────────────────────┤
│ held-records.json         │ 2 rec with the │ Yes                  │
│                           │  reason                                     │                      │
├───────────────────────────┼────────────────┼──────────────────────┤
│ dorar-verification.json   │ Results of the sample check against         │ No, it is evidence   │
│                           │ dorar          │                      │
├───────────────────────────┼─────────────────────────────────────────────┼──────────────────────┤
│ hadith-review-sample.json │ The s          │ No, it is evidence   │
└───────────────────────────┴─────────────────────────────────────────────┴──────────────────────┘

How the stamp is decided

The rule is in scripts/lib/review-status.ts, checked in this order:

1. no citation number?                          → pending (can never be approved)
2. record id listed in reviewed.jso
3. its collection approved AND no problem flag? → reviewed
4. otherwise

Three examples:

bukhari:1     collection approved,    → reviewed, grade حيحص
bukhari:4     collection approved, but opens with «باهش نبا لاق»   → pending, no grade
muslim:6172   was held, then approv   → reviewed

What the approvals rest on

Quran (approved by the owner, 2026- ayat by hand with ةنيدملا فحصم and all 10 matched. Separately, all 6,236 ayat equal the Tanzil text letter for letter once ,ةيوبنلا
diacritics are removed.

Bukhari and Muslim (approved by there approved on automated samplechecks, not on a hand comparison with a printed edition:

┌────────────────────────────────────────────────────────────┬──────────┬──────────┐
│                           Check  ukhari  │  Muslim  │
├────────────────────────────────────────────────────────────┼──────────┼──────────┤
│ Raw file identical to the pinned es      │ yes      │
├────────────────────────────────────────────────────────────┼──────────┼──────────┤               Random sample found on Dorar with0 of 30 │ 30 of 30 │
├────────────────────────────────────────────────────────────┼──────────┼──────────┤               Records compared word for word wi2       │ 12       │
├────────────────────────────────────────────────────────────┼──────────┼──────────┤               Of those, no real wording differe1       │ 7        │
├────────────────────────────────────────────────────────────┼──────────┼──────────┤               Of those, held for a closer look         │ 5        │
└────────────────────────────────────────────────────────────┴──────────┴──────────┘               
Example of one Dorar check:                                                                        
record:  bukhari:5026                                                                              ery:   «هللا هملع لجر نيتنثا يف ا
Dorar:   same text under يراخبلا حيحص no. 5026, similarity 1.0                                     rdict: CONFIRMED
                                                                                                   at happened to the 6 held records
                                                                                                   ey were compared with a second ed0-03.
                                                                                                   The 5 Muslim records were releaseord with )ةيكرتلا ط( ملسم حيحص. Thedifference came from one digital copy that Dorar quotes. They are approved by id in reviewed.jsonunder the AI's name, not the owne
- bukhari:2075 stays held. Our text has six extra words at the end that two other witnesses do not have under this number.

A second record, bukhari:2819, is ht opens «ثيللا لاقو», so it is asuspended report (قلّعم), and Dorar marks it so. The grade of the book is not stated for it.

What this means at runtime

draft quote matches bukhari:1     (reviewed) → MATCH
draft quote matches bukhari:2075  (/ SOURCE_NOT_REVIEWED

The source text of a held record is trusted for a positive result.

The honest limits

- For hadith, "reviewed" means the ks. The other records (about 13,800)were not compared with a second text one by one.
- The source repository does not sarabic text came from.
- Dorar is used only to check samples. It is never the matching corpus, and its text is not stored in
  the repo.

These limits are written in revieweRCES.md, which is what the judges'reliability criterion asks for: show the limits of your knowledge.

That completes the data path: raw files, build, load and index, extract, match, decide, and review. The remaining piece is the evaluatifound earlier.
