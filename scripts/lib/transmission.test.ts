import assert from "node:assert/strict";
import { test } from "vitest";
import { opensWithTransmissionFormula } from "./transmission.js";

const cases: Array<[string, boolean]> = [
  ["حَدَّثَنَا الْحُمَيْدِيُّ عَبْدُ اللَّهِ بْنُ الزُّبَيْرِ", true],
  ["حَدَّثَنِي يَحْيَى بْنُ مُوسَى", true],
  ["وَحَدَّثَنَاهُ أَبُو بَكْرِ بْنُ أَبِي شَيْبَةَ", true],
  ["حَدَّثَنِيهِ زُهَيْرُ بْنُ حَرْبٍ", true],
  ["أَخْبَرَنَا عَبْدُ اللَّهِ بْنُ يُوسُفَ", true],
  ["وَأَخْبَرَنِي عُرْوَةُ", true],
  ["وَحَدَّثَتْهُ عَائِشَةُ", true],
  ["وَسَمِعْتُ أَبَا هُرَيْرَةَ", true],
  ["‏{حَدَّثَنَا مُوسَى", true],
  // bukhari:2819, graded «[معلق]» on dorar.net.
  ["وَقَالَ اللَّيْثُ حَدَّثَنِي جَعْفَرُ بْنُ رَبِيعَةَ", false],
  ["قَالَ ابْنُ شِهَابٍ وَأَخْبَرَنِي أَبُو سَلَمَةَ", false],
  ["وَعَنْ أَيُّوبَ عَنْ نَافِعٍ", false],
  ["وَزَادَ فِيهِ", false],
  ["وَيُذْكَرُ عَنْ جَابِرٍ", false],
  ["رَوَاهُ أَبُو هُرَيْرَةَ", false],
  ["", false],
];

for (const [text, expected] of cases) {
  test(`${text || "(empty)"} → ${expected}`, () => {
    assert.equal(opensWithTransmissionFormula(text), expected);
  });
}
