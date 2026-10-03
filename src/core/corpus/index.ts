// SourceAdapter registry + in-memory index. Documented in docs/ARCHITECTURE.md ("Corpus index").
export { createHadithAdapter, createQuranAdapter, type SearchLayer, type SourceAdapter } from "./adapter";
export { buildCorpusIndex, type Candidate, type CorpusIndex, type ExactHit, type LayerInfo, type LayerRef } from "./corpus-index";
export { getKindMeta, kindMeta, type KindMeta } from "./kind-meta";
export {
  CollectionAliasFileSchema,
  CorpusFileSchema,
  CorpusManifestSchema,
  QuranSpellingVariantsSchema,
  SurahAliasFileSchema,
  type CorpusFile,
  type CorpusManifest,
  type QuranSpellingVariant,
  type QuranSpellingVariants,
} from "./schema";
