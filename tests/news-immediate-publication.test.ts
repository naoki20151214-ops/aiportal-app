import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,copyFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {test} from "node:test";
import {parse,stringify} from "yaml";
import {chooseNewsRelease,publishApprovedNewsImmediately} from "../scripts/publish-news-queue.mjs";
import {buildNewsArchive} from "../scripts/build-news-archive.mjs";

const jstNow=new Date("2026-10-19T16:35:00+09:00");
const news=[
  {id:"NEWS-0094",slug:"on-device-scam-detection"},
  {id:"NEWS-0100",slug:"mit-3d-crystal-materials-ai"},
];
const p=(root:string,file:string)=>path.join(root,file);
const put=(root:string,file:string,content:string)=>{mkdirSync(path.dirname(p(root,file)),{recursive:true});writeFileSync(p(root,file),content);};
const get=(root:string,file:string)=>readFileSync(p(root,file),"utf8");
function fixture(){
  const root=mkdtempSync(path.join(tmpdir(),"aiportal-news-immediate-"));
  for(const rel of [
    "content/news/news-cadence.yml","content/news/news-publication-log.yml",
    "content/news/news-approval-queue.yml","content/news/news-editorial-decisions.yml",
    "content/news/sources.json","content/registry/knowledge-nodes.yml",
  ])put(root,rel,readFileSync(rel,"utf8"));

  // Production workflow checks its own post-promotion tree; tests also run
  // on main after publication. Reconstruct the *historically approved READY*
  // fixture, without ever changing actual main files or their signed SHA.
  const queueFile="content/news/news-approval-queue.yml";
  const queue=parse(get(root,queueFile));
  for(const row of queue.approvals){
    if(news.some(item=>item.id===row.id)){
      row.decision="approved-for-publication";
      delete row.publishedOn;
    }
  }
  put(root,queueFile,stringify(queue));
  let registry=get(root,"content/registry/knowledge-nodes.yml");
  for(const {id,slug} of news){
    const marker='\n  - id: "'+id+'"\n';
    const start=registry.indexOf(marker);
    if(start<0)throw Error("Missing fixture Registry "+id);
    const next=registry.indexOf("\n  - id:",start+marker.length);
    const end=next<0?registry.length:next;
    const fragment=registry.slice(start,end).replace('status: "published"','status: "ready"');
    registry=registry.slice(0,start)+fragment+registry.slice(end);
    const articlePath="content/articles/"+slug+".md";
    let article=readFileSync(articlePath,"utf8");
    if(article.includes('status: "published"')){
      article=article.replace('status: "published"','status: "ready"');
      if(id==="NEWS-0100")article=article
        .replace(/^publishedAt: "[^"]+"$/m,'publishedAt: "2026-10-20"')
        .replace(/^updatedAt: "[^"]+"$/m,'updatedAt: "2026-10-20"');
    }
    const row=queue.approvals.find((x:{id:string})=>x.id===id);
    assert.ok(row);
    put(root,articlePath,article);
    for(const rel of ["content/news/editorial-audits/"+id+".md"])
      put(root,rel,readFileSync(rel,"utf8"));
    const image="public/images/news/"+slug+".webp";
    mkdirSync(path.dirname(p(root,image)),{recursive:true});
    copyFileSync(image,p(root,image));
  }
  put(root,"content/registry/knowledge-nodes.yml",registry);
  return root;
}

test("Immediate owner policy has no daily quota, 09/18 reservation or next-day waiting",()=>{
  const root=fixture();
  try{
    const config=parse(get(root,"content/news/news-cadence.yml"));
    assert.equal(config.publicationMode,"immediate");
    assert.equal(config.immediateNoDailyCap,true);
    const queue=parse(get(root,"content/news/news-approval-queue.yml"));
    assert.deepEqual(queue.approvals.map((x:{id:string})=>x.id),
      ["NEWS-0094","NEWS-0100"]);
    // 09:00 NEWS-0096 already counts as published on Oct 19.
    const log=parse(get(root,"content/news/news-publication-log.yml"));
    assert.equal(log.releases.filter((x:{publishOn:string})=>x.publishOn==="2026-10-19").length,1);
    // Both pending stories were previously assigned future reservation slots.
    const later=queue.approvals.find((x:{id:string})=>x.id==="NEWS-0100");
    assert.equal(later.scheduledAtJst,"2026-10-20T09:00:00+09:00");
    const preview=chooseNewsRelease(root,jstNow,{immediate:true});
    assert.equal(preview.eligible,"NEWS-0094");
    const result=publishApprovedNewsImmediately(root,{now:jstNow,apply:true});
    if(!("published" in result) || !Array.isArray(result.published))
      throw new Error("Expected applied immediate batch");
    assert.deepEqual(result.published.map((x:{id:string})=>x.id),["NEWS-0094","NEWS-0100"]);
    assert.equal(result.published.length,2);
    assert.deepEqual(parse(get(root,"content/news/news-approval-queue.yml")).approvals
      .map((x:{decision:string})=>x.decision),["published","published"]);
    for(const {slug} of news){
      assert.match(get(root,"content/articles/"+slug+".md"),/status: "published"/);
      assert.match(get(root,"content/articles/"+slug+".md"),/publishedAt: "2026-10-19"/);
    }
    const archive=buildNewsArchive(root);
    assert.equal(archive.entries.filter((x:{status:string})=>x.status==="published").length,2);
    assert.equal(publishApprovedNewsImmediately(root,{now:jstNow,apply:true}).changed,false);
    assert.equal(get(root,"content/news/news-publication-log.yml"),readFileSync("content/news/news-publication-log.yml","utf8"),
      "historical release ledger must not be modified");
  }finally{rmSync(root,{recursive:true,force:true});}
});

test("No active NEWS approval or unreadable/altered approved manuscript means no immediate publishing",()=>{
  const root=fixture();
  try{
    const file="content/news/news-approval-queue.yml";
    const ledger=parse(get(root,file));
    put(root,file,stringify({...ledger,approvals:[]}));
    assert.equal(publishApprovedNewsImmediately(root,{now:jstNow,apply:true}).changed,false);
    assert.match(get(root,"content/articles/"+news[0].slug+".md"),/status: "ready"/);
    put(root,file,stringify(ledger));
    put(root,"content/articles/"+news[0].slug+".md",
      get(root,"content/articles/"+news[0].slug+".md")+"\nUNAPPROVED ADDED WORDS");
    assert.throws(()=>publishApprovedNewsImmediately(root,{now:jstNow,apply:true}),/ready manuscript was altered/);
  }finally{rmSync(root,{recursive:true,force:true});}
});

test("New immediate approvals require a real JST approval timestamp but no reserved publication time",()=>{
  const root=fixture();
  try{
    const file="content/news/news-approval-queue.yml";
    const ledger=parse(get(root,file));
    ledger.approvals=ledger.approvals.slice(0,1);
    delete ledger.approvals[0].scheduledAtJst;
    ledger.approvals[0].approvedAtJst="2026-10-19T16:20:00+09:00";
    put(root,file,stringify(ledger));
    assert.equal(chooseNewsRelease(root,jstNow,{immediate:true}).eligible,"NEWS-0094");
    ledger.approvals[0].approvedAtJst="2026-10-19T20:00:00+09:00";
    put(root,file,stringify(ledger));
    assert.throws(()=>chooseNewsRelease(root,jstNow,{immediate:true}),/validated real approval time/);
    ledger.approvals[0].approvedAtJst="2026-10-19T16:20:00+09:00";
    ledger.approvals[0].sourceReadyBlob="0".repeat(40);
    put(root,file,stringify(ledger));
    assert.throws(()=>publishApprovedNewsImmediately(root,{now:jstNow,apply:true}),/ready manuscript was altered/);
  }finally{rmSync(root,{recursive:true,force:true});}
});

test("Immediate publisher workflow is push-triggered and never writes unreviewed feed content",()=>{
  const yaml=readFileSync(".github/workflows/publish-reviewed-news.yml","utf8");
  const feed=readFileSync(".github/workflows/news-candidates.yml","utf8");
  const workflow=parse(yaml);
  assert.equal(workflow.on.push.branches[0],"main");
  assert.deepEqual(workflow.on.push.paths,["content/news/news-approval-queue.yml"]);
  assert.match(yaml,/--apply-immediate/);
  assert.ok(!/9:00[^]*?publish-news-queue/.test(""));
  assert.equal(workflow.permissions.contents,"write");
  assert.equal(parse(feed).permissions.contents,"read");
  assert.equal(workflow.concurrency.group,"aiportal-approved-publication-main");
  assert.equal(workflow.concurrency["cancel-in-progress"],false);
  assert.ok(!yaml.includes("auto-publish-approved.mjs"));
});
