import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {parse} from "yaml";
import {
  draftOutputSchema, draftRequest, generatePrivateJapaneseDraft,
  parseDraftResponse, packetDigest, OPENAI_RESPONSES_ENDPOINT,
} from "../scripts/news-model-draft-core.mjs";

const cid="0123456789abcdef01234567";
const packet={
  schemaVersion:1,type:"ai-news-private-japanese-draft-input",
  candidateId:cid,originalOfficialUrl:"https://openai.com/news/example",
  reviewedAt:"2026-10-16T05:00:00Z",reviewer:"Named reviewer",
  importance:{valid:true,score:8,dimensions:{readerImpact:3,audienceBreadth:2,
    genuineNovelty:2,practicalValue:1},publicationEligible:false},
  context:{whyItMatters:"読者に影響する条件を丁寧に解説します。",
    whatChanges:"確認済みの内容を説明します。",limitations:"不明な内容は断定しません。"},
  claims:[{id:"C1",
    reviewedStatement:"A publisher announced an AI product feature under some conditions.",
    evidence:[{url:"https://openai.com/news/example",supportingExcerpt:
      "Publisher announces a feature with specified conditions."}]}],
  writingInstructions:"これは確認済みの主張だけを使用するための制約付き日本語ニュース原稿です。".repeat(8),
  draftStatus:"input-awaiting-model",
  newsPublished:false,humanJapaneseReviewRequired:true,publicationEligible:false,
};
const body="発表元は新しいAI機能について説明しました。ただし、実際の提供条件については公式資料を確かめる必要があります。";
const draft={
  schemaVersion:1,candidateId:cid,status:"unreviewed-japanese-draft",
  publicationEligible:false,title:"新しいAI機能の発表内容と確認すべきこと",
  lead:{text:body,claimIds:["C1"]},
  sections:{
    whatHappened:{text:body,claimIds:["C1"]},
    whyImportant:{text:body,claimIds:["C1"]},
    whatChanges:{text:body,claimIds:["C1"]},
    limitations:{text:body,claimIds:["C1"]},
  },
};
function mockResponse(outputDraft:unknown=draft){
  return {id:"resp_test",status:"completed",output:[{
    type:"message",role:"assistant",content:[
      {type:"output_text",text:JSON.stringify(outputDraft)},
    ],
  }]};
}

test("Single-call LLM request uses strict JSON schema, no tools, no storage, no publication",()=>{
  const request=draftRequest(packet,"gpt-test-model");
  assert.equal(request.store,false);
  assert.deepEqual(request.tools,[]);
  assert.equal(request.text.format.strict,true);
  assert.equal(request.text.format.type,"json_schema");
  assert.equal(request.max_output_tokens,3000);
  assert.equal(request.input.length,1);
  assert.ok(!JSON.stringify(request).includes("Bearer "));
  const schema=draftOutputSchema(packet);
  assert.deepEqual(schema.properties.candidateId.enum,[cid]);
  assert.deepEqual(schema.properties.publicationEligible.enum,[false]);
  assert.deepEqual(schema.properties.sections.properties.whyImportant.properties.claimIds.items.enum,["C1"]);
});

test("Mocked complete structured response only creates a private UNREVIEWED draft",async()=>{
  let calls=0;
  let endpoint="";
  let headers:Record<string,string>={};
  const result=await generatePrivateJapaneseDraft(packet,{
    apiKey:"test-key-more-than-16-characters",
    model:"gpt-test-model",
    fetchImpl:async (url: RequestInfo | URL,options?: RequestInit)=>{
      calls++;
      endpoint=String(url);
      headers=options?.headers as Record<string,string>;
      assert.equal(options?.method,"POST");
      assert.equal(options?.redirect,"error");
      assert.equal(JSON.parse(String(options?.body)).store,false);
      return new Response(JSON.stringify(mockResponse()),{
        headers:{"content-type":"application/json"},status:200,
      });
    },
  });
  assert.equal(calls,1);
  assert.equal(endpoint,OPENAI_RESPONSES_ENDPOINT);
  assert.match(headers.Authorization,/^Bearer /);
  assert.equal(result.packetSha256,packetDigest(packet));
  assert.equal(result.editorialStatus,"awaiting-human-japanese-review");
  assert.equal(result.publicationEligible,false);
  assert.equal(result.semanticFactCheck,"not-performed");
  assert.equal(result.humanReviewRequired,true);
  assert.equal(result.draft.title,draft.title);
});

test("Unknown citations and attempted publication are rejected after model output",()=>{
  const falsified={...draft,sections:{
    ...draft.sections,whatChanges:{text:body,claimIds:["C44"]},
  }};
  assert.throws(()=>parseDraftResponse(mockResponse(falsified),packet),
    /generated-draft-contract-failed/);
  assert.throws(()=>parseDraftResponse(mockResponse({...draft,publicationEligible:true}),packet),
    /generated-draft-contract-failed/);
});

test("Refusals, partial results, API errors, bad JSON and huge bodies fail closed",async()=>{
  assert.throws(()=>parseDraftResponse({...mockResponse(),status:"incomplete"},packet),
    /model-response-incomplete/);
  assert.throws(()=>parseDraftResponse({status:"completed",output:[{
    type:"message",content:[{type:"refusal",refusal:"Not enough verified evidence"}],
  }]},packet),/model-refused/);
  assert.throws(()=>parseDraftResponse({status:"completed",output:[{
    type:"message",content:[{type:"output_text",text:"{incomplete"}],
  }]},packet),/model-output-invalid-json/);
  const fail=async()=>generatePrivateJapaneseDraft(packet,{
    apiKey:"test-key-more-than-16-characters",model:"gpt-test-model",
    fetchImpl:async()=>new Response("{}",{status:429}),
  });
  await assert.rejects(fail,/api-non-200-response/);
  await assert.rejects(()=>generatePrivateJapaneseDraft(packet,{
    apiKey:"test-key-more-than-16-characters",model:"gpt-test-model",
    fetchImpl:async()=>{throw Error("SECRET SHOULD NEVER ESCAPE");},
  }),/api-request-failed-or-timeout/);
  await assert.rejects(()=>generatePrivateJapaneseDraft(packet,{
    apiKey:"test-key-more-than-16-characters",model:"gpt-test-model",
    fetchImpl:async()=>new Response("x".repeat(241000),{status:200}),
  }),/api-response-too-large/);
});

test("No model request is attempted for absent key, unknown model or invalid human packet",async()=>{
  let calls=0;
  const fake=async()=>{calls++;throw Error("network must be unused");};
  await assert.rejects(()=>generatePrivateJapaneseDraft(packet,{
    apiKey:"",model:"gpt-test-model",fetchImpl:fake}),/api-key-required/);
  await assert.rejects(()=>generatePrivateJapaneseDraft(packet,{
    apiKey:"test-key-more-than-16-characters",model:"",fetchImpl:fake}),/explicit-model-required/);
  await assert.rejects(()=>generatePrivateJapaneseDraft({...packet,publicationEligible:true},{
    apiKey:"test-key-more-than-16-characters",model:"gpt-test-model",fetchImpl:fake}),/invalid-private-packet/);
  assert.equal(calls,0);
});

test("No schedule, approval ledger or public article paths were changed to run LLM",()=>{
  const intake=parse(readFileSync(".github/workflows/news-candidates.yml","utf8"));
  assert.equal(intake.permissions.contents,"read");
  assert.equal(intake.on.schedule[0].cron,"7 0-14,22-23 * * *");
  const publisher=parse(readFileSync(".github/workflows/publish-approved.yml","utf8"));
  assert.equal(publisher.on.schedule[0].cron,"0 11 * * *");
  for(const content of [readFileSync("scripts/generate-private-news-draft.mjs","utf8"),
    readFileSync("scripts/news-model-draft-core.mjs","utf8")]){
    assert.ok(!/git push|content\/articles\/|article-approval-log|publish-approved\.mjs/.test(content));
  }
  assert.ok(!intake.jobs.collect.steps.some((x:{run?:string})=>
    String(x.run||"").includes("generate-private-news-draft.mjs")));
  const cli=readFileSync("scripts/generate-private-news-draft.mjs","utf8");
  assert.ok(cli.includes('args.includes("--execute")'));
  assert.ok(cli.includes("OPENAI_API_KEY"));
  assert.ok(cli.includes("apiCallMade:false"));
});
