import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from "node:fs";
import os from "node:os";
import path from "node:path";
import {test} from "node:test";
import {parse} from "yaml";
import {
  buildNewsArchive,archiveCsv,archiveJson,findNewsOverlaps,
} from "../scripts/build-news-archive.mjs";
import {chooseNewsRelease,publishNews,assertUniqueNewsSlots} from "../scripts/publish-news-queue.mjs";

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
  // The official OpenAI RSS uses /index/ while the published article cites
  // /ja-JP/index/. This MUST trigger human duplicate review (NEWS-0092).
  assert.ok(findNewsOverlaps(archive,{originalUrl:"https://openai.com/index/introducing-the-rosalind-academic-plan"})
    .some((x:{id:string})=>x.id==="NEWS-0092"));
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
  const intake=read(".github/workflows/news-candidates.yml");
  assert.match(intake,/cron: '0 22 \* \* \*'/);
  assert.match(intake,/cron: '0 7 \* \* \*'/);
  assert.doesNotMatch(intake,/publish-news-queue\.mjs --apply/);
  const evergreen=read(".github/workflows/publish-approved.yml");
  assert.match(evergreen,/cron: '0 11 \* \* \*'/);
  assert.match(evergreen,/group: aiportal-approved-publication-main/);
});
test("Staggered recovery triggers retain original JST slots and independent evergreen gate",()=>{
  const intake=parse(read(".github/workflows/news-candidates.yml"));
  const publisher=parse(read(".github/workflows/publish-reviewed-news.yml"));
  const evergreen=parse(read(".github/workflows/publish-approved.yml"));
  assert.deepEqual(intake.on.schedule.map((x:{cron:string})=>x.cron),
    ["0 22 * * *","0 7 * * *","17 22 * * *","17 7 * * *"]);
  assert.deepEqual(publisher.on.schedule.map((x:{cron:string})=>x.cron),
    ["0 0 * * *","0 9 * * *","17 0 * * *","17 9 * * *"]);
  assert.equal(intake.permissions.contents,"read");
  assert.equal(publisher.permissions.contents,"write");
  assert.equal(evergreen.on.schedule[0].cron,"0 11 * * *");
  assert.equal(publisher.concurrency.group,evergreen.concurrency.group);
  assert.equal(publisher.concurrency["cancel-in-progress"],false);
});

test("Only one owner-approved news story may occupy any single Japan slot",()=>{
  const morning={scheduledAtJst:"2026-10-18T09:00:00+09:00",decision:"approved-for-publication"};
  const evening={scheduledAtJst:"2026-10-18T18:00:00+09:00",decision:"approved-for-publication"};
  assert.doesNotThrow(()=>assertUniqueNewsSlots([]));
  assert.doesNotThrow(()=>assertUniqueNewsSlots([morning,evening]));
  assert.doesNotThrow(()=>assertUniqueNewsSlots([morning,{...morning,scheduledAtJst:"2026-10-19T09:00:00+09:00"}]));
  assert.throws(()=>assertUniqueNewsSlots([morning,{...morning,decision:"published"}]),/multiple news approvals for one slot/);
  assert.throws(()=>assertUniqueNewsSlots([evening,{...evening}]),/multiple news approvals for one slot/);
  assert.throws(()=>assertUniqueNewsSlots([{scheduledAtJst:"2026-10-18T09:17:00+09:00"}]),/invalid scheduled news slot/);
  assert.throws(()=>assertUniqueNewsSlots([{scheduledAtJst:"2026-10-18T08:59:00+09:00"}]),/invalid scheduled news slot/);
  assert.throws(()=>assertUniqueNewsSlots([null]),/invalid scheduled news slot/);
});

test("Unapproved stories are never published, even when approval queue later contains accepted stories",()=>{
  const tmp=mkdtempSync(path.join(os.tmpdir(),"aiportal-news-queue-"));
  try{
    for(const rel of [
      "content/news/news-cadence.yml",
      "content/news/news-approval-queue.yml",
      "content/news/news-publication-log.yml",
      "content/news/news-editorial-decisions.yml",
      "content/registry/knowledge-nodes.yml",
    ]){
      const dest=path.join(tmp,rel);
      mkdirSync(path.dirname(dest),{recursive:true});
      writeFileSync(dest,read(rel));
    }
    writeFileSync(path.join(tmp,"content/news/news-approval-queue.yml"),
      'schemaVersion: 1\ntimezone: "Asia/Tokyo"\napprovals: []\n');
    const now=new Date("2026-10-18T09:30:00+09:00");
    const dry=chooseNewsRelease(tmp,now);
    assert.equal(dry.changed,false);
    assert.match(String(dry.reason),/No date-due/);
    assert.equal(dry.availableSlots,2);
    const attempted=publishNews(tmp,{apply:true,now});
    assert.equal(attempted.changed,false);
    assert.match(String("reason" in attempted ? attempted.reason : ""),/No date-due/);
    const history=parse(read("content/news/news-publication-log.yml"));
    history.releases.push(
      {id:"NEWS-8001",decision:"published",publishOn:"2026-10-18"},
      {id:"NEWS-8002",decision:"published",publishOn:"2026-10-18"}
    );
    writeFileSync(path.join(tmp,"content/news/news-publication-log.yml"),
      "schemaVersion: 1\nreleases:\n"+history.releases.map((r:{id:string;decision:string;publishOn:string})=>
        '  - id: "'+r.id+'"\n    decision: "'+r.decision+'"\n    publishOn: "'+r.publishOn+'"\n').join(""));
    const blocked=chooseNewsRelease(tmp,now);
    assert.equal(blocked.changed,false);
    assert.match(String(blocked.reason),/quota reached/);
    assert.equal(blocked.availableSlots,0);
  } finally {
    rmSync(tmp,{recursive:true,force:true});
  }
});
