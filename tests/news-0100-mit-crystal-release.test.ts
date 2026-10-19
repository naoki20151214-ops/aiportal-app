import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {parse} from "yaml";
import {chooseNewsRelease} from "../scripts/publish-news-queue.mjs";
import {buildNewsArchive,archiveJson,archiveCsv} from "../scripts/build-news-archive.mjs";
const read=(p:string)=>readFileSync(p,"utf8");
const hash=(data:string)=>{const b=Buffer.from(data.replace(/\r\n/g,"\n"),"utf8");
  return createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex");
};
const id="NEWS-0100",slug="mit-3d-crystal-materials-ai";
const source="https://news.mit.edu/2026/giving-ai-crystal-clear-view-of-materials-world-1018";
const readySha="9b2b5f138c71a911f088735c96bfefa0bd39d553";
const imageSha="f3f66e1486aa0aada2d427169772170fb34822484388af930fe6c31ce0e47dfa";

test("MIT news copy, first-party source and self-owned graphic remain immutable",()=>{
  const copy=read("content/news/owner-delegated-copy/"+id+".md");
  const article=read("content/articles/"+slug+".md");
  const vector=read("content/news/assets/"+slug+".svg");
  const hero=readFileSync("public/images/news/"+slug+".webp");
  const audit=read("content/news/editorial-audits/"+id+".md");
  const ready=article.includes('status: "published"')
    ? article.replace('status: "published"','status: "ready"') : article;
  assert.equal(hash(copy),"88d559a54fa8c6aa2c89428ab21d1abb69b0827d");
  assert.equal(hash(ready),readySha);
  assert.ok(article.endsWith(copy));
  assert.equal(hash(vector),"ca7cb89d9c36725add5d268a99a3f5c84c6ba3e8");
  assert.equal(createHash("sha256").update(hero).digest("hex"),imageSha);
  assert.ok(hero.length>=20000&&hero.length<=500000);
  assert.equal(hero.subarray(0,4).toString(),"RIFF");
  assert.equal(hero.subarray(8,12).toString(),"WEBP");
  assert.ok(copy.includes(source));
  assert.match(copy,/重要度：★★★☆☆（3\/5）/);
  assert.match(copy,/文章中心/);
  assert.match(copy,/量産/);
  assert.match(copy,/\/articles\/what-is-multimodal/);
  assert.ok(audit.includes(readySha) && audit.includes(imageSha));
  assert.match(audit,/目視して「合格」と言ったものでは/);
});

test("Only 20 October 09 JST can release the owner-delegated MIT news",()=>{
  const queue=parse(read("content/news/news-approval-queue.yml"));
  const registry=parse(read("content/registry/knowledge-nodes.yml"));
  const record=queue.approvals.find((r:{id:string})=>r.id===id);
  assert.ok(record);
  const published=record.decision==="published";
  assert.ok(["approved-for-publication","published"].includes(record.decision));
  assert.equal(record.approvedBy,"site-owner");
  assert.equal(record.approvedOn,"2026-10-19");
  assert.equal(record.scheduledAtJst,"2026-10-20T09:00:00+09:00");
  assert.equal(record.sourceReadyBlob,readySha);
  assert.equal(record.heroSha256,imageSha);
  assert.equal(record.originalUrl,source);
  assert.ok(registry.nodes.some((n:{id:string;status:string})=>n.id===id &&
    n.status===(published?"published":"ready")));
  const pre=chooseNewsRelease(process.cwd(),new Date("2026-10-19T23:59:59+09:00"));
  assert.ok(pre.eligible!==id);
  const before=chooseNewsRelease(process.cwd(),new Date("2026-10-20T08:59:59+09:00"));
  assert.ok(before.eligible!==id);
  const due=chooseNewsRelease(process.cwd(),new Date("2026-10-20T09:00:00+09:00"));
  if(published)assert.ok(due.selected===undefined);
  else assert.equal(due.eligible,id);
  const expired=chooseNewsRelease(process.cwd(),new Date("2026-10-21T09:00:00+09:00"));
  assert.ok(expired.eligible!==id);
});

test("MIT news is never indexed as public until the signed slot is published",()=>{
  const queue=parse(read("content/news/news-approval-queue.yml"));
  const released=queue.approvals.some((r:{id:string;decision:string})=>r.id===id&&r.decision==="published");
  const rebuilt=buildNewsArchive();
  assert.equal(read("content/news/news-archive.json"),archiveJson(rebuilt));
  assert.equal(read("content/news/news-archive.csv"),archiveCsv(rebuilt));
  const row=rebuilt.entries.find(x=>x.id===id);
  assert.equal(row?.status,released?"published":"ready");
  assert.equal(row?.articleUrl,released?"https://aiportal.blog/articles/"+slug:null);
  assert.equal(row?.approvalState,released?"published":"approved-for-publication");
  assert.equal(row?.scheduledAtJst,"2026-10-20T09:00:00+09:00");
});
