// Whether a span of the draft stands between ﴿ and ﴾ (whitespace allowed). The ornate brackets
// claim a verse and nothing else; a text after «قال الله تعالى» in other marks may also be a hadith
// qudsi (docs/DECISIONS.md D-20 item 9, D-22 item 2). Read in the draft, whoever extracted the span.
export function inVerseMarks(draft: string, span: { start: number; end: number }): boolean {
  let before = span.start - 1;
  while (before >= 0 && /\s/.test(draft[before]!)) before--;
  let after = span.end;
  while (after < draft.length && /\s/.test(draft[after]!)) after++;
  return draft[before] === "﴿" && draft[after] === "﴾";
}
