import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import os from "node:os";
import path from "node:path";
import {test} from "node:test";

test("Every production news CLI parses as executable Node JavaScript",()=>{
  const names=readdirSync("scripts").filter(name=>name.endsWith(".mjs") &&
    /news|article-workflow|auto-publish-approved/.test(name)).sort();
  assert.ok(names.length>=15);
  for(const name of names){
    const result=spawnSync(process.execPath,["--check",path.resolve("scripts",name)],{
      encoding:"utf8",timeout:7000,
    });
    assert.equal(result.status,0,name+": "+result.stderr);
  }
});

test("Actual primary page CLI executes an empty, private intake without network or Git writes",()=>{
  const tmp=mkdtempSync(path.join(os.tmpdir(),"aiportal-news-cli-smoke-"));
  try{
    mkdirSync(path.join(tmp,"content/news"),{recursive:true});
    mkdirSync(path.join(tmp,"artifacts"),{recursive:true});
    writeFileSync(path.join(tmp,"content/news/sources.json"),
      readFileSync("content/news/sources.json","utf8"));
    writeFileSync(path.join(tmp,"artifacts/news-candidates.json"),JSON.stringify({
      schemaVersion:1,publishingEnabled:false,candidates:[],
      generatedAt:"2026-10-18T00:00:00Z"
    }));
    const command=spawnSync(process.execPath,[path.resolve("scripts/check-news-primary-pages.mjs")],{
      cwd:tmp,encoding:"utf8",timeout:10000,
    });
    assert.equal(command.status,0,command.stderr);
    const report=JSON.parse(readFileSync(path.join(tmp,"artifacts/news-primary-evidence.json"),"utf8"));
    assert.equal(report.publishingEnabled,false);
    assert.equal(report.editorialApprovals,0);
    assert.equal(report.primaryClaimVerification,"not-performed");
    assert.deepEqual(report.summary.failuresByReason,{});
    assert.equal(report.summary.candidates,0);
    assert.equal(report.summary.retrieved,0);
    assert.equal(report.summary.bySource.length,6);
    assert.ok(report.summary.bySource.every((item:{candidates:number})=>item.candidates===0));
  }finally{rmSync(tmp,{recursive:true,force:true});}
});
