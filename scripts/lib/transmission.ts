// Whether a hadith record's own text opens with a formula of direct transmission (حدثنا، حدثني،
// أخبرنا، أخبرني، سمعت, with or without a leading «و»).
//
// A record that opens otherwise («وقال الليث …», «قال ابن شهاب …», «وعن …», «وزاد …», «ويذكر …»)
// is either a suspended report (معلّق) or the continuation of the chain of the record before it.
// The source data has no field that tells the two apart, and a suspended report is not under the
// condition of the Sahih (Ibn al-Salah, Muqaddima, type 1, point 6). Such a record gets no
// collection grade and stays pending (docs/DECISIONS.md D-5). This classifies the form of the text
// only; it is not a judgment on any hadith.
const MARKS = /[ً-ْٰـ‎‏]/g;
const DIRECT_TRANSMISSION = /^[\s{"]*و?(?:حدثن|حدثت|أخبرن|سمعت)/;

export function opensWithTransmissionFormula(text: string): boolean {
  return DIRECT_TRANSMISSION.test(text.replace(MARKS, ""));
}
