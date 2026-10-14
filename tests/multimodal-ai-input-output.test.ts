import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles, readArticles } from "../src/lib/article-content";

const ID="GEN-0015";
const SLUG="multimodal-ai";
const READY_SHA="46e2f5d9f4174588ab798f0b20567c347ab8428e";
const REVIEW_SHA="10bb7d81b5f1a248f8baddf579c2418ddde7d35a";
const AUDIT_SHA="d9a63568aa73591d07d5b31df755939c99f06ffd";
const FIGURES:Record<string,string>={
  "hero.svg":"7bab8414e01deb50bbd681391552ceb31991c853",
  "fig-01-input-output.svg":"54d91552d71018f2466dbdb92a66b4e48dac5c7a",
  "fig-02-poster.svg":"27a19d2fc888f28e32df6dba094e2583324f60a7",
  "fig-03-one-or-team.svg":"f21bbc2b2050a363f748bba4e80ef367708ed625",
  "fig-04-checklist.svg":"d97376dfd7205ebaabbaf62e9d61e490add321c5"
};
function gitBlob(bytes:Buffer):string{
  return createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
}
test("GEN-0015 is approved, SHA-bound, future-dated and has its two published prerequisites",()=>{
  const reg=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  const ledger=parse(readFileSync("content/registry/article-approval-log.yml","utf8"));
  const n=reg.nodes.find((x:{id:string})=>x.id===ID);
  assert.ok(n);
  assert.equal(n.slug,SLUG);
  assert.equal(n.level,1);
  assert.equal(n.type,"concept");
  assert.deepEqual(n.prerequisites,["BAS-0030","GEN-0001"]);
  for(const id of n.prerequisites){
    assert.equal(reg.nodes.find((x:{id:string})=>x.id===id)?.status,"published");
  }
  assert.ok(["ready","published"].includes(n.status));
  const doc=readAllArticles("content/articles").find(x=>x.id===ID);
  assert.ok(doc);
  assert.equal(doc.status,n.status);
  assert.equal(doc.publishedAt,"2026-10-16");
  const approval=ledger.approvals.find((x:{id:string})=>x.id===ID);
  assert.ok(approval);
  assert.equal(approval.approvedBy,"editorial-qa");
  assert.equal(approval.delegation,"site-owner-standing-policy-2026-10-13");
  assert.equal(approval.originalReviewArticleBlob,REVIEW_SHA);
  assert.equal(approval.sourceArticleBlob,READY_SHA);
  assert.equal(approval.editorialAuditPath,"content/editorial-audits/GEN-0015.yml");
  assert.equal(approval.editorialAuditBlob,AUDIT_SHA);
  assert.equal(approval.publishOn,"2026-10-16");
  assert.equal(approval.decision,n.status==="published"?"published":"approved-for-publication");
  const auditBuf=readFileSync(approval.editorialAuditPath);
  assert.equal(gitBlob(auditBuf),AUDIT_SHA);
  const audit=parse(auditBuf.toString("utf8"));
  assert.equal(audit.readyArticleBlob,READY_SHA);
  assert.ok(audit.qualityScore.achieved>=80);
  assert.equal(audit.criticalClaims.length,7);
  assert.ok(Object.values(audit.checks as Record<string,{passed:boolean}>).every(v=>v.passed));
});
test("GEN-0015 does not duplicate the existing BAS-0030 conceptual primer",()=>{
  const a=readFileSync("content/articles/multimodal-ai.md","utf8");
  const b=readFileSync("content/articles/what-is-multimodal.md","utf8");
  const body=a.replace(/^---[\s\S]*?---\s*/,"");
  assert.ok(body.length>=8200);
  assert.ok(a.includes("[マルチモーダルとは？](/articles/what-is-multimodal)"));
  for(const topic of [
    "入力（Input）","出力（Output）","テキスト入力 → 画像出力",
    "写真","ポスター","午前9時","午前10時","音声入力 → 音声出力",
    "動画入力 → テキスト出力","一つのモデル","複数の専門モデル",
    "CLIP","Imagen","出典","個人情報"
  ]) assert.ok(a.includes(topic),"GEN-0015 lacks differentiated treatment of "+topic);
  assert.ok(body.length>b.replace(/^---[\s\S]*?---\s*/,"").length);
  assert.match(body,/^## 今日の結論$/m);
  assert.match(body,/^## 分からなければ戻ろう$/m);
});
test("only actual published recap links and primary-source citations appear",()=>{
  const src=readFileSync("content/articles/multimodal-ai.md","utf8");
  for(const url of [
    "https://cloud.google.com/use-cases/multimodal-ai",
    "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-imagen-generate-image?hl=ja",
    "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/img-gen-prompt-guide?hl=ja",
    "https://blog.google/innovation-and-ai/models-and-research/google-deepmind/gemini-2-5-native-audio/",
    "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/multimodal-live?hl=ja",
    "https://openai.com/index/clip/"
  ])assert.ok(src.includes(url),"Missing first-party source "+url);
  const reg=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  const allowed=new Set<string>(reg.nodes.filter((x:{status:string})=>x.status==="published").map((x:{slug:string})=>x.slug));
  const links=[...src.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)].map(x=>x[1]);
  assert.ok(links.length>=6);
  for(const slug of links)assert.ok(allowed.has(slug),"Link to unpublished slug "+slug);
  assert.ok(links.includes("what-is-multimodal"));
  assert.ok(links.includes("what-is-generative-ai"));
  assert.ok(!links.includes("image-generation-ai"));
});
test("all five original educational SVG files match their Git Blob SHA",()=>{
  const src=readFileSync("content/articles/multimodal-ai.md","utf8");
  const refs=[...src.matchAll(/!\[([^\]]+)\]\((\/images\/articles\/multimodal-ai\/[^)]+)\)/g)];
  assert.equal(refs.length,5);
  assert.equal(new Set(refs.map(x=>x[2])).size,5);
  assert.equal(refs[0][2],"/images/articles/multimodal-ai/hero.svg");
  for(const ref of refs)assert.ok(ref[1].length>=18);
  for(const [filename,expected] of Object.entries(FIGURES)){
    const url="/images/articles/multimodal-ai/"+filename;
    const file=path.join(process.cwd(),"public",url);
    assert.ok(existsSync(file),"Missing image "+url);
    assert.ok(refs.some(x=>x[2]===url),"Unreferenced image "+url);
    const buffer=readFileSync(file);
    assert.equal(gitBlob(buffer),expected,"Changed approved artwork "+filename);
    const svg=buffer.toString("utf8");
    assert.match(svg,/viewBox="0 0 1200 675"/);
    assert.match(svg,/<title id="t">/);
    assert.match(svg,/<desc id="d">/);
    assert.match(svg,/<\/svg>\s*$/);
  }
});
test("an approved ready article is absent from production exports until the scheduled release",()=>{
  const doc=readAllArticles("content/articles").find(x=>x.id===ID);
  assert.ok(doc);
  const publicList=readArticles("content/articles");
  assert.equal(publicList.some(x=>x.id===ID),doc.status==="published");
});
