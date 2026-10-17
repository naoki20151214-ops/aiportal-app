import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {parse} from "yaml";
import {
  buildNewsArchive,archiveCsv,archiveJson,findNewsOverlaps,
} from "../scripts/build-news-archive.mjs";
import {chooseNewsRelease,publishNews} from "../scripts/publish-news-queue.mjs";

const read=(file:string)=>readFileSync(file,"utf8");

test("News history contains published and rejected stories with original sources, images, CTA and no duplicates",()=>{
  const archive=buildNewsArchive();
  assert.equal(archive.schemaVersion,1);
  assert.equal(archive.sourceOfTruth,"GitHub main + content/news");
  assert.ok(archive.summary.published>=3);
  assert.ok(archive.summary.rejected>=1);
  assert.equal(archive.summary.total,archive.entries.length);
  assert.equal(new Set(archive.entries.map((e:{id:string})=>e.id)).size,archive.entries.length);
  assert.equal(new Set(archive.entries.map((e:{slug:string})=>e.slug)).size,archive.entries.length);
  const rosalind=archive.entries.find((e:{id:string})=>e.id==="NEWS-0092");
  assert.ok(rosalind);
  assert.equal(rosalind.status,"published");
  assert.ok(rosalind.sourceUrls.some((u:string)=>u.includes("openai.com/ja-JP/index/introducing-the-rosalind-academic-plan")));
  assert.ok((rosalind.ctaSlugs as string[]).includes("ai-hallucination"));
  assert.equal(rosalind.image,"/images/news/gpt-rosalind-academic-plan.webp");
  const aws=archive.entries.find((e:{id:string})=>e.id==="NEWS-0093");
  assert.ok(aws);
  assert.equal(aws.status,"rejected");
  assert.equal(aws.articleUrl,null);
  assert.ok(aws.retainedDraftPR?.includes("/pull/201"));
});
test("Git-tracked JSON/CSV news archive equals the deterministic regenerated content",()=>{
  const archive=buildNewsArchive();
  assert.equal(read("content/news/news-archive.json"),archiveJson(archive));
  assert.equal(read("content/news/news-archive.csv"),archiveCsv(archive));
});
test("Source/normalized title detection catches previously published and rejected topics",()=>{
  const archive=buildNewsArchive();
  assert.ok(findNewsOverlaps(archive,{originalUrl:"https://openai.com/ja-JP/index/introducing-the-rosalind-academic-plan/?utm_source=test"})
    .some((x:{id:string})=>x.id==="NEWS-0092"));
  assert.ok(findNewsOverlaps(archive,{originalUrl:"https://aws.amazon.com/blogs/machine-learning/building-trust-in-ai-agents-a-production-ready-evaluation-framework-with-amazon-bedrock-agentcore/"})
    .some((x:{id:string;status:string})=>x.id==="NEWS-0093"&&x.status==="rejected"));
  assert.deepEqual(findNewsOverlaps(archive,{title:"Completely unrelated brand new story"}),[]);
});
test("Twice-daily news slots are independent of the evergreen 20:00 publication cap",()=>{
  const news=parse(read("content/news/news-cadence.yml"));
  assert.equal(news.timezone,"Asia/Tokyo");
  assert.equal(news.maximumPostsPerDay,2);
  assert.deepEqual(news.slotsJst,["09:00","18:00"]);
  const workflow=read(".github/workflows/publish-reviewed-news.yml");
  assert.match(workflow,/cron: '0 0 \* \* \*'/);
  assert.match(workflow,/cron: '0 9 \* \* \*'/);
  assert.match(workflow,/group: aiportal-approved-publication-main/);
  assert.match(workflow,/publish-news-queue\.mjs --apply/);
  assert.doesNotMatch(workflow,/auto-publish-approved\.mjs/);
  const evergreen=read(".github/workflows/publish-approved.yml");
  assert.match(evergreen,/cron: '0 11 \* \* \*'/);
  assert.match(evergreen,/group: aiportal-approved-publication-main/);
});
test("Empty owner-approval queue cannot publish a merely-ready story or a private RSS item",()=>{
  const approvals=parse(read("content/news/news-approval-queue.yml"));
  assert.equal(approvals.schemaVersion,1);
  assert.deepEqual(approvals.approvals,[]);
  const october18=new Date("2026-10-18T09:30:00+09:00");
  const dry=chooseNewsRelease(process.cwd(),october18);
  assert.equal(dry.changed,false);
  assert.match(String(dry.reason),/No date-due/);
  assert.equal(dry.availableSlots,2);
  const attempted=publishNews(process.cwd(),{apply:true,now:october18});
  assert.equal(attempted.changed,false);
  assert.match(String("reason" in attempted ? attempted.reason : ""),/No date-due/);
});
