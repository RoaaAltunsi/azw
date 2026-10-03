// The words of a record on a search layer, each with the range of exactText it stands for.
// A layer text is for retrieval only; this is the bridge from a hit on a layer back to exactText,
// which is what the user sees and what the word diff reports ranges in.
import type { CorpusIndex, LayerRef } from "../corpus";
import { alignTokens, wordsOf, type SourceWord, type Word } from "../diff";
import type { SourceRecord } from "../types";

export interface LayerWord extends SourceWord {
  at: number; // offset of the word in the record's layer text (what an ExactHit's offsets count in)
}

// Built on first use, per index. Holds source text only, never anything from a draft.
const cache = new WeakMap<CorpusIndex, Map<string, LayerWord[]>>();

// Spreads the letters of every word into one sequence, remembering the word each came from.
function letters(words: readonly { key: string }[]): { chars: string[]; owner: number[] } {
  const chars: string[] = [];
  const owner: number[] = [];
  words.forEach((word, i) => {
    for (const ch of word.key) {
      chars.push(ch);
      owner.push(i);
    }
  });
  return { chars, owner };
}

// For each layer word, the first and last word of exactText its letters align with. Word counts
// may differ between the two («ياايها» on the layer is «يا أيها» in exactText), so the alignment
// is on letters; a layer word may cover several words of exactText, and two may share one.
function project(tokens: readonly { key: string }[], base: readonly Word[]): Array<[number, number]> {
  const layer = letters(tokens);
  const exact = letters(base);
  const spans: Array<[number, number] | undefined> = tokens.map(() => undefined);
  for (const [i, j] of alignTokens(layer.chars, exact.chars, "global").pairs) {
    if (i === null || j === null) continue;
    const span = spans[layer.owner[i]!];
    const word = exact.owner[j]!;
    if (span) span[1] = word;
    else spans[layer.owner[i]!] = [word, word];
  }
  // A layer word none of whose letters found a partner takes the place of the word before it.
  let previous = 0;
  return spans.map((span) => {
    const resolved: [number, number] = span ?? [previous, previous];
    previous = resolved[1];
    return resolved;
  });
}

export function layerWords(index: CorpusIndex, layer: LayerRef, record: SourceRecord): LayerWord[] {
  let perIndex = cache.get(index);
  if (!perIndex) cache.set(index, (perIndex = new Map()));
  const key = `${layer.collection}\u0000${layer.layer}\u0000${record.id}`;
  const cached = perIndex.get(key);
  if (cached) return cached;

  const text = index.layerText(layer, record.id);
  if (text === undefined) throw new Error(`${record.id} has no text on layer "${layer.layer}"`);
  const tokens = [...text.matchAll(/\S+/g)].map((m) => ({ key: m[0], at: m.index }));
  // exactText normalized the way the layer's queries are: its words carry ranges in exactText.
  const base = wordsOf(index.normalizeFor(layer, record.exactText), record.exactText);
  if (tokens.length > 0 && base.length === 0) throw new Error(`${record.id}: exactText has no words`);

  const same = tokens.length === base.length && tokens.every((token, i) => token.key === base[i]!.key);
  const spans = same ? tokens.map((_, i): [number, number] => [i, i]) : project(tokens, base);
  const words = tokens.map((token, i) => {
    const [first, last] = spans[i]!;
    return { key: token.key, at: token.at, recordId: record.id, start: base[first]!.start, end: base[last]!.end };
  });
  perIndex.set(key, words);
  return words;
}
