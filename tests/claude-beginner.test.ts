import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles, readArticles } from "../src/lib/article-content";

const ID="GEN-0020",SLUG="what-is-claude";
const REVIEW_SHA="246931503db2402576f69765c50be00b21c8640c";
const READY_SHA="b905c17f51509cd371907c1dfb0ce80a41c1a885";
const AUDIT_SHA="a122efb0b0a7c3d45575d7efc17ae27bda2275b6";
const FIGURES:Record<string,string>={
  "hero.svg":"050e77705ac4446f566e00c2feff1aff5c366d18",
  "fig-01-workflow.svg":"1d037cadcdfcc2ac04a8fe1e77d3ce0d512ec62e",
  "fig-02-artifacts.svg":"4f5b56448b09788c686d95bc204fd2ccbb8b296e",
  "fig-03-verify.svg":"8247d153ccab64f837ac530c93d8d245baf82605",
  "fig-04-compare.svg":"c4256d36b15a3a6a3107b61ab5e1106a00df4add"
};
const blob=(bytes:Buffer)=>createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");

test("GEN-0020 ready manuscript, dated delegation and prerequisites are SHA-consistent",()=>{
 const registry=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
 const ledger=parse(readFileSync("content/registry/article-approval-log.yml","utf8"));
 const node=registry.nodes.find((x:{id:string})=>x.id===ID);
 assert.ok(node);
 assert.equal(node.slug,SLUG);
 assert.equal(node.type,"concept");
 assert.equal(node.level,0);
 assert.deepEqual(node.prerequisites,["GEN-0001","GEN-0002"]);
 for(const id of node.prerequisites)assert.equal(registry.nodes.find((x:{id:string})=>x.id===id)?.status,"published");
 assert.ok(["ready","published"].includes(node.status));
 const article=readAllArticles("content/articles").find(x=>x.id===ID);
 assert.ok(article);
 assert.equal(article.status,node.status);
 assert.equal(article.publishedAt,"2026-10-20");
 const row=ledger.approvals.find((x:{id:string})=>x.id===ID);
 assert.ok(row);
 assert.equal(row.approvedBy,"editorial-qa");
 assert.equal(row.delegation,"site-owner-standing-policy-2026-10-13");
 assert.equal(row.originalReviewArticleBlob,REVIEW_SHA);
 assert.equal(row.sourceArticleBlob,READY_SHA);
 assert.equal(row.editorialAuditPath,"content/editorial-audits/GEN-0020.yml");
 assert.equal(row.editorialAuditBlob,AUDIT_SHA);
 assert.equal(row.publishOn,"2026-10-20");
 assert.equal(row.decision,node.status==="published"?"published":"approved-for-publication");
 const bytes=readFileSync(row.editorialAuditPath);
 assert.equal(blob(bytes),AUDIT_SHA);
 const audit=parse(bytes.toString("utf8"));
 assert.equal(audit.readyArticleBlob,READY_SHA);
 assert.ok(audit.qualityScore.achieved>=80);
 assert.equal(audit.criticalClaims.length,8);
 assert.ok(Object.values(audit.checks as Record<string,{passed:boolean}>).every(x=>x.passed));
});
test("Anthropic vendor explainer uses fictional town association narrative, not ranking claims",()=>{
 const src=readFileSync("content/articles/what-is-claude.md","utf8");
 const body=src.replace(/^---[\s\S]*?---\s*/,"");
 assert.ok(body.length>8500,"Full explanatory narrative unexpectedly truncated");
 for(const term of [
 "Claude","Anthropic","町内会","午前10時","午前9時","北門",
 "Artifacts","Projects","Web検索","Constitutional AI","ハルシネーション",
 "ChatGPT","プロンプト","個人情報","架空"
 ])assert.ok(body.includes(term),"Missing essential lesson "+term);
 assert.match(body,/^## 今日の結論$/m);
 assert.match(body,/^## 分からなければ戻ろう$/m);
 assert.doesNotMatch(body,/\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
 assert.ok(body.includes("同じ指示"));
});
test("Eight original first-party source URLs and all published-only article links",()=>{
 const article=readFileSync("content/articles/what-is-claude.md","utf8");
 for(const url of [
 "https://docs.anthropic.com/en/docs/welcome",
 "https://support.claude.com/en/articles/7996845-what-are-some-things-i-can-use-claude-for",
 "https://support.claude.com/en/articles/8525154-claude-is-providing-incorrect-or-misleading-responses-what-s-going-on",
 "https://support.claude.com/en/articles/17153992-what-are-artifacts-and-how-do-i-use-them",
 "https://support.claude.com/en/articles/9517075-what-are-projects",
 "https://support.claude.com/en/articles/10684626-enable-and-use-web-search",
 "https://www.anthropic.com/news/claudes-constitution",
 "https://www.anthropic.com/news/claude-new-constitution",
 ])assert.ok(article.includes(url),"Missing primary source "+url);
 const registry=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
 const published=new Set<string>(registry.nodes.filter((x:{status:string})=>x.status==="published").map((x:{slug:string})=>x.slug));
 const slugs=[...article.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)].map(x=>x[1]);
 assert.ok(slugs.length>=6);
 for(const slug of slugs)assert.ok(published.has(slug),"Premature unapproved internal link "+slug);
 assert.ok(slugs.includes("what-is-generative-ai"));
 assert.ok(slugs.includes("what-is-multimodal"));
 assert.ok(!slugs.includes("what-is-chatgpt"));
 assert.ok(!slugs.includes("ai-search"));
});
test("Five SHA-pinned original pastel diagrams exist with Japanese alt and SVG title/desc",()=>{
 const article=readFileSync("content/articles/what-is-claude.md","utf8");
 const refs=[...article.matchAll(/!\[([^\]]+)\]\((\/images\/articles\/claude\/[^)]+)\)/g)];
 assert.equal(refs.length,5);
 assert.equal(new Set(refs.map(x=>x[2])).size,5);
 assert.equal(refs[0][2],"/images/articles/claude/hero.svg");
 for(const ref of refs)assert.ok(ref[1].length>18);
 for(const [name,sha] of Object.entries(FIGURES)){
   const uri="/images/articles/claude/"+name;
   const fn=path.join(process.cwd(),"public",uri);
   assert.ok(existsSync(fn),"Missing image "+uri);
   assert.ok(refs.some(x=>x[2]===uri));
   const data=readFileSync(fn);
   assert.equal(blob(data),sha,"Modified illustration "+name);
   const svg=data.toString("utf8");
   assert.match(svg,/viewBox="0 0 1200 675"/);
   assert.match(svg,/<title id="t">/);
   assert.match(svg,/<desc id="d">/);
   assert.match(svg,/<\/svg>\s*$/);
 }
});
test("Ready Claude article stays out of published list before future scheduled publication",()=>{
 const doc=readAllArticles("content/articles").find(x=>x.id===ID);
 assert.ok(doc);
 assert.equal(readArticles("content/articles").some(x=>x.id===ID),doc.status==="published");
});
