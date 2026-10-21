import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles, readArticles } from "../src/lib/article-content";

const ID = "GEN-0019";
const SLUG = "what-is-chatgpt";
const REVIEW_SHA = "a66d4b815d65faef367a38fa00cdafcb76295e81";
const READY_SHA = "5c312d213a2ecfe382764768776ae565389a0b7c";
const AUDIT_SHA = "0ba2c09b5f86cd727bde8a9e95966c74266e2ee2";
const FIGURES: Record<string, string> = {
  "hero.svg": "3f69f7e1a695dcfe957fd11efe14a3d2d93c41fc",
  "fig-01-service-model.svg": "c7e7718ae1b1083ac63662df892bd295b7911f61",
  "fig-02-search.svg": "f730e02cf039d96a1d2b4406a737db8826d57510",
  "fig-03-inputs.svg": "dbb842980c61911015baebe8498ba859291feaad",
  "fig-04-privacy.svg": "63b1c2615697ed7b1c8879b38a50c9e8ef620300",
};
const blobSha = (bytes: Buffer): string => createHash("sha1")
  .update("blob " + bytes.length + "\0").update(bytes).digest("hex");

test("GEN-0019 review, ready, audit and scheduled publication record are SHA-pinned", () => {
  const registry = parse(readFileSync("content/registry/knowledge-nodes.yml", "utf8"));
  const ledger = parse(readFileSync("content/registry/article-approval-log.yml", "utf8"));
  const node = registry.nodes.find((n: {id:string}) => n.id === ID);
  assert.ok(node);
  assert.equal(node.slug, SLUG);
  assert.equal(node.category, "生成AI");
  assert.equal(node.level, 0);
  assert.equal(node.type, "concept");
  assert.deepEqual(node.prerequisites, ["GEN-0001", "GEN-0002"]);
  for(const prerequisite of node.prerequisites) {
    assert.equal(registry.nodes.find((n:{id:string})=>n.id===prerequisite)?.status,"published");
  }
  assert.ok(["ready","published"].includes(node.status));
  const doc = readAllArticles("content/articles").find(article => article.id === ID);
  assert.ok(doc);
  assert.equal(doc.slug, SLUG);
  assert.equal(doc.status, node.status);
  
  const approval = ledger.approvals.find((a:{id:string}) => a.id === ID);
  assert.ok(approval);
  assert.equal(approval.approvedBy, "editorial-qa");
  assert.equal(approval.delegation, "site-owner-standing-policy-2026-10-13");
  assert.equal(approval.publishOn, "2026-10-19");
  assert.equal(approval.originalReviewArticleBlob, REVIEW_SHA);
  assert.equal(approval.sourceArticleBlob, READY_SHA);
  assert.equal(approval.editorialAuditPath,"content/editorial-audits/GEN-0019.yml");
  assert.equal(approval.editorialAuditBlob,AUDIT_SHA);
  assert.equal(approval.decision,node.status==="published"?"published":"approved-for-publication");
 if(node.status==="published"){
  assert.match(approval.publishedOn,/^\d{4}-\d{2}-\d{2}$/,"Published entry must record a real JST date");
  assert.ok(approval.publishedOn>=approval.publishOn,"Actual JST publication date cannot precede approved publication date");
  assert.equal(doc.publishedAt,approval.publishedOn,"Published frontmatter must agree with approval ledger");
 }else{
  assert.equal(doc.publishedAt,approval.publishOn,"Staged article must preserve the approved future date");
  assert.equal(approval.publishedOn,undefined,"Unpublished article must not claim release");
 }
  const auditBytes = readFileSync(approval.editorialAuditPath);
  assert.equal(blobSha(auditBytes), AUDIT_SHA);
  const audit = parse(auditBytes.toString("utf8"));
  assert.equal(audit.readyArticleBlob,READY_SHA);
  assert.equal(audit.qualityScore.required,80);
  assert.ok(audit.qualityScore.achieved>=80);
  assert.equal(audit.criticalClaims.length,8);
  assert.ok(Object.values(audit.checks as Record<string,{passed:boolean}>).every(c=>c.passed));
});

test("ChatGPT guide explains service-model-tools distinction without duplicating LLM primer",()=>{
  const src=readFileSync("content/articles/what-is-chatgpt.md","utf8");
  const body=src.replace(/^---[\s\S]*?---\s*/,"");
  assert.ok(body.length>7900,"Full narrative or key details are missing");
  for(const word of ["町内会","公園","午前9時","午前10時","ChatGPT","LLM","モデル",
    "サービス","トークン","検索","画像","ファイル","会話","ハルシネーション",
    "個人情報","データ管理","出典","OpenAI","架空"]){
    assert.ok(body.includes(word),"Missing required concept "+word);
  }
  assert.match(body,/^## 今日の結論$/m);
  assert.match(body,/^## 分からなければ戻ろう$/m);
  assert.doesNotMatch(body,/\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
  const llm=readFileSync("content/articles/what-is-llm.md","utf8");
  assert.ok(src.includes("[LLMとは何か？](/articles/what-is-llm)"));
  assert.ok(body.length>llm.length);
});

test("OpenAI primary sources cited and no unpublished internal links",()=>{
  const src=readFileSync("content/articles/what-is-chatgpt.md","utf8");
  for(const url of [
    "https://openai.com/index/chatgpt/",
    "https://help.openai.com/en/articles/12677804-what-is-chatgpt-faq",
    "https://help.openai.com/en/articles/9260256-chatgpt-capabilities-overview",
    "https://help.openai.com/en/articles/8313428-does-chatgpt-tell-the-truth",
    "https://help.openai.com/ja-jp/articles/9237897-chatgpt-%E6%A4%9C%E7%B4%A2",
    "https://help.openai.com/en/articles/7730893-data-usage-for-openai-models",
    "https://help.openai.com/en/articles/7039943-how-openai-handles-data-in-consumer-services",
    "https://help.openai.com/en/articles/20001488-privacy-center-in-chatgpt"
  ]) assert.ok(src.includes(url),"Missing official citation "+url);
  const registry=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  const published=new Set<string>(registry.nodes.filter((n:{status:string})=>n.status==="published").map((n:{slug:string})=>n.slug));
  const links=[...src.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)].map(x=>x[1]);
  assert.ok(links.length>=9);
  for(const slug of links)assert.ok(published.has(slug),"Unpublished internal target: "+slug);
  for(const required of ["what-is-generative-ai","what-is-llm","ai-hallucination","what-is-rag","rag-retrieval","what-is-multimodal"]){
    assert.ok(links.includes(required));
  }
});

test("Five original diagrams are referenced, accessible and SHA-immutable",()=>{
  const src=readFileSync("content/articles/what-is-chatgpt.md","utf8");
  const refs=[...src.matchAll(/!\[([^\]]+)\]\((\/images\/articles\/chatgpt\/[^)]+)\)/g)];
  assert.equal(refs.length,5);
  assert.equal(new Set(refs.map(x=>x[2])).size,5);
  assert.equal(refs[0][2],"/images/articles/chatgpt/hero.svg");
  for(const ref of refs)assert.ok(ref[1].length>=18);
  for(const [filename,sha] of Object.entries(FIGURES)){
    const url="/images/articles/chatgpt/"+filename;
    const file=path.join(process.cwd(),"public",url);
    assert.ok(existsSync(file),"Missing figure "+filename);
    assert.ok(refs.some(x=>x[2]===url),"Not referenced: "+filename);
    const bytes=readFileSync(file);
    assert.equal(blobSha(bytes),sha,"Figure changed: "+filename);
    const svg=bytes.toString("utf8");
    assert.match(svg,/viewBox="0 0 1200 675"/);
    assert.match(svg,/<title id="t">/);
    assert.match(svg,/<desc id="d">/);
    assert.match(svg,/<\/svg>\s*$/);
  }
});

test("Ready queued ChatGPT entry is absent from published-only exports",()=>{
  const article=readAllArticles("content/articles").find(a=>a.id===ID);
  assert.ok(article);
  assert.equal(readArticles("content/articles").some(a=>a.id===ID),article.status==="published");
});
