#!/usr/bin/env node
// One-time, read-only onboarding check for a declared first-party RSS endpoint.
// Never writes a publication queue, article, archive or model-generated copy.
import fs from "node:fs";
import path from "node:path";
import Parser from "rss-parser";
import {validateSourceConfig,safeUrl,itemsFromFeed} from "./news-candidate-core.mjs";

const args=process.argv.slice(2);
if(args.length!==1 || !/^[a-z][a-z0-9-]{1,30}$/.test(args[0]))
  throw Error("Usage: node scripts/probe-news-rss-source.mjs <declared-id>");
const sourceId=args[0];
const sources=validateSourceConfig(JSON.parse(fs.readFileSync("content/news/sources.json","utf8")));
const source=sources.find(x=>x.id===sourceId);
if(!source)throw Error("Unknown declared feed");
const output="artifacts/news-rss-onboarding-"+sourceId+".json";
const userAgent="AIPortalNewsSourceOnboarding/0.1 (+https://aiportal.blog/about)";
const now=new Date();
let report={schemaVersion:1,status:"failed",sourceId,feedUrl:source.feedUrl,
  generatedAt:now.toISOString(),publicationEligible:false,automaticApproval:false};
try{
  let response;
  for(let attempt=0;attempt<2;attempt++){
    try{
      response=await fetch(source.feedUrl,{
        redirect:"follow",signal:AbortSignal.timeout(12000),
        headers:{"User-Agent":userAgent,"Accept":"application/rss+xml,application/atom+xml,application/xml,text/xml"}
      });
      if(!response.ok)throw Error("RSS HTTP "+response.status);
      if(!safeUrl(response.url,source.allowedHosts))throw Error("RSS redirected outside allowed source hosts");
      break;
    }catch(error){
      if(attempt===1)throw error;
    }
  }
  const mime=(response.headers.get("content-type")||"").toLowerCase();
  if(!/(?:xml|rss|atom)/.test(mime))throw Error("Unexpected feed MIME type");
  const announced=Number(response.headers.get("content-length")||0);
  if(announced>2000000)throw Error("RSS exceeds 2MB");
  if(!response.body)throw Error("No RSS response body");
  const reader=response.body.getReader();
  let bytes=0;
  const chunks=[];
  try{
    while(true){
      const {value,done}=await reader.read();
      if(done)break;
      bytes+=value.byteLength;
      if(bytes>2000000)throw Error("RSS exceeds 2MB");
      chunks.push(value);
    }
  }finally{await reader.cancel().catch(()=>{});}
  const xml=new Uint8Array(bytes);
  let offset=0;
  for(const chunk of chunks){xml.set(chunk,offset);offset+=chunk.byteLength;}
  const parsed=await new Parser().parseString(new TextDecoder("utf-8").decode(xml));
  const entries=parsed?.items||[];
  if(!Array.isArray(entries)||entries.length===0)throw Error("No parseable RSS items");
  const validUrl=entries.filter(item=>safeUrl(item?.link,source.allowedHosts)).length;
  const validDated=entries.filter(item=>Number.isFinite(Date.parse(item?.isoDate||item?.pubDate||""))).length;
  if(validUrl===0)throw Error("No item links on trusted publisher hosts");
  if(validDated===0)throw Error("No parseable per-item publication dates");
  const recent=itemsFromFeed(source,entries,now,168);
  const recent72=itemsFromFeed(source,entries,now,72);
  report={...report,status:"pass",mime: mime.split(";")[0],downloadedBytes:bytes,
    feedEntries:entries.length,validOfficialLinks:validUrl,validDatedItems:validDated,
    candidatesWithin72Hours:recent72.length,candidatesWithin7Days:recent.length,
    caveat:"Publisher-provided feed metadata only. Do not treat item counts as unique confirmed news or approved content."};
}catch(error){
  report={...report,errorCategory:String(error?.message||"unknown").slice(0,130)};
}
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(report,null,2)+"\n","utf8");
console.log("RSS onboarding result: "+JSON.stringify(report));
if(report.status!=="pass")process.exitCode=1;
