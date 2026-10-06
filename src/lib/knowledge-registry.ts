import { readFileSync } from "node:fs";
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
    const title = target.status === "published"
      ? `[${target.title}](/articles/${target.slug})`
      : target.title;
    const pending = target.status === "published" ? "" : "（準備中）";
    return `- **${title}** — ${item.note}${pending}`;
  }).filter(Boolean);

  return lines.length ? `## 次に読む\n\n${lines.join("\n")}` : "";
}
