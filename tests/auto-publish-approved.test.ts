import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { publishApproved } from "../scripts/auto-publish-approved.mjs";
function fixture(options: {accept?: boolean; ready?: boolean; dependencyPublished?: boolean; image?: boolean}={}){
  const root=mkdtempSync(path.join(tmpdir(),"aiportal-approve-"));
  mkdirSync(path.join(root,"content/registry"),{recursive:true});
  mkdirSync(path.join(root,"content/articles"),{recursive:true});
  mkdirSync(path.join(root,"public/images/articles/example"),{recursive:true});
  const registry={schemaVersion:1,nodeCount:2,nodes:[
    {id:"BAS-0001",slug:"what-is-ai",status:options.dependencyPublished===false?"review":"published",prerequisites:[]},
    {id:"BAS-0099",slug:"example",status:options.ready===false?"review":"ready",prerequisites:["BAS-0001"]}
  ]};
  const ledger={schemaVersion:1,approvals:options.accept===false?[]:[
    {id:"BAS-0099",slug:"example",approvedOn:"2026-10-13",decision:"approved-for-publication",evidence:"Explicit site-owner approval"}]};
  const article='---\nid: "BAS-0099"\nslug: "example"\nstatus: "'+(options.ready===false?"review":"ready")+'"\npublishedAt: "2026-10-01"\nupdatedAt: "2026-10-01"\n---\n\nThe original explanation stays unchanged.\n\n![Example](/images/articles/example/a.svg)\n';
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
