import type { Element, Nodes, Root } from "hast";
import type { ArticleMetadata } from "../types/article";
import type { AdPosition, ArticleAdRules } from "../types/monetization";
import { monetizationConfig } from "../config/monetization";

type ArticlePosition = Exclude<AdPosition, "sidebar">;
export type AdPlacement = { position: ArticlePosition; index: number };

function readingCharacters(node: Nodes): number {
  if (node.type === "text") return Array.from(node.value.replace(/\s/g, "")).length;
  if (node.type !== "element" && node.type !== "root") return 0;
  if (node.type === "element" && ["pre", "code", "script", "style"].includes(node.tagName)) return 0;
  return node.children.reduce((total, child) => total + readingCharacters(child), 0);
}

export function getArticleAdPlacements(
  tree: Root,
  policy: ArticleMetadata["adPolicy"] = "auto",
  rules: ArticleAdRules = monetizationConfig.articleRules,
): AdPlacement[] {
  const lengths = tree.children.map(readingCharacters);
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (policy === "off" || total < rules.endMinCharacters) return [];
  const placements: AdPlacement[] = [];
  let introCharacters = 0;
  const firstHeading = tree.children.findIndex((node) => node.type === "element" && node.tagName === "h2");
  const beforeHeading = lengths.slice(0, firstHeading).reduce((sum, length) => sum + length, 0);
  const hasIntroProse = tree.children.slice(0, firstHeading).some((node) =>
    node.type === "element" && ["p", "blockquote"].includes(node.tagName) && readingCharacters(node) > 0,
  );
  if (policy !== "reduced" && total >= rules.introMinCharacters && firstHeading > 0 &&
      hasIntroProse && beforeHeading >= 80 && total - beforeHeading >= rules.minSeparationCharacters) {
    placements.push({ position: "article-after-intro", index: firstHeading });
    introCharacters = beforeHeading;
  }
  if (policy !== "reduced" && total >= rules.middleMinCharacters) {
    let consumed = 0;
    const candidates: { index: number; distance: number }[] = [];
    tree.children.forEach((node, index) => {
      // Only top-level section boundaries. Lists, tables, quotes and code stay intact.
      if (node.type === "element" && node.tagName === "h2" && index !== firstHeading &&
          consumed - introCharacters >= rules.minSeparationCharacters &&
          total - consumed >= rules.minSeparationCharacters) {
        candidates.push({ index, distance: Math.abs(consumed - total / 2) });
      }
      consumed += lengths[index];
    });
    const middle = candidates.sort((a, b) => a.distance - b.distance || a.index - b.index)[0];
    if (middle) placements.push({ position: "article-middle", index: middle.index });
  }
  placements.push({ position: "article-end", index: tree.children.length });
  return placements;
}

export function createArticleAdsPlugin(policy: ArticleMetadata["adPolicy"]) {
  return function articleAdsPlugin() {
    return (tree: Root) => {
      const placements = getArticleAdPlacements(tree, policy);
      for (const { position, index } of [...placements].reverse()) {
        const marker: Element = {
          type: "element", tagName: "aside", properties: { dataAdPosition: position }, children: [],
        };
        tree.children.splice(index, 0, marker);
      }
    };
  };
}
