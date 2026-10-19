import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {parse} from "yaml";
import {chooseNewsRelease} from "../scripts/publish-news-queue.mjs";
import {buildNewsArchive,archiveJson,archiveCsv} from "../scripts/build-news-archive.mjs";

const file=(p:string)=>readFileSync(p,"utf8");
const blob=(t:string)=>{const b=Buffer.from(t.replace(/\r\n/g,"\n"),"utf8");return createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex");};
const hero="public/images/news/on-device-scam-detection.webp";

test("NEWS-0094 keeps owner-approved article and locally prepared image immutable",()=>{
  const copy=file("content/news/owner-approved-copy/NEWS-0094.md");
  const article=file("content/articles/on-device-scam-detection.md");
  const svg=file("content/news/assets/on-device-scam-detection.svg");
  const audit=file("content/news/editorial-audits/NEWS-0094.md");
  const media=readFileSync(hero);
  assert.equal(blob(copy),"40c840a1a5d7160d0dcd2ddf0b4250fc74627b09");
  assert.ok(article.endsWith(copy));
  assert.equal(blob(article),"c20f59f9e94808699e0d2d91de2518e27395edb9");
  assert.equal(blob(svg),"e5a35ccde4bb07d3ec626c105f85fb21e73ae663");
  assert.equal(createHash("sha256").update(media).digest("hex"),
    "128b57ca26a760ebd6b2aa80310df48bd139ee1a2f76e99ec00c072680657199");
  assert.equal(media.subarray(0,4).toString(),"RIFF");
  assert.equal(media.subarray(8,12).toString(),"WEBP");
  assert.ok(media.length>=20000 && media.length<=500000);
  assert.match(audit,/どの画像か分かりませんが、僕大丈夫です/);
  assert.ok(audit.includes(blob(copy)) && audit.includes(blob(article)) && audit.includes(blob(svg)));
});

test("NEWS-0094 stays unpublished until exactly the approved JST evening slot",()=>{
  const registry=parse(file("content/registry/knowledge-nodes.yml"));
  const ledger=parse(file("content/news/news-approval-queue.yml"));
  const history=parse(file("content/news/news-publication-log.yml"));
  const row=ledger.approvals.find((x:{id:string})=>x.id==="NEWS-0094");
  assert.ok(row);
  assert.equal(row.decision,"approved-for-publication");
  assert.equal(row.approvedBy,"site-owner");
  assert.equal(row.scheduledAtJst,"2026-10-19T18:00:00+09:00");
  assert.equal(row.sourceReadyBlob,"c20f59f9e94808699e0d2d91de2518e27395edb9");
  assert.equal(row.originalUrl,"https://deepmind.google/blog/on-device-ai-scam-detection-mddi/");
  assert.equal(registry.nodeCount,registry.nodes.length);
  assert.ok(registry.nodes.some((x:{id:string;status:string})=>x.id==="NEWS-0094"&&x.status==="ready"));
  assert.ok(history.releases.some((x:{id:string;publishOn:string})=>x.id==="NEWS-0096"&&x.publishOn==="2026-10-19"));
  assert.equal(chooseNewsRelease(process.cwd(),new Date("2026-10-19T08:59:59Z")).selected,undefined);
  const due=chooseNewsRelease(process.cwd(),new Date("2026-10-19T09:00:00Z"));
  assert.equal(due.eligible,"NEWS-0094");
  assert.equal(due.availableSlots,1);
  assert.equal(chooseNewsRelease(process.cwd(),new Date("2026-10-20T09:00:00Z")).selected,undefined);
});

test("The ready news archive remains deterministically indexed but not public",()=>{
  const computed=buildNewsArchive();
  assert.equal(file("content/news/news-archive.json"),archiveJson(computed));
  assert.equal(file("content/news/news-archive.csv"),archiveCsv(computed));
  const story=computed.entries.find(x=>x.id==="NEWS-0094");
  assert.equal(story?.status,"ready");
  assert.equal(story?.articleUrl,null);
  assert.equal(story?.approvalState,"approved-for-publication");
  assert.equal(story?.scheduledAtJst,"2026-10-19T18:00:00+09:00");
});
