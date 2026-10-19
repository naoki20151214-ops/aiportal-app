import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync,mkdirSync,writeFileSync,rmSync,mkdtempSync} from "node:fs";
import {spawnSync} from "node:child_process";
import os from "node:os";
import path from "node:path";
import {parse} from "yaml";
import {
  CF_FREE_MODEL,CF_MAX_OUTPUT_TOKENS,CF_MAX_REQUEST_CHARS,
  freeDraftPreview,requestFreeWorkersDraft,validateFreeModelOutput,workersFreeDraftRequest
} from "../scripts/news-free-workers-ai-core.mjs";

const cid="0123456789abcdef01234567";
const source="https://openai.com/news/verified-example";
const packet={
  schemaVersion:1,type:"ai-news-private-japanese-draft-input",
  candidateId:cid,originalOfficialUrl:source,reviewedAt:"2026-10-18T05:00:00Z",reviewer:"Named human reviewer",
  importance:{valid:true,score:8,dimensions:{readerImpact:3,audienceBreadth:2,genuineNovelty:2,practicalValue:1},publicationEligible:false},
  context:{whyItMatters:"読者が実際に利用できる機能の条件を明確にします。",
    whatChanges:"公式発表に記載された変更を条件付きで扱います。",
    headlineBeyond:"発表内容が従来と違う部分を読者向けに説明します。",
    readerPayoff:"読者が製品を利用できるか見極められます。",
    limitations:"未確認の提供範囲は未確認と明記します。"},
  claims:[{id:"C1",
    reviewedStatement:"Publisher announces new AI features subject to official availability restrictions.",
    evidence:[{url:source,supportingExcerpt:"Official release confirms feature and restrictions for some users."}]
  }],
  writingInstructions:"これは人間が確認した一次資料の範囲でニュースの日本語下書きを作成するための指示文です。".repeat(8),
  draftStatus:"input-awaiting-model",newsPublished:false,
  humanJapaneseReviewRequired:true,publicationEligible:false,
};
const body="公式の発表は新機能の提供条件を説明しています。現段階では対象者や提供地域を確認したうえで判断しなければなりません。";
const draft={
  schemaVersion:1,candidateId:cid,status:"unreviewed-japanese-draft",publicationEligible:false,
  title:"新機能の提供条件と利用できる範囲を整理します",
  lead:{text:body,claimIds:["C1"]},
  sections:{
    whatHappened:{text:body,claimIds:["C1"]},
    whyImportant:{text:body,claimIds:["C1"]},
    whatChanges:{text:body,claimIds:["C1"]},
    limitations:{text:body,claimIds:["C1"]},
  }
};
const mockJSON=(v:unknown=draft)=>JSON.stringify({success:true,result:{response:JSON.stringify(v)}});
const credentials={
  accountId:"0".repeat(32),apiToken:"TEST_TOKEN_NOT_A_REAL_SECRET_2026",
  accountPlan:"free",freeAccountConfirmed:true,
};

test("Cloudflare free-supported model is explicitly pinned; preview costs no calls",()=>{
  assert.equal(CF_FREE_MODEL,"@cf/google/gemma-4-26b-a4b-it");
  assert.equal(CF_MAX_OUTPUT_TOKENS,1400);
  const preview=freeDraftPreview(packet);
  assert.equal(preview.mode,"no-network-dry-run");
  assert.equal(preview.apiCalls,0);
  assert.equal(preview.externalChargesIncurredByPreview,0);
  assert.equal(preview.publicationEligible,false);
  assert.equal(preview.verifiedClaims,0);
  assert.match(preview.promptSha256,/^[0-9a-f]{64}$/);
  const req=workersFreeDraftRequest(packet);
  assert.equal(req.stream,false);
  assert.equal(req.options.rejectIfBusy,true);
  assert.equal(req.max_tokens,1400);
  assert.equal(req.messages.length,2);
  assert.ok(!JSON.stringify(req).includes("Bearer"));
  assert.ok(!JSON.stringify(req).includes("publishAt"));
});

test("Free-plan proof AND credentials required before any attempt; paid-plan must never call model",async()=>{
  let calls=0;
  const fake=async()=>{calls++;throw Error("DO NOT SEND NETWORK");};
  const scenarios=[
    {...credentials,accountPlan:"paid",fetchImpl:fake},
    {...credentials,accountPlan:"unknown",fetchImpl:fake},
    {...credentials,freeAccountConfirmed:false,fetchImpl:fake},
    {...credentials,accountId:"",fetchImpl:fake},
    {...credentials,apiToken:"",fetchImpl:fake},
  ];
  for(const creds of scenarios){
    await assert.rejects(()=>requestFreeWorkersDraft(packet,creds),/free-plan-account-not-independently-confirmed|missing-free-plan-credentials/);
  }
  assert.equal(calls,0);
  await assert.rejects(()=>requestFreeWorkersDraft({...packet,publicationEligible:true},
    {...credentials,fetchImpl:fake}),/invalid-private-packet/);
  assert.equal(calls,0);
});

test("Mocked provider produces ONLY a private unapproved draft, with exactly one call",async()=>{
  let calls=0;
  const result=await requestFreeWorkersDraft(packet,{
    ...credentials,
    fetchImpl:async (url: RequestInfo | URL, opts?: RequestInit)=>{
      calls++;
      assert.equal(opts?.method,"POST");
      assert.equal(opts?.redirect,"error");
      assert.ok(String(url).startsWith("https://api.cloudflare.com/client/v4/accounts/"));
      assert.ok(String(url).endsWith("/ai/run/"+CF_FREE_MODEL));
      assert.equal((opts?.headers as Record<string,string>).Authorization,"Bearer "+credentials.apiToken);
      assert.ok(JSON.parse(String(opts?.body)).messages.length===2);
      return new Response(mockJSON(),{status:200,headers:{"content-type":"application/json"}});
    }
  });
  assert.equal(calls,1);
  assert.equal(result.publicationEligible,false);
  assert.equal(result.autoApproval,false);
  assert.equal(result.sourceClaimsIndependentlyVerified,false);
  assert.equal(result.editorialStatus,"needs-independent-fact-check");
  assert.equal(result.costVerification,"not-proven-from-this-response");
  assert.deepEqual(result.draft,draft);
});

test("Untrusted output, fictitious citations, attempted publish, HTML and markdown block fail closed",()=>{
  const bads=[
    {...draft,publicationEligible:true},
    {...draft,sections:{...draft.sections,whatChanges:{text:body,claimIds:["C999"]}}},
    {...draft,sections:{...draft.sections,limitations:{text:"<script>alert(1)</script>",claimIds:["C1"]}}},
    {...draft,affiliate:"https://example.com"},
  ];
  for(const d of bads)
    assert.throws(()=>validateFreeModelOutput(JSON.parse(mockJSON(d)),packet),/quality-contract-failed/);
  assert.throws(()=>validateFreeModelOutput({success:false,result:{response:JSON.stringify(draft)}},packet),/provider-failure/);
  assert.throws(()=>validateFreeModelOutput({success:true,result:{response:"{not JSON"}},packet),/invalid-json/);
  assert.throws(()=>validateFreeModelOutput({success:true,result:{response:"" }},packet),/malformed-response/);
  assert.throws(()=>validateFreeModelOutput({success:true,result:{response:"\`\`\`json\n{}\n\`\`\`"}},packet),/not-raw-json/);
  assert.throws(()=>workersFreeDraftRequest({...packet,claims:[]}),/invalid-private-packet/);
  assert.throws(()=>workersFreeDraftRequest({...packet,writingInstructions:"X".repeat(CF_MAX_REQUEST_CHARS)}),/invalid-private-packet|free-prompt-over-budget/);
});

test("Rate limits, 429, thrown exceptions and oversized responses cannot produce articles",async()=>{
  await assert.rejects(()=>requestFreeWorkersDraft(packet,{
    ...credentials,fetchImpl:async()=>new Response("{}",{status:429})
  }),/free-model-http-429/);
  await assert.rejects(()=>requestFreeWorkersDraft(packet,{
    ...credentials,fetchImpl:async()=>{throw Error("DO NOT LEAK TOKEN: "+credentials.apiToken);}
  }),/free-model-network-or-timeout/);
  await assert.rejects(()=>requestFreeWorkersDraft(packet,{
    ...credentials,fetchImpl:async()=>new Response("x".repeat(122000),{status:200})
  }),/free-model-response-too-large/);
});

test("Offline preview CLI safely validates human-review packet and has no execute switch",()=>{
  const tmp=mkdtempSync(path.join(os.tmpdir(),"aiportal-news-free-preview-"));
  try{
    mkdirSync(path.join(tmp,"artifacts"));
    const bundle={schemaVersion:1,type:"private-japanese-news-draft-packets",
      publishingEnabled:false,articlesPublished:0,packets:[packet]};
    writeFileSync(path.join(tmp,"artifacts/news-draft-packets.json"),JSON.stringify(bundle));
    const script=path.join(process.cwd(),"scripts/news-free-workers-ai-preview.mjs");
    const run=spawnSync(process.execPath,[script,"--candidate="+cid,
      "--in=artifacts/news-draft-packets.json"],{cwd:tmp,encoding:"utf8",timeout:15000});
    assert.equal(run.status,0,run.stderr);
    assert.match(run.stdout,/"apiCalls": 0/);
    assert.match(run.stdout,/"externalChargesIncurredByPreview": 0/);
    assert.match(run.stdout,/No network requests sent/);
    const refuse=spawnSync(process.execPath,[script,"--execute"],{cwd:tmp,encoding:"utf8",timeout:15000});
    assert.notEqual(refuse.status,0);
  }finally{rmSync(tmp,{recursive:true,force:true});}
});

test("RSS and immediate publish workflows never call any Cloudflare AI model",()=>{
  const intake=parse(readFileSync(".github/workflows/news-candidates.yml","utf8"));
  const publish=parse(readFileSync(".github/workflows/publish-reviewed-news.yml","utf8"));
  const workflows=[intake,publish];
  for(const w of workflows){
    for(const job of Object.values(w.jobs) as Array<{steps:Array<{run?:string}>}>){
      assert.ok(!job.steps.some(x=>/news-free-workers-ai|news-free-workers-ai-preview|requestFreeWorkersDraft/.test(x.run||"")));
    }
  }
  const cli=readFileSync("scripts/news-free-workers-ai-preview.mjs","utf8");
  assert.ok(!cli.includes("--execute")===false);
  assert.ok(!/CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID|git push|content\/articles\//.test(cli));
});
