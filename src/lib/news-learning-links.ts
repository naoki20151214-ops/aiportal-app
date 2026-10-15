import type { ArticleMetadata } from "../types/article";

// Stable, editorially inspectable topic-to-lesson mapping; no speculative future links.
const explicit: Record<string, string[]> = {
  "NEWS-0090": ["what-is-multimodal", "what-is-generative-ai", "what-is-ai"],
  "NEWS-0091": ["what-is-llm", "what-is-transformer", "ai-inference"],
};
const rules: { pattern: RegExp; slugs: string[] }[] = [
  { pattern: /Siri|Apple Intelligence|音声|画像認識|マルチモーダル/i, slugs: ["what-is-multimodal", "what-is-generative-ai"] },
  { pattern: /GPT|Claude|Gemini|LLM|推論モデル|言語モデル/i, slugs: ["what-is-llm", "what-is-transformer", "ai-inference"] },
  { pattern: /検索|RAG|検索拡張|Embedding|埋め込み/i, slugs: ["what-is-rag", "rag-retrieval", "what-is-embedding"] },
  { pattern: /動画生成|画像生成|Video|Sora|Veo/i, slugs: ["what-is-multimodal", "what-is-generative-ai"] },
  { pattern: /エージェント|Agent|自動化/i, slugs: ["what-is-ai", "what-is-llm"] },
];
const fallback = ["what-is-ai", "what-is-generative-ai"];

/**
 * Suggest only ACTUALLY PUBLISHED internal lessons.
 * Sources: established article metadata and a small editorial topic map.
 * Never infer publication from a Registry 'ready' or scheduled future date.
 */
export function newsLearningLinks(
  news: Pick<ArticleMetadata, "id" | "title" | "description" | "tags">,
  publishedArticles: Pick<ArticleMetadata, "slug" | "title" | "status">[],
): { slug:string; title:string }[] {
  const allowed = new Map(publishedArticles.filter(a=>a.status==="published")
    .map(a=>[a.slug,a.title]));
  const haystack = [news.title,news.description,...news.tags].join(" ");
  const candidates = [
    ...(news.id ? explicit[news.id] || [] : []),
    ...rules.filter(r=>r.pattern.test(haystack)).flatMap(r=>r.slugs),
    ...fallback,
  ];
  return [...new Set(candidates)]
    .filter(slug=>allowed.has(slug))
    .slice(0,3)
    .map(slug=>({slug,title:allowed.get(slug) || slug}));
}
