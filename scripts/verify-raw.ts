// Network check of the raw downloads against their upstream origins. Read-only for existing raw
// files; the only file it adds is data/raw/quranpedia/mushafs-1.json.gz (the artifact the
// Quranpedia manifest checksum actually covers).
//
//   npx tsx scripts/verify-raw.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { p, readJson, sha256 } from "./lib/util.js";

const UA = { "User-Agent": "azw-corpus-verifier/0.1 (source data verification)" };

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

let failures = 0;
const check = (ok: boolean, label: string): void => {
  console.log(`${ok ? "OK  " : "FAIL"} ${label}`);
  if (!ok) failures++;
};

// --- Quran -----------------------------------------------------------------------------------
const manifest = readJson(p("data/raw/quranpedia/manifest.json")) as {
  version: string;
  files: Array<{ name: string; bytes: number; sha256: string }>;
};
const entry = manifest.files.find((f) => f.name === "mushafs-1.json.gz");
if (!entry) throw new Error("mushafs-1.json.gz missing from the local Quranpedia manifest");

const gzPath = p("data/raw/quranpedia/mushafs-1.json.gz");
if (!existsSync(gzPath)) {
  writeFileSync(gzPath, await download("https://api.quranpedia.net/dumps/mushafs-1.json.gz"));
  console.log("downloaded data/raw/quranpedia/mushafs-1.json.gz");
}
const gz = readFileSync(gzPath);
const localJson = readFileSync(p("data/raw/quranpedia/mushafs-1.json"));
console.log(`quran: manifest ${manifest.version} lists mushafs-1.json.gz sha256 ${entry.sha256} (${entry.bytes} bytes)`);
console.log(`quran: downloaded .gz             sha256 ${sha256(gz)} (${gz.length} bytes)`);
console.log(`quran: local mushafs-1.json       sha256 ${sha256(localJson)} (${localJson.length} bytes)`);
check(gz.length === entry.bytes, "quran: .gz byte size equals manifest");
check(sha256(gz) === entry.sha256, "quran: .gz sha256 equals manifest sha256");
check(sha256(gunzipSync(gz)) === sha256(localJson), "quran: decompressed .gz is byte-identical to local mushafs-1.json");

const liveManifest = JSON.parse((await download("https://api.quranpedia.net/dumps/manifest.json")).toString("utf8")) as typeof manifest;
const liveEntry = liveManifest.files.find((f) => f.name === "mushafs-1.json.gz");
check(
  liveManifest.version === manifest.version && liveEntry?.sha256 === entry.sha256,
  `quran: live manifest (${liveManifest.version}) still lists the same version and sha256 as the local manifest`,
);

// --- Hadith ----------------------------------------------------------------------------------
const commit = readFileSync(p("data/raw/hadith-api/COMMIT.txt"), "utf8").trim();
const base = `https://raw.githubusercontent.com/fawazahmed0/hadith-api/${commit}`;
for (const edition of ["ara-bukhari", "ara-muslim"]) {
  const upstream = await download(`${base}/editions/${edition}.min.json`);
  const local = readFileSync(p(`data/raw/hadith-api/${edition}.min.json`));
  check(sha256(upstream) === sha256(local), `hadith: ${edition}.min.json is byte-identical to the file at commit ${commit.slice(0, 7)} (sha256 ${sha256(local)})`);
}
const license = (await download(`${base}/LICENSE`)).toString("utf8");
check(/released into the public domain/.test(license) && /unlicense\.org/.test(license), `hadith: LICENSE at commit ${commit.slice(0, 7)} is the Unlicense`);

console.log(failures === 0 ? "\nraw verification: all checks passed" : `\nraw verification: ${failures} check(s) FAILED — see above`);
process.exit(failures === 0 ? 0 : 1);
