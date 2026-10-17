import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {readerCommentPrompts,validateReaderComment} from "../src/lib/reader-comment-schema";
import {onRequest} from "../functions/api/reader-comment";

const uuid="1fc0e7b0-6c85-4b9b-8f96-4ac32b6daf44";
const sample={
  requestId:uuid,slug:"what-is-llm",promptCode:"confusing_part",
  note:"この説明の違いがまだよくわかりません。",turnstileToken:"test-token",
};
const validate=(data:unknown)=>validateReaderComment(data);
const request=(body:unknown,method="POST",origin="https://aiportal.blog",host="aiportal.blog")=>new Request(`https://${host}/api/reader-comment`,{
  method,headers:{Origin:origin,"Content-Type":"application/json"},body:method==="GET"?undefined:JSON.stringify(body),
});
function db(opts:{missing?:boolean;writesFail?:boolean}={}){
  const rows=new Map<string,{slug:string;prompt:string;note:string}>();
  return {rows,handle:{
    prepare(sql:string){
      return {
        async first(){
          assert.match(sql,/^SELECT 1 AS ready FROM reader_comments LIMIT 1$/);
          if(opts.missing)throw Error("migration missing");
          return rows.size?{ready:1}:null;
        },
        bind(...values:string[]){
          return {async run(){
            if(opts.writesFail)throw Error("DB error");
            assert.match(sql,/^INSERT INTO reader_comments /);
            const [id,slug,prompt,note]=values;
            const old=rows.get(id);
            if(old&&(old.slug!==slug||old.prompt!==prompt||old.note!==note))
              return {success:true,meta:{changes:0}};
            rows.set(id,{slug,prompt,note});
            return {success:true,meta:{changes:1}};
          }};
        },
      };
    },
  }};
}
const enabled=(database:ReturnType<typeof db>)=>({
  AI_PORTAL_READER_COMMENTS_ENABLED:"1",
  AI_PORTAL_READER_COMMENTS_EXPIRES_AT:new Date(Date.now()+5*60*1000).toISOString(),
  AI_PORTAL_FEEDBACK_DB:database.handle,
  TURNSTILE_SECRET_KEY:"secret",
});
async function withVerified(fn:()=>Promise<void>,verification:{success:boolean;hostname:string;action?:string}={
  success:true,hostname:"aiportal.blog",action:"reader_comment",
}){
  const original=globalThis.fetch;
  let calls=0;
  globalThis.fetch=(async (url:RequestInfo|URL)=>{
    assert.equal(String(url),"https://challenges.cloudflare.com/turnstile/v0/siteverify");
    calls++;
    return Response.json(verification);
  }) as typeof fetch;
  try{await fn();}finally{globalThis.fetch=original;}
  return calls;
}

test("Question prompts are concrete, bounded, and not sent to GA4",()=>{
  assert.equal(readerCommentPrompts.length,4);
  assert.ok(readerCommentPrompts.every(x=>x.question.endsWith("？")));
  assert.equal(validate(sample).ok,true);
  assert.equal(validate({...sample,promptCode:"other"}).ok,false);
  assert.equal(validate({...sample,note:"短すぎ"}).ok,false);
  assert.equal(validate({...sample,note:"あ".repeat(301)}).ok,false);
  assert.equal(validate({...sample,note:"回答は alice@example.com に送って"}).ok,false);
  assert.equal(validate({...sample,note:"連絡先 090-1234-5678"}).ok,false);
  assert.equal(validate({...sample,note:"https://example.com 読んで"}).ok,false);
  assert.equal(validate({...sample,slug:"../secret"}).ok,false);
  assert.equal(validate({...sample,arbitrary:"extra"}).ok,false);
  assert.equal(validate({...sample,requestId:"invalid"}).ok,false);
  assert.equal(validate({...sample,turnstileToken:""}).ok,false);
  assert.equal(validate({...sample,note:"  テストの疑問を教えてください。  "}).ok,true);
  assert.equal(validate({...sample,note:"Synthetic Preview reference: abcdefghijklmnopqrstuvwxyz"}).ok,true);
});

test("Free-comment endpoint is unavailable until flag, D1 and Turnstile are configured",async()=>{
  const database=db();
  const disabled=await onRequest({request:request(sample),env:{...enabled(database),AI_PORTAL_READER_COMMENTS_ENABLED:"0"}});
  assert.equal(disabled.status,503);
  const noDb=await onRequest({request:request(sample),env:{
    AI_PORTAL_READER_COMMENTS_ENABLED:"1",TURNSTILE_SECRET_KEY:"secret",
  }});
  assert.equal(noDb.status,503);
  const migration=await onRequest({request:new Request("https://aiportal.blog/api/reader-comment"),
    env:enabled(db({missing:true}))});
  assert.equal(migration.status,503);
  const available=await onRequest({request:new Request("https://aiportal.blog/api/reader-comment"),env:enabled(database)});
  assert.equal(available.status,200);
  assert.deepEqual(await available.json(),{ok:true,available:true});
});

test("Expired, missing, malformed, or excessively long comment leases fail closed",async()=>{
  const database=db();
  const baseline=enabled(database);
  for(const value of [undefined,"", "not-a-date",
    new Date(Date.now()-1000).toISOString(),
    new Date(Date.now()+11*60*1000).toISOString()]){
    const env={...baseline,AI_PORTAL_READER_COMMENTS_EXPIRES_AT:value};
    const get=await onRequest({request:request(sample,"GET"),env});
    assert.equal(get.status,503);
    const post=await onRequest({request:request(sample),env});
    assert.equal(post.status,503);
  }
  assert.equal(database.rows.size,0);
});

test("The lease is checked again after Turnstile before any D1 insertion",async()=>{
  const database=db(),env=enabled(database);
  const originalFetch=globalThis.fetch;
  globalThis.fetch=(async()=>{
    env.AI_PORTAL_READER_COMMENTS_EXPIRES_AT=new Date(Date.now()-1000).toISOString();
    return Response.json({success:true,hostname:"aiportal.blog",action:"reader_comment"});
  }) as typeof fetch;
  try{
    const result=await onRequest({request:request(sample),env});
    assert.equal(result.status,503);
    assert.equal(database.rows.size,0);
  }finally{globalThis.fetch=originalFetch;}
});

test("Free-comment API validates cross-site requests, published slugs and payloads before Turnstile",async()=>{
  const database=db(),env=enabled(database);
  assert.equal((await onRequest({request:request(sample,"POST","https://attacker.com"),env})).status,403);
  assert.equal((await onRequest({request:request({...sample,slug:"future-unpublished-slug"}),env})).status,422);
  assert.equal((await onRequest({request:request({...sample,note:"small"}),env})).status,422);
  assert.equal((await onRequest({request:request(sample,"DELETE"),env})).status,405);
  assert.equal(database.rows.size,0);
});

test("Turnstile must confirm exact hostname and the reader_comment action",async()=>{
  const database=db(),env=enabled(database);
  const bad=await withVerified(async()=>{
    const res=await onRequest({request:request(sample),env});
    assert.equal(res.status,403);
  },{success:true,hostname:"aiportal.blog",action:"article_feedback"});
  assert.equal(bad,1);
  assert.equal(database.rows.size,0);
});

test("Cloudflare dummy Turnstile action=test is accepted only on the exact configured Pages Preview host",async()=>{
  const host="c33fde3a.aiportal-app.pages.dev",database=db();
  const env={...enabled(database),AI_PORTAL_TURNSTILE_TEST_MODE:"1",
    AI_PORTAL_TURNSTILE_TEST_HOSTNAME:host};
  await withVerified(async()=>{
    const response=await onRequest({request:request(sample,"POST",`https://${host}`,host),env});
    assert.equal(response.status,201);
  },{success:true,hostname:host,action:"test"});
  assert.equal(database.rows.size,1);

  const exampleDb=db();
  const exampleEnv={...enabled(exampleDb),AI_PORTAL_TURNSTILE_TEST_MODE:"1",
    AI_PORTAL_TURNSTILE_TEST_HOSTNAME:host};
  await withVerified(async()=>{
    const response=await onRequest({request:request(sample,"POST",`https://${host}`,host),env:exampleEnv});
    assert.equal(response.status,201);
  },{success:true,hostname:"example.com"});
  assert.equal(exampleDb.rows.size,1);

  const wrongHostDb=db();
  await withVerified(async()=>{
    const response=await onRequest({request:request(sample,"POST","https://other.aiportal-app.pages.dev","other.aiportal-app.pages.dev"),
      env:{...enabled(wrongHostDb),AI_PORTAL_TURNSTILE_TEST_MODE:"1",AI_PORTAL_TURNSTILE_TEST_HOSTNAME:host}});
    assert.equal(response.status,403);
  },{success:true,hostname:"other.aiportal-app.pages.dev",action:"test"});
  assert.equal(wrongHostDb.rows.size,0);

  const productionDb=db();
  await withVerified(async()=>{
    const response=await onRequest({request:request(sample,"POST","https://aiportal.blog"),
      env:{...enabled(productionDb),AI_PORTAL_TURNSTILE_TEST_MODE:"1",
        AI_PORTAL_TURNSTILE_TEST_HOSTNAME:"aiportal.blog"}});
    assert.equal(response.status,403);
  },{success:true,hostname:"aiportal.blog",action:"test"});
  assert.equal(productionDb.rows.size,0);
});

test("Valid free-form comments are stored separately, deduped, and never exposed by GET",async()=>{
  const database=db(),env=enabled(database);
  await withVerified(async()=>{
    const response=await onRequest({request:request(sample),env});
    assert.equal(response.status,201);
    assert.deepEqual(await response.json(),{ok:true,receipt:uuid});
    const repeated=await onRequest({request:request(sample),env});
    assert.equal(repeated.status,201);
    const conflict=await onRequest({request:request({...sample,note:"二度目の異なる内容です"}),env});
    assert.equal(conflict.status,409);
  });
  assert.equal(database.rows.size,1);
  assert.equal(database.rows.get(uuid)?.prompt,"confusing_part");
  const get=await onRequest({request:new Request("https://aiportal.blog/api/reader-comment"),env});
  assert.equal((await get.text()).includes(sample.note),false);
});

test("UI stays compact, asks one relevant followup, and never claims persistence when disabled",()=>{
  const survey=readFileSync("src/components/reader-survey.tsx","utf8");
  const comment=readFileSync("src/components/reader-free-comment.tsx","utf8");
  const privacy=readFileSync("src/app/privacy/page.tsx","utf8");
  const migration=readFileSync("migrations/0002_reader_comments.sql","utf8");
  const publisher=readFileSync(".github/workflows/publish-approved.yml","utf8");
  assert.ok(survey.includes("ReaderFreeComment"));
  assert.ok(survey.includes("自由記述"));
  assert.ok(survey.includes('className="fixed right-3'));
  assert.ok(comment.includes('maxLength={300}'));
  assert.ok(comment.includes('setAvailability("unavailable")'));
  assert.ok(comment.includes('availability==="ready"&&('));
  assert.ok(comment.includes('感想の受付準備'));
  assert.ok(!comment.includes('gtag('));
  assert.ok(!comment.includes('recordReaderSurvey'));
  assert.ok(comment.includes('action:"reader_comment"'));
  assert.ok(privacy.includes("任意の自由記述"));
  assert.ok(migration.includes("CREATE TABLE IF NOT EXISTS reader_comments"));
  assert.ok(publisher.includes("0 11 * * *"));
});

test("Pages Functions route manifest includes both feedback APIs and excludes the rest of the site",()=>{
  const manifest=JSON.parse(readFileSync("public/_routes.json","utf8")) as {
    version:number;include:string[];exclude:string[];
  };
  assert.equal(manifest.version,1);
  assert.deepEqual([...manifest.include].sort(),["/api/feedback","/api/reader-comment"]);
  assert.deepEqual(manifest.exclude,[]);
});
