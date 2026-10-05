// Whether a span of the draft stands inside one ﴿…﴾ pair. The ornate brackets claim a verse and
// nothing else; a text after «قال الله تعالى» in other marks may also be a hadith qudsi
// (docs/DECISIONS.md D-20 item 9, D-22 item 2). Read in the draft, whoever extracted the span.
//
// The span need not fill the pair (docs/DECISIONS.md D-31): the merge keeps the model's span, and
// the model may return the words with their brackets, or a part of them. The words are still the
// ones the writer put in the brackets. A span that runs out of the pair is not inside it.
export function inVerseMarks(draft: string, span: { start: number; end: number }): boolean {
  // The words of the span, without the brackets and the whitespace at its own edges.
  let start = span.start;
  while (start < span.end && (draft[start] === "﴿" || /\s/.test(draft[start]!))) start++;
  let end = span.end;
  while (end > start && (draft[end - 1] === "﴾" || /\s/.test(draft[end - 1]!))) end--;
  if (start >= end) return false;

  const open = draft.lastIndexOf("﴿", start);
  const close = draft.indexOf("﴾", end);
  if (open < 0 || close < 0) return false;
  // One pair: no bracket of either kind between the opening one and the closing one.
  const between = draft.slice(open + 1, close);
  return !between.includes("﴿") && !between.includes("﴾");
}
