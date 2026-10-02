// HadithSourceAdapter: the only place that knows the shape of an upstream hadith dataset.
// Replacing fawazahmed0/hadith-api with another source means writing another adapter; the corpus
// builder only sees HadithEntry values.
import { readFileSync } from "node:fs";
import { z } from "zod";
import { fileInfo, p } from "./util.js";

export interface HadithEntry {
  /** Stable key in the source, used as the record-id suffix (e.g. "402.2", "4927"). */
  sourceKey: string;
  /** Number to cite, or null when the source carries none for this entry. */
  citationNumber: string | null;
  /** Full source numbering value when citationNumber is only its integer part. */
  subNumber?: string;
  /** Text exactly as in the source (may be empty; the builder skips and reports those). */
  text: string;
  /** Source section ("book") number, when the source assigns a named section. */
  book?: string;
}

export interface HadithCollectionInfo {
  collection: string;
  /** Arabic display name used in citations and in the Sahihayn grade attribution. */
  displayNameAr: string;
  sourceName: string;
  sourceUrl: string;
  edition: string;
  version: string;
  license: string;
  licenseUrl: string;
  numberingScheme: string;
  rawFiles: Array<{ path: string; bytes: number; sha256: string }>;
}

export interface HadithSourceAdapter {
  readonly id: string;
  readonly collections: readonly string[];
  info(collection: string): HadithCollectionInfo;
  load(collection: string): HadithEntry[];
}

// ---------------------------------------------------------------------------------------------
// fawazahmed0/hadith-api (editions ara-bukhari / ara-muslim)
// ---------------------------------------------------------------------------------------------

const RawEditionSchema = z.object({
  metadata: z.object({
    name: z.string(),
    sections: z.record(z.string(), z.string()),
    section_details: z.record(z.string(), z.unknown()),
  }),
  hadiths: z.array(
    z.object({
      hadithnumber: z.number(),
      arabicnumber: z.union([z.number(), z.string()]).optional(),
      text: z.string(),
      grades: z.array(z.unknown()),
      reference: z.object({ book: z.number(), hadith: z.number() }),
    }),
  ),
});

const RAW_DIR = "data/raw/hadith-api";
const REPO = "fawazahmed0/hadith-api";

const EDITIONS: Record<string, { edition: string; displayNameAr: string; numberingScheme: string }> = {
  bukhari: {
    edition: "ara-bukhari",
    displayNameAr: "صحيح البخاري",
    numberingScheme:
      "id = bukhari:<hadithnumber>. citation.number = integer part of hadithnumber (1–7563). " +
      "The source splits a few hadith into decimal entries (e.g. 402.2); for those, " +
      "citation.subNumber keeps the full source value.",
  },
  muslim: {
    edition: "ara-muslim",
    displayNameAr: "صحيح مسلم",
    numberingScheme:
      "id = muslim:<hadithnumber> (source running number 1–7563, NOT a citation number). " +
      "citation.number = integer part of arabicnumber (Fuad Abd al-Baqi); citation.subNumber = " +
      "full arabicnumber as in the source (e.g. \"8.01\"). Entries without arabicnumber have " +
      "citation.number = null and stay pending.",
  },
};

export class FawazHadithApiAdapter implements HadithSourceAdapter {
  readonly id = "fawazahmed0/hadith-api";
  readonly collections = ["bukhari", "muslim"] as const;
  private readonly commit: string;

  constructor() {
    this.commit = readFileSync(p(RAW_DIR, "COMMIT.txt"), "utf8").trim();
    if (!/^[0-9a-f]{40}$/.test(this.commit)) {
      throw new Error(`${RAW_DIR}/COMMIT.txt does not contain a 40-hex commit hash`);
    }
  }

  private edition(collection: string) {
    const e = EDITIONS[collection];
    if (!e) throw new Error(`Unknown collection for ${this.id}: ${collection}`);
    return e;
  }

  info(collection: string): HadithCollectionInfo {
    const e = this.edition(collection);
    return {
      collection,
      displayNameAr: e.displayNameAr,
      sourceName: `${REPO} — ${e.edition}`,
      sourceUrl: `https://raw.githubusercontent.com/${REPO}/${this.commit}/editions/${e.edition}.min.json`,
      edition: `${e.edition} @ ${this.commit.slice(0, 7)}`,
      version: this.commit,
      license: "The Unlicense (public-domain dedication)",
      licenseUrl: `https://github.com/${REPO}/blob/${this.commit}/LICENSE`,
      numberingScheme: e.numberingScheme,
      rawFiles: [fileInfo(`${RAW_DIR}/${e.edition}.min.json`), fileInfo(`${RAW_DIR}/COMMIT.txt`)],
    };
  }

  load(collection: string): HadithEntry[] {
    const e = this.edition(collection);
    const raw = RawEditionSchema.parse(
      JSON.parse(readFileSync(p(RAW_DIR, `${e.edition}.min.json`), "utf8")),
    );
    const sections = raw.metadata.sections;
    return raw.hadiths.map((h): HadithEntry => {
      const sectionName = sections[String(h.reference.book)];
      const book = sectionName ? String(h.reference.book) : undefined;
      const sourceKey = String(h.hadithnumber);

      if (collection === "bukhari") {
        const integer = String(Math.trunc(h.hadithnumber));
        return {
          sourceKey,
          citationNumber: integer,
          ...(integer !== sourceKey ? { subNumber: sourceKey } : {}),
          text: h.text,
          ...(book ? { book } : {}),
        };
      }

      // Muslim: cite by arabicnumber (kept as the source string so "8.10" is not collapsed to 8.1).
      if (h.arabicnumber === undefined) {
        return { sourceKey, citationNumber: null, text: h.text, ...(book ? { book } : {}) };
      }
      const full = String(h.arabicnumber);
      const match = /^(\d+)(?:\.\d+)?$/.exec(full);
      if (!match?.[1]) throw new Error(`muslim:${sourceKey}: unexpected arabicnumber "${full}"`);
      return {
        sourceKey,
        citationNumber: match[1],
        subNumber: full,
        text: h.text,
        ...(book ? { book } : {}),
      };
    });
  }
}
