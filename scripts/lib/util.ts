import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const p = (...parts: string[]): string => join(ROOT, ...parts);

export const sha256 = (data: Buffer | string): string =>
  createHash("sha256").update(data).digest("hex");

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function fileInfo(relPath: string): { path: string; bytes: number; sha256: string } {
  const buf = readFileSync(p(relPath));
  return { path: relPath, bytes: buf.length, sha256: sha256(buf) };
}

// Replaces the text between <!-- AUTO:name:START --> and <!-- AUTO:name:END --> in a markdown file.
// Returns false (and changes nothing) when the file or the markers are missing.
export function replaceAutoBlock(relPath: string, name: string, content: string): boolean {
  const path = p(relPath);
  if (!existsSync(path)) return false;
  const start = `<!-- AUTO:${name}:START -->`;
  const end = `<!-- AUTO:${name}:END -->`;
  const text = readFileSync(path, "utf8");
  const i = text.indexOf(start);
  const j = text.indexOf(end);
  if (i < 0 || j < i) return false;
  writeFileSync(path, `${text.slice(0, i + start.length)}\n${content.trim()}\n${text.slice(j)}`);
  return true;
}

// Compresses a sorted list of integer-like strings into ranges: "1–2, 5–14, 16".
export function toRanges(numbers: string[]): string {
  const out: string[] = [];
  let runStart: string | undefined;
  let prev: string | undefined;
  const flush = (): void => {
    if (runStart === undefined || prev === undefined) return;
    out.push(runStart === prev ? runStart : `${runStart}–${prev}`);
  };
  for (const n of numbers) {
    const consecutive =
      prev !== undefined && /^\d+$/.test(n) && /^\d+$/.test(prev) && Number(n) === Number(prev) + 1;
    if (!consecutive) {
      flush();
      runStart = n;
    }
    prev = n;
  }
  flush();
  return out.join(", ");
}
