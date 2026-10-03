import type { NextConfig } from "next";

// loadCorpus reads these files from process.cwd() at runtime with paths taken from the manifest,
// so the build cannot see that the two API routes need them. Listed here, they ship with both.
const CORPUS_FILES = ["./data/corpus/*.json", "./data/aliases/*.json"];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/api/v1/review": CORPUS_FILES,
    "/api/v1/health": CORPUS_FILES,
  },
};

export default nextConfig;
