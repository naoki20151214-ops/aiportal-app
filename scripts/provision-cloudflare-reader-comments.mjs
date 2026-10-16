#!/usr/bin/env node
/**
 * Prepare optional AI Portal reader comments for an EXISTING scoped feedback D1.
 * No comments are ever enabled by this script.
 * Does not print tokens, site secrets, database records or reader submissions.
 */
import fs from "node:fs";

const token = () => process.env.CLOUDFLARE_FEEDBACK_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID || "fd4fe7df0d653a3c4c5969244430f6e2";
const projectName = process.env.CLOUDFLARE_PAGES_PROJECT || "aiportal-app";
const argv = process.argv.slice(2);
const mode = argv.find(x => x.startsWith("--mode="))?.slice(7) || "plan";
const environment = argv.find(x => x.startsWith("--environment="))?.slice(14) || "preview";
const BINDING = "AI_PORTAL_FEEDBACK_DB";

export function options(){
  if(argv.some(x=>!/^--(?:mode|environment)=/.test(x)))throw Error("Unexpected CLI option");
  if(!["plan","audit","stage"].includes(mode) || !["preview","production"].includes(environment))
    throw Error("Unknown operation or environment");
  if(!/^[0-9a-f]{32}$/i.test(account) || projectName!=="aiportal-app")
    throw Error("Unexpected Cloudflare account/project");
  return {
    dbName:"aiportal-feedback-"+environment,
    widgetName:"AI Portal feedback "+environment,
    hostname:environment==="production"?"aiportal.blog":"aiportal-app.pages.dev",
  };
}

export function commentMigrationStatements(sql){
  const withoutComments=sql.split("\n").filter(x=>!/^\s*--/.test(x)).join("\n");
  const stmts=withoutComments.split(";").map(s=>s.trim()).filter(Boolean);
  if(stmts.length!==2 ||
    !/^CREATE TABLE IF NOT EXISTS reader_comments\s*\(/i.test(stmts[0]) ||
    !/^CREATE INDEX IF NOT EXISTS idx_reader_comments_article_date\s+ON reader_comments\s*\(/i.test(stmts[1]) ||
    stmts.some(s=>/\b(DROP|ALTER|INSERT|UPDATE|DELETE|REPLACE|ATTACH|PRAGMA)\b/i.test(s)))
    throw Error("Unexpected reader comments migration; refusing");
  return stmts;
}

async function cf(method,route,body) {
  const secret=token();
  if(!secret || secret.length<12)throw Error("Missing CLOUDFLARE_FEEDBACK_API_TOKEN GitHub Actions secret");
  const resp=await fetch("https://api.cloudflare.com/client/v4"+route,{
    method,
    headers:{
      Authorization:"Bearer "+secret,
      Accept:"application/json",
      ...(body===undefined?{}:{"Content-Type":"application/json"}),
    },
    ...(body===undefined?{}:{body:JSON.stringify(body)}),
    signal:AbortSignal.timeout(15000),
  });
  let data;
  try{data=await resp.json();}catch{throw Error("Cloudflare non-JSON HTTP "+resp.status);}
  if(!resp.ok || data.success!==true){
    const codes=(data.errors||[]).map(e=>Number(e.code)||0).join(",");
    throw Error("Cloudflare "+method+" failure, HTTP "+resp.status+", codes "+codes);
  }
  return data.result;
}

async function existsInD1(base,dbId){
  const results=await cf("POST",base+"/d1/database/"+dbId+"/query",{
    sql:"SELECT name FROM sqlite_master WHERE type IN ('table','index') AND name IN ('reader_comments','idx_reader_comments_article_date') ORDER BY name",
  });
  if(!Array.isArray(results) || results.length!==1 || results[0].success!==true)
    throw Error("Unable to verify D1 comments schema");
  const names=new Set((results[0].results||[]).map(x=>x.name));
  return names.has("reader_comments")&&names.has("idx_reader_comments_article_date");
}

export async function run(){
  const o=options();
  console.log("AI Portal reader comments provisioning: "+mode+" "+environment);
  if(mode==="plan"){
    console.log("Read-only plan. Existing D1="+o.dbName+"; binding="+BINDING+
      "; migration=0002_reader_comments.sql; feature flag stays OFF.");
    return {status:"plan"};
  }
  const base="/accounts/"+account;
  const project=await cf("GET",base+"/pages/projects/"+projectName);
  if(project?.name!==projectName)throw Error("Cloudflare Pages project mismatch");
  const cfg=project.deployment_configs?.[environment]||{};
  const vars=cfg.env_vars||{};
  if(vars.AI_PORTAL_READER_COMMENTS_ENABLED?.value==="1")
    throw Error("Reader comments already enabled. Refuse staging an active service.");

  const dbs=await cf("GET",base+"/d1/database?name="+encodeURIComponent(o.dbName)+"&per_page=100");
  const db=Array.isArray(dbs)?dbs.filter(x=>x.name===o.dbName):[];
  if(db.length>1)throw Error("Ambiguous D1 database names");
  const database=db[0];
  const bound=!!database?.uuid && cfg.d1_databases?.[BINDING]?.id===database.uuid;

  const widgets=await cf("GET",base+"/challenges/widgets?per_page=100");
  const w=Array.isArray(widgets)?widgets.filter(x=>x.name===o.widgetName):[];
  if(w.length>1)throw Error("Ambiguous Turnstile widgets");
  const widget=w[0];
  const turnstileConfigured=!!widget?.sitekey &&
    vars.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.value===widget.sitekey &&
    !!vars.TURNSTILE_SECRET_KEY;
  const baseReady=bound&&turnstileConfigured;
  if(!baseReady){
    const safe={dbFound:!!database?.uuid,bound,turnstileConfigured,commentFlag:"off"};
    console.log("Setup prerequisite: "+JSON.stringify(safe));
    if(mode==="stage")throw Error("Baseline D1/Turnstile not staged; run existing provision-feedback-cloudflare stage first");
    return {status:"baseline-incomplete",...safe};
  }

  if(mode==="audit"){
    const schemaExists=await existsInD1(base,database.uuid);
    const result={status:"audited",bound,turnstileConfigured,
      schemaExists,commentFlag:"off",wafRateLimitVerified:false};
    console.log("Read-only audit: "+JSON.stringify(result));
    return result;
  }

  const sql=fs.readFileSync("migrations/0002_reader_comments.sql","utf8");
  for(const stmt of commentMigrationStatements(sql)){
    const q=await cf("POST",base+"/d1/database/"+database.uuid+"/query",{sql:stmt});
    if(!Array.isArray(q)||q.length!==1||q[0].success!==true)
      throw Error("Reader comments migration unsuccessful");
  }
  if(!await existsInD1(base,database.uuid))
    throw Error("Reader comments schema/index not found after migration");

  console.log("STAGED: reader_comments table/index verified in scoped "+environment+" D1.");
  console.log("PUBLIC SUBMISSION STILL DISABLED. Requires WAF, redeploy, GET health and real POST/D1 verification before enabling.");
  return {status:"staged-disabled",bound:true,schemaExists:true,commentFlag:"off"};
}

if(process.argv[1]?.endsWith("/provision-cloudflare-reader-comments.mjs")){
  run().catch(e=>{
    console.error("READER COMMENTS SETUP BLOCKED: "+(e instanceof Error?e.message:"unknown error"));
    process.exitCode=1;
  });
}
