import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles, readArticles } from "../src/lib/article-content";

const ID="GEN-0016";
const SLUG="image-generation-ai";
const REVIEW_SHA="2b0594c4d1f6e55dde3ef69c2d1de4cdd6074adc";
const READY_SHA="2a66370de26499381a8b4ffe9acf451207a5419e";
const AUDIT_SHA="b89d3f0019ab762589a2d50767ff34c23ee66511";
const FIGURES:Record<string,string>={
  "hero.svg":"792538dea9ea3435c17af9b19f57a76348e3e5f7",
  "fig-01-prompt.svg":"178f070c05997793c4ecbf770a6a567baf121220",
  "fig-02-diffusion.svg":"1c9959f92d8c5504a1a7a1441943650d9a271a22",
  "fig-03-conditioning.svg":"17478ff19411d2dde97f39a90b80c238baf2dcc4",
  "fig-04-methods.svg":"1bfdeb3a96c456e1ece281e14699b28239540cd2",
  "fig-05-text.svg":"365d22b78597d2a1984ca41e866192993149f765"
};
const blob=(data:Buffer)=>createHash("sha1").update("blob "+data.length+"\0").update(data).digest("hex");

test("GEN-0016 approved queue has SHA evidence and correct future dependency gate",()=>{
 const registry=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
 const ledger=parse(readFileSync("content/registry/article-approval-log.yml","utf8"));
 const node=registry.nodes.find((x:{id:string})=>x.id===ID);
 assert.ok(node);
 assert.equal(node.slug,SLUG);
 assert.equal(node.type,"concept");
 assert.equal(node.level,1);
 assert.deepEqual(node.prerequisites,["GEN-0001","GEN-0015"]);
 assert.equal(registry.nodes.find((x:{id:string})=>x.id==="GEN-0001")?.status,"published");
 const prior=registry.nodes.find((x:{id:string})=>x.id==="GEN-0015");
 assert.ok(prior);
 assert.ok(["ready","published"].includes(prior.status));
 assert.ok(["ready","published"].includes(node.status));
 if(node.status==="published")assert.equal(prior.status,"published");
 const article=readAllArticles("content/articles").find(x=>x.id===ID);
 assert.ok(article);
 assert.equal(article.status,node.status);
 assert.equal(article.slug,SLUG);
 const row=ledger.approvals.find((x:{id:string})=>x.id===ID);
 assert.ok(row);
 assert.equal(row.approvedBy,"editorial-qa");
 assert.equal(row.delegation,"site-owner-standing-policy-2026-10-13");
 assert.equal(row.originalReviewArticleBlob,REVIEW_SHA);
 assert.equal(row.sourceArticleBlob,READY_SHA);
 assert.equal(row.editorialAuditBlob,AUDIT_SHA);
 assert.equal(row.editorialAuditPath,"content/editorial-audits/GEN-0016.yml");
 assert.equal(row.publishOn,"2026-10-17");
 assert.equal(row.decision,node.status==="published"?"published":"approved-for-publication");
 const audit=readFileSync(row.editorialAuditPath);
 assert.equal(blob(audit),AUDIT_SHA);
 const report=parse(audit.toString("utf8"));
 assert.equal(report.readyArticleBlob,READY_SHA);
 assert.ok(report.qualityScore.achieved>=80);
 assert.equal(report.criticalClaims.length,8);
 assert.ok(Object.values(report.checks as Record<string,{passed:boolean}>).every(x=>x.passed));
});

test("a differentiated 9k-character beginner story teaches diffusion and alternatives",()=>{
 const src=readFileSync("content/articles/image-generation-ai.md","utf8");
 const body=src.replace(/^---[\s\S]*?---\s*/,"");
 assert.ok(body.length>9000,"Incomplete long-form beginner lesson");
 for(const term of ["町内会","午前9時","午前10時","プロンプト","拡散モデル",
   "ノイズ","学習","Cross-Attention","潜在","画素","自己回帰的","DALL",
   "Imagen","Inpainting","18時","著作権","個人情報","正式な案内"]){
   assert.ok(body.includes(term),"Missing important teaching point "+term);
 }
 assert.match(body,/^## 今日の結論$/m);
 assert.match(body,/^## 分からなければ戻ろう$/m);
 assert.doesNotMatch(body,/\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
});

test("sources are first-party and published references never point to scheduled articles",()=>{
 const src=readFileSync("content/articles/image-generation-ai.md","utf8");
 for(const url of [
  "https://research.google/blog/google-research-2022-beyond-language-vision-and-generative-models/",
  "https://arxiv.org/abs/2006.11239",
  "https://imagen.research.google/",
  "https://arxiv.org/abs/2112.10752",
  "https://openai.com/index/dall-e/",
  "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/img-gen-prompt-guide?hl=ja",
  "https://openai.com/index/introducing-4o-image-generation/",
  "https://research.google/blog/imagen-editor-and-editbench-advancing-and-evaluating-text-guided-image-inpainting/"
 ])assert.ok(src.includes(url),"Missing original reference "+url);
 const registry=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
 const published=new Set<string>(registry.nodes.filter((x:{status:string})=>x.status==="published").map((x:{slug:string})=>x.slug));
 const links=[...src.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)].map(x=>x[1]);
 assert.ok(links.length>=4);
 for(const link of links)assert.ok(published.has(link),"Unpublished linked document "+link);
 assert.ok(!links.includes("multimodal-ai"),"Future prerequisite cannot be prelinked");
 assert.ok(!links.includes("video-generation-ai"),"Future next article cannot be prelinked");
});

test("all six diagrams match original Git Blob SHAs and have Japanese alt and SVG accessibility",()=>{
 const src=readFileSync("content/articles/image-generation-ai.md","utf8");
 const imageRefs=[...src.matchAll(/!\[([^\]]+)\]\((\/images\/articles\/image-generation-ai\/[^)]+)\)/g)];
 assert.equal(imageRefs.length,6);
 assert.equal(new Set(imageRefs.map(x=>x[2])).size,6);
 assert.equal(imageRefs[0][2],"/images/articles/image-generation-ai/hero.svg");
 for(const x of imageRefs)assert.ok(x[1].length>20);
 for(const [name,sha] of Object.entries(FIGURES)){
   const url="/images/articles/image-generation-ai/"+name;
   const fp=path.join(process.cwd(),"public",url);
   assert.ok(existsSync(fp),"Missing SVG "+fp);
   assert.ok(imageRefs.some(x=>x[2]===url),"SVG is not in manuscript "+name);
   const data=readFileSync(fp);
   assert.equal(blob(data),sha,"Artwork hash changed "+name);
   const svg=data.toString("utf8");
   assert.match(svg,/viewBox="0 0 1200 675"/);
   assert.match(svg,/<title id="t">/);
   assert.match(svg,/<desc id="d">/);
   assert.match(svg,/<\/svg>\s*$/);
 }
});

test("ready article is unpublished in public site until date and dependency-safe release",()=>{
 const article=readAllArticles("content/articles").find(x=>x.id===ID);
 assert.ok(article);
 const publicArticles=readArticles("content/articles");
 if(article.status==="ready")assert.ok(!publicArticles.some(x=>x.id===ID));
 else assert.ok(publicArticles.some(x=>x.id===ID));
});
