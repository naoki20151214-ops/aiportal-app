import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles, readArticles } from "../src/lib/article-content";

const ID="GEN-0021", SLUG="what-is-gemini";
const REVIEW_SHA="ab23fe678d2db45223bf244e86a4693e381d9991";
const READY_SHA="4e4f7998460c6246df3233ad5b66087eb2eb6ef8";
const AUDIT_SHA="7075b3e6236f1d71d20caa43f3c41f208aecd559";
const FIGURES:Record<string,string>={
 "hero.svg":"cc87f76eff7eb7820ebc330bbc862db781630dbe",
 "fig-01-connected.svg":"3ecf7bd2e2b6dc3d2e9eef372e45683025925fa6",
 "fig-02-sources.svg":"4754e1339f9a3b4165670ea8bc1521f179727a0f"
};
const gitBlob=(bytes:Buffer)=>createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");

test("GEN-0021 scheduled approval is source-SHA bound, audited and supported by published prerequisites",()=>{
 const r=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
 const l=parse(readFileSync("content/registry/article-approval-log.yml","utf8"));
 const node=r.nodes.find((x:{id:string})=>x.id===ID);
 assert.ok(node);
 assert.equal(node.slug,SLUG);
 assert.equal(node.type,"concept");
 assert.equal(node.level,0);
 assert.deepEqual(node.prerequisites,["GEN-0001","GEN-0002"]);
 for(const id of node.prerequisites)assert.equal(r.nodes.find((x:{id:string})=>x.id===id)?.status,"published");
 assert.ok(["ready","published"].includes(node.status));
 const doc=readAllArticles("content/articles").find(x=>x.id===ID);
 assert.ok(doc);
 assert.equal(doc.status,node.status);
 assert.equal(doc.publishedAt,"2026-10-21");
 const approval=l.approvals.find((x:{id:string})=>x.id===ID);
 assert.ok(approval);
 assert.equal(approval.approvedBy,"editorial-qa");
 assert.equal(approval.delegation,"site-owner-standing-policy-2026-10-13");
 assert.equal(approval.publishOn,"2026-10-21");
 assert.equal(approval.originalReviewArticleBlob,REVIEW_SHA);
 assert.equal(approval.sourceArticleBlob,READY_SHA);
 assert.equal(approval.editorialAuditPath,"content/editorial-audits/GEN-0021.yml");
 assert.equal(approval.editorialAuditBlob,AUDIT_SHA);
 assert.equal(approval.decision,node.status==="published"?"published":"approved-for-publication");
 const audit=readFileSync(approval.editorialAuditPath);
 assert.equal(gitBlob(audit),AUDIT_SHA);
 const details=parse(audit.toString("utf8"));
 assert.equal(details.readyArticleBlob,READY_SHA);
 assert.ok(details.qualityScore.achieved>=80);
 assert.equal(details.criticalClaims.length,7);
 assert.ok(Object.values(details.checks as Record<string,{passed:boolean}>).every(x=>x.passed));
});
test("Gemini story differentiates model/app, connected permissions, actions and source verification",()=>{
 const source=readFileSync("content/articles/what-is-gemini.md","utf8");
 const body=source.replace(/^---[\s\S]*?---\s*/,"");
 assert.ok(body.length>=8000,"Full beginner explanation unexpectedly shortened");
 for(const term of ["Gemini","Google","Gmail","Google Drive","Calendar","Connected Apps",
   "町内会","午前9時","午前10時","正式な","権限","プライバシー","出典","ハルシネーション","ChatGPT","Claude"])
  assert.ok(body.includes(term),"Missing key concept "+term);
 assert.match(body,/^## 今日の結論$/m);
 assert.match(body,/^## 分からなければ戻ろう$/m);
 assert.doesNotMatch(body,/\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
});
test("All current Google first-party sources are cited and links only target published lessons",()=>{
 const source=readFileSync("content/articles/what-is-gemini.md","utf8");
 for(const u of [
  "https://support.google.com/gemini/answer/14579631?co=GENIE.Platform%3DiOS&hl=en",
  "https://support.google.com/gemini/answer/13695044",
  "https://support.google.com/gemini/answer/17094507?co=GENIE.Platform%3DDesktop&hl=en",
  "https://support.google.com/gemini/answer/14959807?co=GENIE.Platform%3DAndroid&hl=en-GP",
  "https://support.google.com/gemini/answer/16279220?hl=ja",
  "https://support.google.com/gemini/answer/14143489/?co=GENIE.Platform%3DDesktop&hl=ja",
  "https://support.google.com/gemini/answer/13594961?hl=ja-jp"
 ])assert.ok(source.includes(u),"Official source missing "+u);
 const registry=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
 const published=new Set<string>(registry.nodes.filter((n:{status:string})=>n.status==="published").map((n:{slug:string})=>n.slug));
 const refs=[...source.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)].map(m=>m[1]);
 assert.ok(refs.length>=4);
 for(const slug of refs)assert.ok(published.has(slug),"Unpublished article link "+slug);
 assert.ok(!refs.includes("image-generation-ai"));
 assert.ok(!refs.includes("what-is-chatgpt"));
 assert.ok(!refs.includes("what-is-claude"));
});
test("Three original SVG diagrams are exact images with Japanese alt and accessibility metadata",()=>{
 const source=readFileSync("content/articles/what-is-gemini.md","utf8");
 const refs=[...source.matchAll(/!\[([^\]]+)\]\((\/images\/articles\/what-is-gemini\/[^)]+)\)/g)];
 assert.equal(refs.length,3);
 assert.equal(new Set(refs.map(x=>x[2])).size,3);
 assert.equal(refs[0][2],"/images/articles/what-is-gemini/hero.svg");
 for(const ref of refs)assert.ok(ref[1].length>18);
 for(const [name,sha] of Object.entries(FIGURES)){
  const url="/images/articles/what-is-gemini/"+name,fp=path.join(process.cwd(),"public",url);
  assert.ok(existsSync(fp));
  assert.ok(refs.some(x=>x[2]===url),"Image not used "+name);
  const bytes=readFileSync(fp);
  assert.equal(gitBlob(bytes),sha,"Image SHA mismatch "+name);
  const svg=bytes.toString("utf8");
  assert.match(svg,/viewBox="0 0 1200 675"/);
  assert.match(svg,/<title id="t">/);
  assert.match(svg,/<desc id="d">/);
  assert.match(svg,/<\/svg>\s*$/);
 }
});
test("Queued article is excluded from publicly visible article collection",()=>{
 const doc=readAllArticles("content/articles").find(x=>x.id===ID);
 assert.ok(doc);
 assert.equal(readArticles("content/articles").some(x=>x.id===ID),doc.status==="published");
});
