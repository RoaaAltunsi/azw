// Shared Dorar (dorar.net) access for the verification scripts: rate-limited, cached fetching,
// result parsing, and comparison-only text folding. Dorar is an independent reference used for
// spot-checks; it is never a corpus and never a runtime dependency.
//
// Responses are cached in data/raw/dorar-cache/ (gitignored — Dorar content is all rights reserved).
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { p } from "./util.js";

const CACHE_DIR = "data/raw/dorar-cache";
const MIN_INTERVAL_MS = 2000; // at most one request every two seconds
const USER_AGENT = "azw-corpus-verifier/0.1 (hadith data spot-check; 1 request per 2s)";

export const DORAR_BOOKS: Record<string, { source: string; bookId: string }> = {
  bukhari: { source: "صحيح البخاري", bookId: "6216" },
  muslim: { source: "صحيح مسلم", bookId: "3088" },
};

// Documented API (https://dorar.net/article/389). `s[]` is the site-search book filter; the
// article documents only `skey`.
export const apiUrl = (query: string, bookId: string): string =>
  `https://dorar.net/dorar_api.json?skey=${encodeURIComponent(query)}&s[]=${bookId}`;
// Public site search page; its results carry a permanent link per hadith (https://dorar.net/h/<id>).
export const siteSearchUrl = (query: string, bookId: string): string =>
  `https://dorar.net/hadith/search?q=${encodeURIComponent(query)}&s[]=${bookId}`;

// --- Comparison-only text handling (not the project's normalization) -------------------------
const MARKS = /[ً-ْٰـ‎‏]/g;

export function foldWord(word: string): string {
  return word.replace(MARKS, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه");
}

/** Words of a text with punctuation removed: `raw` keeps diacritics, `folded` is for comparing. */
export function tokens(text: string): Array<{ raw: string; folded: string }> {
  return text
    .replace(/[‎‏]/g, "")
    .replace(/[^ء-ْٰ\s]/g, " ")
    .split(/\s+/)
    .map((raw) => ({ raw, folded: foldWord(raw).replace(/[^ء-ي]/g, "") }))
    .filter((t) => t.folded !== "");
}
export const fold = (text: string): string[] => tokens(text).map((t) => t.folded);
/** Query words: diacritics and punctuation removed, letters untouched. */
export const queryWords = (text: string): string[] =>
  text.replace(MARKS, "").replace(/[^ء-ي\s]/g, " ").split(/\s+/).filter(Boolean);

const arabicDigits = (s: string): string =>
  s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

/** Longest common subsequence of two word lists, as index pairs [indexInA, indexInB]. */
export function align(a: string[], b: string[]): Array<[number, number]> {
  const w = b.length + 1;
  const table = new Uint16Array((a.length + 1) * w);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      table[i * w + j] =
        a[i - 1] === b[j - 1]
          ? table[(i - 1) * w + j - 1]! + 1
          : Math.max(table[(i - 1) * w + j]!, table[i * w + j - 1]!);
    }
  }
  const pairs: Array<[number, number]> = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      pairs.push([i - 1, j - 1]);
      i--;
      j--;
    } else if (table[(i - 1) * w + j]! >= table[i * w + j - 1]!) i--;
    else j--;
  }
  return pairs.reverse();
}

/** Share of `needle` words found, in order, in `haystack`. */
export function containment(needle: string[], haystack: string[]): number {
  return needle.length === 0 ? 0 : align(needle, haystack).length / needle.length;
}

// --- Fetching --------------------------------------------------------------------------------
export interface DorarClient {
  /** Body of the URL (API: the result HTML string; site: the page HTML), cached. */
  get(url: string): Promise<{ body: string } | { error: string }>;
  readonly networkRequests: number;
}

export function createDorarClient(options: { offline: boolean }): DorarClient {
  mkdirSync(p(CACHE_DIR), { recursive: true });
  let lastRequestAt = 0;
  let networkRequests = 0;
  return {
    get networkRequests() {
      return networkRequests;
    },
    async get(url) {
      const cachePath = p(CACHE_DIR, `${createHash("sha1").update(url).digest("hex")}.json`);
      if (existsSync(cachePath)) {
        return { body: (JSON.parse(readFileSync(cachePath, "utf8")) as { html: string }).html };
      }
      if (options.offline) return { error: "not cached (offline mode)" };

      const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastRequestAt = Date.now();
      networkRequests++;
      try {
        const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
        if (!res.ok) return { error: `HTTP ${res.status}` };
        let body: string;
        if (url.includes("dorar_api.json")) {
          const html = ((await res.json()) as { ahadith?: { result?: unknown } }).ahadith?.result;
          if (typeof html !== "string") return { error: "unexpected response shape" };
          body = html;
        } else {
          body = await res.text();
        }
        writeFileSync(cachePath, JSON.stringify({ url, fetchedAt: new Date().toISOString(), html: body }));
        return { body };
      } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) };
      }
    },
  };
}

// --- Parsing ---------------------------------------------------------------------------------
export interface DorarResult {
  text: string;
  source: string;
  number: string;
  grade: string;
  /** Permanent link to the hadith on dorar.net (site search results only). */
  link?: string;
}

const untag = (html: string): string =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

/** Results of the documented JSON API (`ahadith.result` HTML). */
export function parseApiResults(html: string): DorarResult[] {
  return html
    .split(/<div class="hadith"[^>]*>/)
    .slice(1)
    .map((block) => {
      const [textHtml = "", infoHtml = ""] = block.split(/<div class="hadith-info">/);
      const field = (label: string): string => {
        const m = new RegExp(`${label}:\\s*</span>([\\s\\S]*?)(?=<span class="info-subtitle">|</div>|$)`).exec(infoHtml);
        return m?.[1] ? untag(m[1]) : "";
      };
      return {
        text: untag(textHtml).replace(/^\d+\s*-\s*/, ""),
        source: field("المصدر"),
        number: arabicDigits(field("الصفحة أو الرقم")),
        grade: field("خلاصة حكم المحدث"),
      };
    });
}

/** A source-book entry listed under «أصول الحديث» on a Dorar hadith page (`<permalink>?osoul=1`). */
export interface DorarBookText {
  /** Book label as Dorar prints it, e.g. "صحيح البخاري (9/ 124)". */
  label: string;
  /** Hadith number(s) printed at the start of the entry. */
  numbers: string[];
  /** The entry's text (chain of narrators + matn), number prefix removed. */
  text: string;
}

export const osoulUrl = (permalink: string): string => `${permalink}?osoul=1`;

/**
 * Book-text entries under «أصول الحديث». Unlike the text shown at the top of a Dorar result
 * (a summary whose wording may follow another book, see its «التخريج» line), these quote each
 * source book directly, with its own number.
 */
export function parseOsoul(page: string): DorarBookText[] {
  const start = page.indexOf("أصول الحديث: ");
  if (start < 0) return [];
  const entries: DorarBookText[] = [];
  for (const m of page.slice(start).matchAll(/<article[^>]*>\s*<h5[^>]*>([\s\S]*?)<\/h5>/g)) {
    const html = m[1]!.replace(/[​-‍⁠]/g, "");
    const label = untag(/<span style="color:maroon">([\s\S]*?)<\/span>/.exec(html)?.[1] ?? "");
    const body = untag(html.replace(/<span style="color:maroon">[\s\S]*?<\/span>/, "")).replace(/^[:\s]+/, "");
    // Muslim: "26 - (2561) …", "(1453) …", "((154- (1221) …" — the hadith number is the one in
    // brackets. Bukhari: "371 - …" or "4012 - 4013 - …".
    const digits = arabicDigits(body);
    const bracketed = /^\(*\s*(?:\d+\s*-\s*)?\((\d+)\)\s*/.exec(digits);
    const prefix = bracketed ?? /^\(*\s*((?:\d+\s*-\s*)+)/.exec(digits);
    const numbers = bracketed ? [bracketed[1]!] : (prefix?.[1]?.match(/\d+/g) ?? []);
    entries.push({ label, numbers, text: prefix ? body.slice(prefix[0].length) : body });
  }
  return entries;
}

/** Results of the public site search page (first tab only; the second tab repeats them). */
export function parseSiteResults(page: string): DorarResult[] {
  const start = page.indexOf('id="home"');
  if (start < 0) return [];
  const end = page.indexOf('id="specialist"', start);
  const tab = page.slice(start, end < 0 ? undefined : end);
  const results: DorarResult[] = [];
  for (const block of tab.split(/<div class="border-bottom py-4/).slice(1)) {
    const text = /<h5[^>]*>([\s\S]*?)<\/h5>/.exec(block)?.[1];
    if (text === undefined) continue;
    const span = (label: string): string => {
      const m = new RegExp(`${label}\\s*:[\\s\\S]*?<span[^>]*>([\\s\\S]*?)</span>`).exec(block);
      return m?.[1] ? untag(m[1]) : "";
    };
    const link = /href="(https:\/\/dorar\.net\/h\/[A-Za-z0-9_-]+)"/.exec(block)?.[1];
    results.push({
      text: untag(text).replace(/^\d+\s*-\s*/, ""),
      source: span("المصدر"),
      number: arabicDigits(span("الصفحة أو الرقم")),
      grade: span("خلاصة حكم المحدث"),
      ...(link ? { link } : {}),
    });
  }
  return results;
}
