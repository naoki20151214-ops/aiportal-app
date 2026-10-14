import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parse } from "yaml";
import { publishApproved } from "../scripts/auto-publish-approved.mjs";
function gitBlobSha(source: string): string {
  return createHash("sha1")
    .update("blob " + Buffer.byteLength(source, "utf8") + "\0")
    .update(source, "utf8")
    .digest("hex");
}
function fixture(options: {accept?: boolean; ready?: boolean; dependencyPublished?: boolean; image?: boolean; publishOn?: string}={}){
  const root=mkdtempSync(path.join(tmpdir(),"aiportal-approve-"));
  mkdirSync(path.join(root,"content/registry"),{recursive:true});
  mkdirSync(path.join(root,"content/articles"),{recursive:true});
  mkdirSync(path.join(root,"public/images/articles/example"),{recursive:true});
  const registry={schemaVersion:1,nodeCount:2,nodes:[
    {id:"BAS-0001",slug:"what-is-ai",status:options.dependencyPublished===false?"review":"published",prerequisites:[]},
    {id:"BAS-0099",slug:"example",status:options.ready===false?"review":"ready",prerequisites:["BAS-0001"]}
  ]};
  const ledger={schemaVersion:1,approvals:options.accept===false?[]:[
    {id:"BAS-0099",slug:"example",approvedOn:"2026-10-13",publishOn:options.publishOn??"2026-10-13",decision:"approved-for-publication",evidence:"Explicit site-owner approval"}]};
  const article='---\nid: "BAS-0099"\nslug: "example"\nstatus: "'+(options.ready===false?"review":"ready")+'"\npublishedAt: "2026-10-01"\nupdatedAt: "2026-10-01"\n---\n\nThe original explanation stays unchanged.\n\n![Example](/images/articles/example/a.svg)\n';
  if(ledger.approvals.length)Object.assign(ledger.approvals[0],{
    approvedBy:"site-owner", sourceArticleBlob:gitBlobSha(article)
  });
  writeFileSync(path.join(root,"content/registry/knowledge-nodes.yml"),YAML(registry));
  writeFileSync(path.join(root,"content/registry/article-approval-log.yml"),YAML(ledger));
  writeFileSync(path.join(root,"content/articles/example.md"),article);
  if(options.image!==false)writeFileSync(path.join(root,"public/images/articles/example/a.svg"),"<svg/>");
  return root;
}
function YAML(data:unknown){
  if(data && typeof data === "object" && "nodes" in data){
    const r=data as {nodes:Array<{id:string;slug:string;status:string;prerequisites:string[]}>};
    return "schemaVersion: 1\nnodeCount: 2\nnodes:\n" + r.nodes.map(n =>
      '  - id: "' + n.id + '"\n' +
      '    slug: "' + n.slug + '"\n' +
      '    status: "' + n.status + '"\n' +
      '    prerequisites: [' + n.prerequisites.map(id=>'"'+id+'"').join(', ') + ']\n'
    ).join("");
  }
  return JSON.stringify(data);
}
test("one accepted ready article becomes published, original body remains intact, and run is idempotent",()=>{
  const root=fixture();try{
    const old=readFileSync(path.join(root,"content/articles/example.md"),"utf8").split("---\n\n")[1];
    const first=publishApproved(root,{apply:true,date:"2026-10-13"});
    assert.deepEqual(first.published,["BAS-0099"]);
    const newText=readFileSync(path.join(root,"content/articles/example.md"),"utf8");
    assert.match(newText,/status: "published"/);
    assert.ok(newText.endsWith(old));
    const second=publishApproved(root,{apply:true,date:"2026-10-13"});
    assert.deepEqual(second.published,[]);
  }finally{rmSync(root,{recursive:true,force:true});}
});
test("review or no explicit acceptance never causes publication",()=>{
  for(const opts of [{accept:false},{ready:false}]){
    const root=fixture(opts);try{
      if(opts.accept===false){
        const r=publishApproved(root,{apply:true,date:"2026-10-13"});
        assert.deepEqual(r.published,[]);
      }else{
        assert.throws(()=>publishApproved(root,{apply:true,date:"2026-10-13"}),/Approval status mismatch/);
      }
    }finally{rmSync(root,{recursive:true,force:true});}
  }
});
test("unpublished prerequisite defers approval without bypass; missing image hard-blocks",()=>{
  const root=fixture({dependencyPublished:false});try{
    const r=publishApproved(root,{apply:true,date:"2026-10-13"});
    assert.deepEqual(r.published,[]);assert.deepEqual(r.deferred,["BAS-0099"]);
  }finally{rmSync(root,{recursive:true,force:true});}
  const bad=fixture({image:false});try{assert.throws(()=>publishApproved(bad,{apply:true,date:"2026-10-13"}),/Missing approved illustration/);}
  finally{rmSync(bad,{recursive:true,force:true});}
});

test("unapproved body edits, missing immutable source or forged approving actor block publication",()=>{
  const altered=fixture();try{
    const p=path.join(altered,"content/articles/example.md");
    writeFileSync(p,readFileSync(p,"utf8").replace(
      "The original explanation stays unchanged.","This unapproved edit must not be published."));
    assert.throws(()=>publishApproved(altered,{apply:true,date:"2026-10-13"}),
      /Approved source blob mismatch/);
  }finally{rmSync(altered,{recursive:true,force:true});}
  for(const badValue of [{sourceArticleBlob:""},{approvedBy:"unverified"}]){
    const root=fixture();try{
      const p=path.join(root,"content/registry/article-approval-log.yml");
      const ledger=JSON.parse(readFileSync(p,"utf8"));
      Object.assign(ledger.approvals[0],badValue);
      writeFileSync(p,JSON.stringify(ledger));
      assert.throws(()=>publishApproved(root,{apply:true,date:"2026-10-13"}),
        /Missing approved ready article Git blob SHA|Invalid explicit approval evidence/);
    }finally{rmSync(root,{recursive:true,force:true});}
  }
});

test("a broken approved thumbnail fails before publication",()=>{
  const root=fixture();try{
    const p=path.join(root,"content/articles/example.md");
    const article=readFileSync(p,"utf8").replace('status: "ready"','status: "ready"\nthumbnail: "/images/articles/example/missing.svg"');
    writeFileSync(p,article);
    const ledgerPath=path.join(root,"content/registry/article-approval-log.yml");
    const ledger=JSON.parse(readFileSync(ledgerPath,"utf8"));
    ledger.approvals[0].sourceArticleBlob=gitBlobSha(article);
    writeFileSync(ledgerPath,JSON.stringify(ledger));
    assert.throws(()=>publishApproved(root,{apply:true,date:"2026-10-13"}),/Missing approved thumbnail/);
  }finally{rmSync(root,{recursive:true,force:true});}
});

test("scheduled acceptance remains unpublished before its Japan-local publishOn",()=>{
  const root=fixture({publishOn:"2026-10-15"});try{
    const early=publishApproved(root,{apply:true,date:"2026-10-14"});
    assert.deepEqual(early.published,[]);
    assert.deepEqual(early.deferred,["BAS-0099"]);
    assert.equal(early.files.length,0);
    const due=publishApproved(root,{apply:true,date:"2026-10-15"});
    assert.deepEqual(due.published,["BAS-0099"]);
  }finally{rmSync(root,{recursive:true,force:true});}
});

test("two due and approved articles publish at most one per local calendar day",()=>{
  const root=fixture();try{
    const rp=path.join(root,"content/registry/knowledge-nodes.yml");
    const lp=path.join(root,"content/registry/article-approval-log.yml");
    writeFileSync(rp,readFileSync(rp,"utf8").replace("nodeCount: 2","nodeCount: 3")+
      '  - id: "BAS-0098"\n    slug: "example-two"\n    status: "ready"\n    prerequisites: ["BAS-0001"]\n');
    const article='---\nid: "BAS-0098"\nslug: "example-two"\nstatus: "ready"\npublishedAt: "2026-10-01"\nupdatedAt: "2026-10-01"\n---\n\nSecond article content.\n';
    writeFileSync(path.join(root,"content/articles/example-two.md"),article);
    const ledger=parse(readFileSync(lp,"utf8"));
    ledger.approvals.push({id:"BAS-0098",slug:"example-two",approvedBy:"site-owner",
      approvedOn:"2026-10-13",publishOn:"2026-10-13",
      decision:"approved-for-publication",evidence:"Explicit owner acceptance",
      sourceArticleBlob:gitBlobSha(article)});
    writeFileSync(lp,JSON.stringify(ledger));
    const first=publishApproved(root,{apply:true,date:"2026-10-13"});
    assert.equal(first.published.length,1);
    assert.equal(first.deferred.length,1);
    const sameDay=publishApproved(root,{apply:true,date:"2026-10-13"});
    assert.equal(sameDay.published.length,0);
    const nextDay=publishApproved(root,{apply:true,date:"2026-10-14"});
    assert.equal(nextDay.published.length,1);
    const last=publishApproved(root,{apply:true,date:"2026-10-14"});
    assert.deepEqual(last.published,[]);
    const after=parse(readFileSync(lp,"utf8"));
    assert.deepEqual(after.approvals.map((row:{publishedOn?:string})=>row.publishedOn).sort(),
      ["2026-10-13","2026-10-14"]);
  }finally{rmSync(root,{recursive:true,force:true});}
});

test("an approval without a valid publication date cannot bypass the schedule",()=>{
  const root=fixture();try{
    const p=path.join(root,"content/registry/article-approval-log.yml");
    const ledger=parse(readFileSync(p,"utf8"));
    delete ledger.approvals[0].publishOn;
    writeFileSync(p,JSON.stringify(ledger));
    assert.throws(()=>publishApproved(root,{apply:true,date:"2026-10-13"}),/requires valid publishOn/);
  }finally{rmSync(root,{recursive:true,force:true});}
});
