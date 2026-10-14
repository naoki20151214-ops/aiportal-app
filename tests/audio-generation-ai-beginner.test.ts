import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles, readArticles } from "../src/lib/article-content";

const ID="GEN-0018",SLUG="audio-generation-ai";
const REVIEW_SHA="32bd18899ba893c9dae35ed505dbb42c1a8f01f3";
const READY_SHA="56407a2df3790ea7a43fde396765b7979c632e9e";
const AUDIT_SHA="65fe8339b38ffce462103796555aaf2dc28cc34f";
const FIGURES:Record<string,string>={
"hero.svg":"e9072749f806eabb60598836b8b6c2db81933794",
"fig-01-three-kinds.svg":"c116805f15125b20b237b31a2542148d7c791c4d",
"fig-02-waveform.svg":"cb3406ff18a012307f25eef3a20847c007139726",
"fig-03-tokens.svg":"e603b8eb6acf335bb1f96173cb383e43e6277c45",
"fig-04-safety.svg":"d397c5aad42e023e72ad9c89176003f4e3da4197"
};
const sha=(data:Buffer)=>createHash("sha1").update("blob "+data.length+"\0").update(data).digest("hex");

test("GEN-0018 has approved immutable source, valid published prerequisites and a future reservation",()=>{
const registry=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
const ledger=parse(readFileSync("content/registry/article-approval-log.yml","utf8"));
const node=registry.nodes.find((x:{id:string})=>x.id===ID);
assert.ok(node);
assert.equal(node.slug,SLUG);
assert.equal(node.type,"concept");
assert.equal(node.level,1);
assert.deepEqual(node.prerequisites,["GEN-0001","BAS-0030"]);
for(const id of node.prerequisites)assert.equal(registry.nodes.find((x:{id:string})=>x.id===id)?.status,"published");
assert.equal(registry.nodes.some((x:{id:string})=>x.id==="GEN-0015"),false);
assert.ok(["ready","published"].includes(node.status));
const article=readAllArticles("content/articles").find(x=>x.id===ID);
assert.ok(article);
assert.equal(article.status,node.status);
assert.equal(article.publishedAt,"2026-10-18");
const approval=ledger.approvals.find((x:{id:string})=>x.id===ID);
assert.ok(approval);
assert.equal(approval.approvedBy,"editorial-qa");
assert.equal(approval.delegation,"site-owner-standing-policy-2026-10-13");
assert.equal(approval.originalReviewArticleBlob,REVIEW_SHA);
assert.equal(approval.sourceArticleBlob,READY_SHA);
assert.equal(approval.editorialAuditPath,"content/editorial-audits/GEN-0018.yml");
assert.equal(approval.editorialAuditBlob,AUDIT_SHA);
assert.equal(approval.publishOn,"2026-10-18");
assert.equal(approval.decision,node.status==="published"?"published":"approved-for-publication");
const auditBuffer=readFileSync(approval.editorialAuditPath);
assert.equal(sha(auditBuffer),AUDIT_SHA);
const report=parse(auditBuffer.toString("utf8"));
assert.equal(report.readyArticleBlob,READY_SHA);
assert.ok(report.qualityScore.achieved>=80);
assert.equal(report.criticalClaims.length,9);
assert.ok(Object.values(report.checks as Record<string,{passed:boolean}>).every(x=>x.passed));
});

test("Narrative differentiates TTS, audio tokens, music and safety",()=>{
const src=readFileSync("content/articles/audio-generation-ai.md","utf8");
const body=src.replace(/^---[\s\S]*?---\s*/,"");
assert.ok(body.length>9400,"Deep but readable story is too short");
for(const term of ["町内会","午前9時","午前10時","音声生成AI","Text-to-Speech","TTS",
"波形","16,000","音声トークン","WaveNet","AudioLM","MusicGen","AudioGen",
"コーデック","本人確認","著作権","同意","SSML","音声認識"])assert.ok(body.includes(term),"Missing "+term);
assert.match(body,/^## 今日の結論$/m);
assert.match(body,/^## 分からなければ戻ろう$/m);
assert.doesNotMatch(body,/\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
});

test("Cited official primary resources exist in manuscript and internal links target published articles",()=>{
const src=readFileSync("content/articles/audio-generation-ai.md","utf8");
for(const url of [
"https://docs.cloud.google.com/text-to-speech/docs/basics",
"https://docs.cloud.google.com/text-to-speech/docs/reference/rest/v1/AudioConfig",
"https://docs.cloud.google.com/text-to-speech/docs/ssml?hl=ja",
"https://deepmind.google/blog/wavenet-a-generative-model-for-raw-audio/",
"https://research.google/blog/audiolm-a-language-modeling-approach-to-audio-generation/",
"https://ai.meta.com/resources/models-and-libraries/audiocraft/",
"https://ai.meta.com/blog/audiocraft-musicgen-audiogen-encodec-generative-ai-audio/",
"https://openai.com/index/introducing-the-realtime-api/",
"https://openai.com/index/introducing-our-next-generation-audio-models/"
])assert.ok(src.includes(url),"Missing official source "+url);
const registry=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
const published=new Set<string>(registry.nodes.filter((x:{status:string})=>x.status==="published").map((x:{slug:string})=>x.slug));
const links=[...src.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)].map(x=>x[1]);
assert.ok(links.length>=5);
for(const slug of links)assert.ok(published.has(slug),"Unpublished article link "+slug);
for(const slug of ["what-is-multimodal","what-is-generative-ai","what-is-embedding","what-is-rag","vectors-for-ai"])assert.ok(links.includes(slug));
});

test("Five illustrative SVGs are exact SHA-matching artwork, referenced with alt and accessible SVG text",()=>{
const src=readFileSync("content/articles/audio-generation-ai.md","utf8");
const refs=[...src.matchAll(/!\[([^\]]+)\]\((\/images\/articles\/audio-generation-ai\/[^)]+)\)/g)];
assert.equal(refs.length,5);
assert.equal(new Set(refs.map(x=>x[2])).size,5);
assert.equal(refs[0][2],"/images/articles/audio-generation-ai/hero.svg");
for(const ref of refs)assert.ok(ref[1].length>18);
for(const [name,digest] of Object.entries(FIGURES)){
const url="/images/articles/audio-generation-ai/"+name,file=path.join(process.cwd(),"public",url);
assert.ok(existsSync(file));
assert.ok(refs.some(ref=>ref[2]===url));
const data=readFileSync(file);
assert.equal(sha(data),digest,"Illustration changed "+name);
const svg=data.toString("utf8");
assert.match(svg,/viewBox="0 0 1200 675"/);
assert.match(svg,/<title id="t">/);
assert.match(svg,/<desc id="d">/);
assert.match(svg,/<\/svg>\s*$/);
}
});

test("GEN-0018 remains off the public article list until the daily publisher has promoted it",()=>{
const doc=readAllArticles("content/articles").find(x=>x.id===ID);
assert.ok(doc);
assert.equal(readArticles("content/articles").some(x=>x.id===ID),doc.status==="published");
});
