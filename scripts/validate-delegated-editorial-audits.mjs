#!/usr/bin/env node
// CI gate: new delegated editorial approvals must have an immutable,
 // article-specific, source-linked audit before being merged to main.
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { verifyDelegatedEditorialAudit } from "./delegated-editorial-gate.mjs";

const root = process.cwd();
const ledger = parse(fs.readFileSync(path.join(root, "content/registry/article-approval-log.yml"), "utf8"));
const registry = parse(fs.readFileSync(path.join(root, "content/registry/knowledge-nodes.yml"), "utf8"));
if (!Array.isArray(ledger?.approvals) || !Array.isArray(registry?.nodes) ||
    registry.nodeCount !== registry.nodes.length)
  throw new Error("Invalid approval ledger / Registry");
const nodes = new Map(registry.nodes.map((node) => [node.id, node]));
let examined = 0;
for (const row of ledger.approvals) {
  if (row.approvedBy !== "editorial-qa") continue;
  if (!["approved-for-publication", "published"].includes(row.decision))
    throw new Error("Unsupported editorial approval decision: " + row.id);
  const node = nodes.get(row.id);
  if (!node || node.slug !== row.slug)
    throw new Error("Editorial approved node does not exist: " + row.id);
  if (row.decision === "published") {
    // A published manuscript's metadata differ from its signed ready-blob.
    // The initial CI and promotion verified the original immutable report.
    if (node.status !== "published" || !row.publishedOn)
      throw new Error("Finalized audited article is not published: " + row.id);
    continue;
  }
  if (node.status !== "ready")
    throw new Error("Pending editorial approval must target ready article: " + row.id);
  const article = fs.readFileSync(path.join(root, "content/articles", node.slug + ".md"), "utf8");
  verifyDelegatedEditorialAudit(root, row, article, node);
  examined += 1;
}
console.log("Validated " + examined + " pending delegated editorial approvals.");
