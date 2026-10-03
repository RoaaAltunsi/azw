// What a parsed citation looks like. Kept apart from ./index, which imports src/core/types at
// runtime: this file imports nothing from core, so types.ts can use the schema without a cycle.
import { z } from "zod";

export const ParsedReferenceSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("quran"),
    surah: z.number().int().min(1).max(114),
    // Absent = the writer cited the surah only, or a list of ayat that a range cannot express.
    ayahStart: z.number().int().positive().optional(),
    ayahEnd: z.number().int().positive().optional(), // only for a range; always > ayahStart
    // The writer cited more than the fields above express (a list of ayat). Such a reference
    // must never count as one that was checked and found correct.
    partial: z.literal(true).optional(),
  }),
  z.strictObject({
    type: z.literal("hadith"),
    collections: z.array(z.string().min(1)).min(1),
    number: z.string().min(1).optional(), // only when a single collection is cited
    // When several collections are cited and some carry their own number: collection → number.
    numbers: z.record(z.string(), z.string().min(1)).optional(),
    // The writer gave a number that the fields above do not carry («متفق عليه (1907)»). Such a
    // reference must never count as one that was checked and found correct.
    partial: z.literal(true).optional(),
  }),
  z.strictObject({ type: z.literal("unknown") }),
]);
export type ParsedReference = z.infer<typeof ParsedReferenceSchema>;
