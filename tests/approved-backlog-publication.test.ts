import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";
const ids = ["BAS-0001","BAS-0002","BAS-0031","BAS-0034","BAS-0040","BAS-0042","BAS-0030","BAS-0101","GEN-0001","GEN-0002","GEN-0003","GEN-0035","GEN-0036"];
test("Thirteen previously accepted articles are published with verified provenance", () => {
  const registry = parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  assert.equal(registry.nodeCount, 501);
  const byId = new Map<string,{status:string;prerequisites:string[]}>(registry.nodes.map((n:{id:string;status:string;prerequisites:string[]})=>[n.id,n] as const));
  const articles=readAllArticles("content/articles");
  const approvals=parse(readFileSync("content/registry/article-approval-log.yml","utf8")).approvals;
  const publishedSlugs=new Set(articles.filter(a=>a.status==="published").map(a=>a.slug));
  for(const id of ids) {
    const node=byId.get(id);
    assert.equal(node?.status,"published","Registry "+id);
    for(const dep of node.prerequisites) assert.equal(byId.get(dep)?.status,"published","Dependency "+id+"->"+dep);
    const article=articles.find(a=>a.id===id);
    assert.ok(article,"Missing "+id);
    assert.equal(article.status,"published");
    assert.ok(approvals.some((entry:{id:string})=>entry.id===id),"Approval missing "+id);
    const images=[...article.content.matchAll(/!\[[^\]]*\]\((\/images\/articles\/[^)]+)\)/g)];
    assert.ok(images.length>=3,"Illustration count "+id);
    for(const image of images) assert.ok(existsSync(path.join("public",image[1])),"Missing "+image[1]);
    for(const link of article.content.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)) assert.ok(publishedSlugs.has(link[1]),"Unpublished link: "+id+"->"+link[1]);
  }
  for (const id of ["BAS-0032", "BAS-0056", "BAS-0033"]) {
    assert.ok(["ready", "published"].includes(byId.get(id)?.status ?? ""), "Accepted publication cannot revert to review: "+id);
  }
});
