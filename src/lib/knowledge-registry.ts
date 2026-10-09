import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";

type NextReading = { id: string; note: string };

type KnowledgeNode = {
  id: string;
  title: string;
  slug: string;
  status: string;
  nextReading?: NextReading[];
};

type KnowledgeRegistry = {
  nodes: KnowledgeNode[];
};

let cached: KnowledgeRegistry | null = null;

function getRegistry(): KnowledgeRegistry {
  if (cached) return cached;
  const file = path.join(process.cwd(), "content/registry/knowledge-nodes.yml");
  cached = parse(readFileSync(file, "utf8")) as KnowledgeRegistry;
  return cached;
}

export function getNextReadingMarkdown(articleId?: string): string {
  if (!articleId) return "";
  const registry = getRegistry();
  const byId = new Map(registry.nodes.map((node) => [node.id, node]));
  const source = byId.get(articleId);
  if (!source?.nextReading?.length) return "";

  const lines = source.nextReading.map((item) => {
    const target = byId.get(item.id);
    if (!target) return "";
    // Preview builds expose review/ready articles, but main stays published-only.
    // Link only when the reviewed file exists, avoiding dead preview navigation.
    const previewAccessible =
      (process.env.CF_PAGES_BRANCH?.startsWith("preview/") ?? false) &&
      (target.status === "review" || target.status === "ready") &&
      existsSync(path.join(process.cwd(), "content/articles", `${target.slug}.md`));
    const linkable = target.status === "published" || previewAccessible;
    const title = linkable
      ? `[${target.title}](/articles/${target.slug})`
      : target.title;
    const pending = linkable ? "" : "（準備中）";
    return `- **${title}** — ${item.note}${pending}`;
  }).filter(Boolean);

  return lines.length ? `## 次に読む\n\n${lines.join("\n")}` : "";
}
