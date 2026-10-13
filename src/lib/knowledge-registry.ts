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

/**
 * Update hand-written "next reading" notices at render/build time only.
 * The reviewed Markdown source remains byte-for-byte unchanged. A title must
 * identify exactly one published Registry node; never link to drafts/reviews.
 */
export function linkPublishedReadingTargets(
  markdown: string,
  nodes: Pick<KnowledgeNode, "title" | "slug" | "status">[] = getRegistry().nodes,
): string {
  const published = new Map<string, string>();
  const ambiguous = new Set<string>();
  for (const node of nodes) {
    if (node.status !== "published") continue;
    if (published.has(node.title) && published.get(node.title) !== node.slug) {
      ambiguous.add(node.title);
    }
    published.set(node.title, node.slug);
  }
  const getSlug = (title: string) => ambiguous.has(title) ? undefined : published.get(title);
  let inNextReading = false;
  const linked = markdown.split("\n").map((line) => {
    if (/^##\s+次に読む\s*$/.test(line)) {
      inNextReading = true;
      return line;
    }
    if (/^#{1,2}\s+/.test(line)) inNextReading = false;
    if (!inNextReading) return line;
    const entry = line.match(/^(\s*[-*]\s+\*\*)([^*]+)(\*\*\s+—\s+.*?)（準備中）(\s*)$/);
    if (!entry) return line;
    const slug = getSlug(entry[2]);
    if (!slug) return line;
    return entry[1] + "[" + entry[2] + "](/articles/" + slug + ")" + entry[3] + entry[4];
  }).join("\n");

  // Existing inline handoff prose uses **「記事名」（準備中）**.
  return linked.replace(/\*\*「([^」]+)」（準備中）\*\*/g, (original, title: string) => {
    const slug = getSlug(title);
    return slug ? "**[「" + title + "」](/articles/" + slug + ")**" : original;
  });
}
