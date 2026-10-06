# Azw — current limits and backlog

Nothing in this file is implemented unless another document explicitly says so. Completed work and
prompt history do not belong here.

## Source review

- Have a qualified specialist independently review the case labels, status wording and referral text.
- Read the 81 ayat where Quranpedia mushaf 1 and mushaf 2 differ in letters other than ا، و، ي and ء.
- Replace or supplement the hadith dataset with a licensed edition whose printed source is identified.
- Expand direct comparison beyond the current hadith samples and release a pending record only with
  record-specific evidence documented under the review policy.
- Review additional Quran spelling pairs only against approved sources and bind every accepted pair
  to its ayat; do not introduce global folding.

## Extraction and references

- Support more reference forms, including numeric surah notation, non-bracketed references, lists of
  non-contiguous ayat and hadith numbers after grouped citations.
- Distinguish titles that contain collection names, such as abridgements, commentaries and grading
  editions, without treating their titles as direct citations of the covered book.
- Measure before adding further attribution phrases such as «قال المصطفى»، «جاء عنه» and «رُوي».
- Tighten reference attachment when prose between a quotation and a later reference belongs to the
  writer rather than the quotation.
- Consider a dedicated claim kind for hadith qudsi so the speaker distinction is explicit.
- Add a safe way for the deterministic extractor to recognize that an input is a request rather than
  a draft; today that classification depends on the LLM.

## Matching and corrections

- Measure mixed Quran spellings that currently fall across the default and everyday layers and reach
  fuzzy matching instead of one exact layer.
- Improve alignment of a changed first or last word without turning a true insertion into a
  replacement.
- Model scholarly identity between differently worded narrations before making stronger claims about
  «متفق عليه».
- Consider a matn-only search layer only after a reliable, reviewed matn boundary exists for the
  relevant records.
- Add safe corrections for multi-ayah spans, combined wording/reference errors and eligible hadith
  reference mismatches.
- Add “review revised draft” as an explicit new review, rather than implying that applied corrections
  have already been checked.

## LLM and explanations

- Measure `low` reasoning effort; `none` is faster but produces more conservative extra cards than
  `medium`.
- Reduce unexpected interpretive-claim cards without using held-out drafts as prompt examples.
- Record fixed classes for model timeout/failure without logging messages or user content.
- Measure accepted, rejected and null explanations by reason and by content kind.
- Further constrain explanation truth conditions; the present validator proves grounding and
  vocabulary, not factual correctness.
- Escape model-message delimiters without changing the span lookup against the original draft.

## API and operation

- Use a shared rate-limit store before horizontally scaled production; the current bucket is per
  process.
- Expose the configured maximum draft length and supported extraction forms through health metadata
  if another client needs them.
- Add an occurrence identifier and search-layer metadata only through a versioned API change.
- Add privacy-safe operational fault reporting beyond aggregate request logs.
- Verify corpus file tracing, cold-start memory and latency on the selected production host.
- Verify host access logs, build-cache handling and response headers after deployment.

## User experience

- Test the Arabic interface with target content writers and record changes arising from that test.
- Test with a screen reader, real phone, Firefox and Safari.
- Add an installable PWA only with a web manifest, suitable icons and a service worker that caches
  the application shell but never drafts or API responses.
- Replace estimated progress with streamed server events if real pipeline progress is required.
- Consider Web Share and file export for the report after privacy review.

## Future scope

- Additional hadith books only with licensed text, stable numbering and source-attributed grades.
- Supplications, adhkar, athar and commonly misattributed sayings through new adapters and matchers.
- Other API clients such as a browser extension, share target, CMS plugin or keyboard.
- Other UI languages through the i18n boundary.

Still out of scope for the MVP: fatwas, tafsir, model-generated hadith grading, paraphrase-as-quote,
OCR, audio/video, translation, accounts, dashboards and draft-level reliability scores.
