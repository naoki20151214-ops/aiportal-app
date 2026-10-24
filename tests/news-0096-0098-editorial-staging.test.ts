import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {parse} from "yaml";

const stories = [
  {
    "id": "NEWS-0096",
    "path": "content/news/drafts/NEWS-0096-prompt-to-voice-gpt-live-custom-voices.md",
    "origin": "https://openai.com/ja-JP/products/release-notes/",
    "cta": "what-is-generative-ai",
    "expected": 367
  },
  {
    "id": "NEWS-0097",
    "path": "content/news/drafts/NEWS-0097-antigravity-antimicrobial-peptide-lead.md",
    "origin": "https://deepmind.google/blog/accelerating-antimicrobial-discovery/",
    "cta": "what-is-machine-learning",
    "expected": 371
  },
  {
    "id": "NEWS-0098",
    "path": "content/news/drafts/NEWS-0098-anthropic-oss-scanner-verification-gap.md",
    "origin": "https://www.anthropic.com/research/launching-opt-in-vuln-finding-service-for-open-source",
    "cta": "ai-hallucination",
    "expected": 356
  },
  {
    "id": "NEWS-0099",
    "path": "content/news/drafts/NEWS-0099-glm-legal-benchmark-meaning.md",
    "origin": "https://autoclaw.z.ai/blog/model/GLM-Legal/",
    "cta": "what-is-machine-learning",
    "expected": 413
  }
];
const read=(p:string)=>readFileSync(p,"utf8");

test("New evidence-based AI news proposals are substantive and never public or owner-approved",()=>{
  const archive=JSON.parse(read("content/news/news-archive.json"));
  const queue=parse(read("content/news/news-approval-queue.yml"));
  const registry=parse(read("content/registry/knowledge-nodes.yml"));
  for(const item of stories){
    const article=read(item.path);
    assert.ok(article.includes("サイト未公開"));
    assert.ok(article.includes("公開承認：なし"));
    assert.ok(article.includes(item.id));
    const marker=article.indexOf("\n\n",article.indexOf("> 一次資料の発表日："));
    const end=article.indexOf("\n\n## 一次情報");
    assert.ok(marker>0 && end>marker);
    const body=article.slice(marker+2,end);
    const length=[...body].length;
    assert.ok(length>=350 && length<=500,item.id+": "+length);
    assert.equal(length,item.expected);
    assert.ok(article.includes(item.origin));
    assert.ok(article.includes("(/articles/"+item.cta+")"));
    assert.match(read("content/articles/"+item.cta+".md"),/status: "published"/);
    assert.ok(!archive.entries.some((e:{id:string})=>e.id===item.id));
    assert.ok(!registry.nodes.some((node:{id:string})=>node.id===item.id));
    assert.ok(!queue.approvals.some((a:{id:string})=>a.id===item.id));
    const audit=read("content/news/editorial-audits/"+item.id+"-proposal.md");
    assert.ok(audit.includes(item.origin));
    assert.match(audit,/オーナー公開承認なし/);
    assert.match(audit,/画像未確定/);
  }
});

test("Four new news topics differ from held proposals and news release schedule remains restricted",()=>{
  const ids=stories.map(s=>s.id);
  assert.equal(new Set(ids).size,ids.length);
  assert.deepEqual(ids,["NEWS-0096","NEWS-0097","NEWS-0098","NEWS-0099"]);
  const publisher=parse(read(".github/workflows/publish-reviewed-news.yml"));
  const evergreen=parse(read(".github/workflows/publish-approved.yml"));
  assert.deepEqual(publisher.on.schedule.map((x:{cron:string})=>x.cron),
    ["0 0 * * *","0 9 * * *","17 0 * * *","17 9 * * *"]);
  assert.equal(evergreen.on.schedule[0].cron,"0 11 * * *");
  assert.equal(publisher.concurrency.group,evergreen.concurrency.group);
});
